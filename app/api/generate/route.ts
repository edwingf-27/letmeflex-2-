import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, generateId } from "@/lib/db";
import { generateImages } from "@/lib/image-gen";
import { faceSwapWithFal, backgroundSwapWithFal } from "@/lib/image-gen/providers/fal";
import { buildPrompt, buildBackgroundPrompt } from "@/lib/image-gen/prompts/builders";
import { uploadGeneratedImages } from "@/lib/supabase";
import { sendLowCreditsEmail } from "@/lib/resend";
import { CATEGORIES } from "@/types/categories";

export const maxDuration = 60;

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
  variationCount: z.number().int().min(1).max(4).default(1),
  mode: z.enum(["generate", "face_swap", "background_swap"]).default("generate"),
  sourceImageUrl: z.string().url().optional(),
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

    const {
      category,
      subcategory,
      model,
      brand,
      color,
      city,
      shot,
      isFaceSwap,
      faceInputUrl,
      variationCount,
      mode,
      sourceImageUrl,
    } = parsed.data;

    // Support legacy isFaceSwap flag
    const effectiveMode = isFaceSwap && mode === "generate" ? "face_swap" : mode;
    const effectiveFaceUrl = faceInputUrl || undefined;

    if (!CATEGORIES[category]) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    // Credit cost: variations * (generate=1, face_swap=2, background_swap=2)
    const perImageCost = effectiveMode === "generate" ? 1 : 2;
    const creditCost = variationCount * perImageCost;

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

    if (effectiveMode === "face_swap" && user.plan === "FREE") {
      return NextResponse.json(
        { error: "Face swap requires a Starter plan or above." },
        { status: 403 }
      );
    }

    if (effectiveMode === "face_swap" && !effectiveFaceUrl) {
      return NextResponse.json(
        { error: "Face input URL is required for face swap." },
        { status: 400 }
      );
    }

    if (effectiveMode === "background_swap" && !sourceImageUrl) {
      return NextResponse.json(
        { error: "Source image URL is required for background swap." },
        { status: 400 }
      );
    }

    // Build prompt based on mode
    const promptOptions = {
      subcategory: subcategory || "",
      model,
      brand,
      color,
      city,
      shot,
    };

    const { prompt, negativePrompt } =
      effectiveMode === "background_swap"
        ? buildBackgroundPrompt(category, promptOptions)
        : buildPrompt(category, promptOptions);

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
      isFaceSwap: effectiveMode === "face_swap",
      faceInputUrl: effectiveFaceUrl || null,
      variationCount,
      mode: effectiveMode,
      sourceImageUrl: sourceImageUrl || null,
      status: "PENDING",
    });

    // Deduct credits
    const newCredits = user.credits - creditCost;
    await db.from("User").update({ credits: newCredits }).eq("id", user.id);

    await db.from("CreditLog").insert({
      id: generateId(),
      userId: user.id,
      amount: -creditCost,
      reason:
        effectiveMode === "face_swap"
          ? "generation_face_swap"
          : effectiveMode === "background_swap"
          ? "generation_background_swap"
          : "generation",
      referenceId: generationId,
    });

    // Low credits warning
    if (newCredits <= 1 && newCredits >= 0) {
      sendLowCreditsEmail(user.email, newCredits).catch(() => {});
    }

    // Mark as PROCESSING
    await db
      .from("Generation")
      .update({ status: "PROCESSING" })
      .eq("id", generationId);

    try {
      let imageUrls: string[] = [];
      let modelUsed = "";
      let modelProvider = "";
      let durationMs = 0;
      const seeds: (number | undefined)[] = [];

      if (effectiveMode === "generate") {
        // Standard generation — generate N images
        const result = await generateImages({
          prompt,
          negativePrompt,
          numImages: variationCount,
        });

        modelUsed = result.modelUsed;
        modelProvider = result.provider;
        durationMs = result.durationMs;

        for (const img of result.images) {
          imageUrls.push(img.imageUrl);
          seeds.push(img.seed);
        }
      } else if (effectiveMode === "face_swap") {
        // Generate base images, then face swap each
        const baseResult = await generateImages({
          prompt,
          negativePrompt,
          numImages: variationCount,
        });

        modelUsed = baseResult.modelUsed;
        modelProvider = baseResult.provider;
        durationMs = baseResult.durationMs;

        for (const baseImg of baseResult.images) {
          const swapped = await faceSwapWithFal(
            baseImg.imageUrl,
            effectiveFaceUrl!
          );
          imageUrls.push(swapped.imageUrl);
          durationMs += swapped.durationMs;
          seeds.push(baseImg.seed);
        }

        modelUsed = "fal-ai/face-swap";
      } else if (effectiveMode === "background_swap") {
        // Background swap using source image
        const result = await backgroundSwapWithFal(
          sourceImageUrl!,
          prompt,
          variationCount
        );

        modelUsed = result.modelUsed;
        modelProvider = result.provider;
        durationMs = result.durationMs;

        for (const img of result.images) {
          imageUrls.push(img.imageUrl);
          seeds.push(img.seed);
        }
      }

      // Download and upload all images to Supabase storage
      const imageBuffers: Buffer[] = [];
      for (const url of imageUrls) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to download generated image from ${url}`);
        imageBuffers.push(Buffer.from(await response.arrayBuffer()));
      }

      const publicUrls = await uploadGeneratedImages(
        user.id,
        generationId,
        imageBuffers
      );

      // Insert GenerationImage rows
      const imageRows = publicUrls.map((url, index) => ({
        id: generateId(),
        generationId,
        imageUrl: url,
        variationIndex: index,
        seed: seeds[index] ?? null,
      }));

      await db.from("GenerationImage").insert(imageRows);

      // Update Generation record (imageUrl = first image for backward compat)
      await db
        .from("Generation")
        .update({
          status: "COMPLETED",
          imageUrl: publicUrls[0] || null,
          modelUsed,
          modelProvider: modelProvider || "fal",
          metadata: {
            durationMs,
            variationCount,
            mode: effectiveMode,
            originalUrls: imageUrls,
          },
        })
        .eq("id", generationId);

      return NextResponse.json({
        id: generationId,
        status: "COMPLETED",
        images: publicUrls.map((url, index) => ({ url, index })),
        imageUrl: publicUrls[0] || null,
        creditsUsed: creditCost,
        creditsRemaining: newCredits,
      });
    } catch (genError: any) {
      console.error(
        "[GENERATION_ERROR]",
        genError?.message,
        genError?.body || genError?.status || "",
        JSON.stringify(genError).substring(0, 500)
      );

      // Refund ALL credits
      await db
        .from("User")
        .update({ credits: user.credits })
        .eq("id", user.id);

      await db.from("CreditLog").insert({
        id: generateId(),
        userId: user.id,
        amount: creditCost,
        reason: "generation_refund",
        referenceId: generationId,
      });

      await db
        .from("Generation")
        .update({
          status: "FAILED",
          metadata: { error: genError?.message || "Unknown error" },
        })
        .eq("id", generationId);

      return NextResponse.json(
        { error: "Image generation failed. Credits have been refunded." },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[GENERATE_ROUTE_ERROR]", error?.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
