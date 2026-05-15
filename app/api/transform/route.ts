import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, generateId } from "@/lib/db";
import { imageToImageWithFal } from "@/lib/image-gen/providers/fal";

export const maxDuration = 300;

const TRANSFORM_MODES = {
  replace_object: {
    strength: 0.65,
    buildPrompt: (extra: string) =>
      `RAW photo, DSLR photograph, Canon EOS R5, photorealistic, hyperrealistic. ` +
      `${extra || "replace the specified object seamlessly"}. ` +
      "Keep everything else in the photo EXACTLY the same — same background, same people, same lighting. " +
      "Only modify the specified object or area. " +
      "Seamless integration, perfect lighting match, ultra-detailed, 8K UHD. Real photograph. NOT AI art.",
  },
  add_person: {
    strength: 0.78,
    buildPrompt: (extra: string) =>
      `RAW photo, DSLR photograph, Canon EOS R5, photorealistic, hyperrealistic. ` +
      `${extra || "add a person naturally next to the main subject"}. ` +
      "Natural skin texture, realistic body proportions, matching lighting and shadows from the existing scene, " +
      "seamless integration with the background, ultra-detailed, 8K UHD. " +
      "Keep the original background and main subject intact. Real photograph. NOT a painting.",
  },
} as const;

type TransformMode = keyof typeof TRANSFORM_MODES;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { imageUrl, mode, extraInstructions, refImageUrl } = body as {
      imageUrl: string;
      mode: TransformMode;
      extraInstructions?: string;
      refImageUrl?: string;
    };

    if (!imageUrl || !mode || !TRANSFORM_MODES[mode]) {
      return NextResponse.json({ error: "imageUrl and mode are required" }, { status: 400 });
    }

    const CREDIT_COST = 1;

    const { data: user } = await db
      .from("User")
      .select("id, credits, email")
      .eq("id", session.user.id)
      .single();

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.credits < CREDIT_COST) {
      return NextResponse.json(
        { error: "Insufficient credits", required: CREDIT_COST, available: user.credits },
        { status: 402 }
      );
    }

    const config = TRANSFORM_MODES[mode];

    // Build a richer prompt when a reference image is provided
    let promptInput = extraInstructions || "";
    if (refImageUrl && !extraInstructions) {
      promptInput = mode === "replace_object"
        ? "replace the specified object with the one shown in the reference image"
        : "add the person from the reference image naturally next to the main subject";
    }

    const prompt = config.buildPrompt(promptInput);

    // Deduct credit
    const newCredits = user.credits - CREDIT_COST;
    await db.from("User").update({ credits: newCredits }).eq("id", user.id);

    const transformId = generateId();
    await db.from("CreditLog").insert({
      id: generateId(),
      userId: user.id,
      amount: -CREDIT_COST,
      reason: `transform_${mode}`,
      referenceId: transformId,
    });

    try {
      const start = Date.now();

      // Always use image-to-image on the SOURCE photo so the original scene is preserved
      // refImageUrl is used as additional context in the prompt (direct conditioning
      // requires IP-Adapter which we keep as a future upgrade)
      const result = await imageToImageWithFal(imageUrl, prompt, config.strength, 1);
      const outputUrl = result.images[0]?.imageUrl || "";

      if (!outputUrl) throw new Error("FAL returned no image for transform");

      const durationMs = Date.now() - start;
      console.log(`[TRANSFORM] mode=${mode} strength=${config.strength} duration=${durationMs}ms`);

      return NextResponse.json({
        id: transformId,
        status: "COMPLETED",
        imageUrl: outputUrl,
        mode,
        creditsUsed: CREDIT_COST,
        creditsRemaining: newCredits,
        durationMs,
      });
    } catch (err: any) {
      // Refund credit on error
      await db.from("User").update({ credits: user.credits }).eq("id", user.id);
      console.error("[TRANSFORM_ERROR]", err?.message || err);
      return NextResponse.json(
        { error: "Transformation failed. Credits refunded." },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("[TRANSFORM_ROUTE_ERROR]", err?.message || err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
