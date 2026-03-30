import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateImage } from "@/lib/image-gen";
import { faceSwapWithFal } from "@/lib/image-gen/providers/fal";
import { buildPrompt } from "@/lib/image-gen/prompts/builders";
import { uploadGeneratedImage } from "@/lib/supabase";
import { sendLowCreditsEmail } from "@/lib/resend";
import { CATEGORIES } from "@/types/categories";

const generateSchema = z.object({
  category: z.string(),
  subcategory: z.string().optional(),
  model: z.string().optional(),
  brand: z.string().optional(),
  color: z.string().optional(),
  city: z.string().optional(),
  shot: z.string().optional(),
  isFaceSwap: z.boolean().default(false),
  faceInputUrl: z.string().url().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = generateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { category, subcategory, model, brand, color, city, shot, isFaceSwap, faceInputUrl } =
      parsed.data;

    // Validate category exists
    if (!CATEGORIES[category]) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    // Determine credit cost
    const creditCost = isFaceSwap ? 2 : 1;

    // Get current user data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, credits: true, plan: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check sufficient credits
    if (user.credits < creditCost) {
      return NextResponse.json(
        { error: "Insufficient credits", required: creditCost, available: user.credits },
        { status: 402 }
      );
    }

    // Face swap requires STARTER+ plan
    if (isFaceSwap && user.plan === "FREE") {
      return NextResponse.json(
        { error: "Face swap requires a Starter plan or above." },
        { status: 403 }
      );
    }

    if (isFaceSwap && !faceInputUrl) {
      return NextResponse.json(
        { error: "Face input URL is required for face swap." },
        { status: 400 }
      );
    }

    // Build the prompt
    const { prompt, negativePrompt } = buildPrompt(category, {
      subcategory: subcategory || "",
      model,
      brand,
      color,
      city,
      shot,
    });

    // Create generation record (PENDING)
    const generation = await prisma.generation.create({
      data: {
        userId: user.id,
        category,
        subcategory,
        prompt,
        negativePrompt,
        creditsUsed: creditCost,
        isFaceSwap,
        faceInputUrl: faceInputUrl || null,
        status: "PENDING",
      },
    });

    // Deduct credits atomically
    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: user.id, credits: { gte: creditCost } },
        data: { credits: { decrement: creditCost } },
      });

      await tx.creditLog.create({
        data: {
          userId: user.id,
          amount: -creditCost,
          reason: isFaceSwap ? "generation_face_swap" : "generation",
          referenceId: generation.id,
        },
      });

      return updated;
    });

    // Check low credits (fire and forget)
    if (updatedUser.credits === 1) {
      sendLowCreditsEmail(user.email, 1).catch(() => {});
    }

    // Mark as PROCESSING
    await prisma.generation.update({
      where: { id: generation.id },
      data: { status: "PROCESSING" },
    });

    try {
      // Generate image
      let result = await generateImage({ prompt, negativePrompt });

      // Face swap if requested
      if (isFaceSwap && faceInputUrl) {
        result = await faceSwapWithFal(result.imageUrl, faceInputUrl);
      }

      // Download generated image and upload to Supabase storage
      const imageResponse = await fetch(result.imageUrl);
      if (!imageResponse.ok) {
        throw new Error("Failed to download generated image");
      }
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      const publicUrl = await uploadGeneratedImage(
        user.id,
        generation.id,
        imageBuffer
      );

      // Update generation to COMPLETED
      const completedGeneration = await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: "COMPLETED",
          imageUrl: publicUrl,
          modelUsed: result.modelUsed,
          modelProvider: result.provider,
          metadata: {
            durationMs: result.durationMs,
            originalUrl: result.imageUrl,
          },
        },
      });

      return NextResponse.json({
        id: completedGeneration.id,
        status: completedGeneration.status,
        imageUrl: completedGeneration.imageUrl,
        creditsUsed: creditCost,
        creditsRemaining: updatedUser.credits,
      });
    } catch (genError) {
      console.error("[GENERATION_ERROR]", genError);

      // Refund credits on generation failure
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { credits: { increment: creditCost } },
        });

        await tx.creditLog.create({
          data: {
            userId: user.id,
            amount: creditCost,
            reason: "generation_refund",
            referenceId: generation.id,
          },
        });
      });

      // Mark generation as FAILED
      await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: "FAILED",
          metadata: {
            error:
              genError instanceof Error ? genError.message : "Unknown error",
          },
        },
      });

      return NextResponse.json(
        { error: "Image generation failed. Credits have been refunded." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[GENERATE_ROUTE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
