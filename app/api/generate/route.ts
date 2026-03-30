import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, generateId } from "@/lib/db";
import { generateImage } from "@/lib/image-gen";

export const maxDuration = 60;
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

    if (!CATEGORIES[category]) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const creditCost = isFaceSwap ? 2 : 1;

    // Get current user
    const { data: user } = await db
      .from("User")
      .select("id, credits, plan, email")
      .eq("id", session.user.id)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.credits < creditCost) {
      return NextResponse.json(
        { error: "Insufficient credits", required: creditCost, available: user.credits },
        { status: 402 }
      );
    }

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

    const { prompt, negativePrompt } = buildPrompt(category, {
      subcategory: subcategory || "",
      model, brand, color, city, shot,
    });

    const generationId = generateId();

    // Create generation record
    await db.from("Generation").insert({
      id: generationId,
      userId: user.id,
      category,
      subcategory: subcategory || null,
      prompt,
      negativePrompt,
      creditsUsed: creditCost,
      isFaceSwap,
      faceInputUrl: faceInputUrl || null,
      status: "PENDING",
    });

    // Deduct credits
    const newCredits = user.credits - creditCost;
    await db.from("User").update({ credits: newCredits }).eq("id", user.id);

    await db.from("CreditLog").insert({
      id: generateId(),
      userId: user.id,
      amount: -creditCost,
      reason: isFaceSwap ? "generation_face_swap" : "generation",
      referenceId: generationId,
    });

    // Low credits warning
    if (newCredits === 1) {
      sendLowCreditsEmail(user.email, 1).catch(() => {});
    }

    // Mark as PROCESSING
    await db.from("Generation").update({ status: "PROCESSING" }).eq("id", generationId);

    try {
      let result = await generateImage({ prompt, negativePrompt });

      if (isFaceSwap && faceInputUrl) {
        result = await faceSwapWithFal(result.imageUrl, faceInputUrl);
      }

      const imageResponse = await fetch(result.imageUrl);
      if (!imageResponse.ok) throw new Error("Failed to download generated image");

      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      const publicUrl = await uploadGeneratedImage(user.id, generationId, imageBuffer);

      // Update to COMPLETED
      await db.from("Generation").update({
        status: "COMPLETED",
        imageUrl: publicUrl,
        modelUsed: result.modelUsed,
        modelProvider: result.provider,
        metadata: { durationMs: result.durationMs, originalUrl: result.imageUrl },
      }).eq("id", generationId);

      return NextResponse.json({
        id: generationId,
        status: "COMPLETED",
        imageUrl: publicUrl,
        creditsUsed: creditCost,
        creditsRemaining: newCredits,
      });
    } catch (genError: any) {
      console.error("[GENERATION_ERROR]", genError?.message, genError?.body || genError?.status || "", JSON.stringify(genError).substring(0, 500));

      // Refund credits
      await db.from("User").update({ credits: user.credits }).eq("id", user.id);
      await db.from("CreditLog").insert({
        id: generateId(),
        userId: user.id,
        amount: creditCost,
        reason: "generation_refund",
        referenceId: generationId,
      });

      await db.from("Generation").update({
        status: "FAILED",
        metadata: { error: genError?.message || "Unknown error" },
      }).eq("id", generationId);

      return NextResponse.json(
        { error: "Image generation failed. Credits have been refunded." },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[GENERATE_ROUTE_ERROR]", error?.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
