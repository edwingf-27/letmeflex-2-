import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, generateId } from "@/lib/db";
import { fal } from "@fal-ai/client";

export const maxDuration = 300;

const falKey = process.env.FAL_KEY?.trim();
if (falKey) fal.config({ credentials: falKey });

const TRANSFORM_MODES = {
  messy_room: {
    label: "Mettre en bordel",
    strength: 0.70,
    buildPrompt: (_extra: string) =>
      "RAW photo, DSLR photograph, Canon EOS R5, same room but extremely messy and cluttered, " +
      "clothes piled everywhere on the floor and sofa, empty bottles on the table, " +
      "shoes scattered around, bags dropped on the floor, blankets crumpled, " +
      "plates and cups left out, general chaos and disorder, ultra photorealistic, 8K UHD. " +
      "Keep the exact same room, same furniture, same layout. Real photograph.",
    negativePrompt:
      "clean, tidy, organized, cartoon, illustration, CGI, blurry, different room",
  },
  clean_room: {
    label: "Nettoyer une pièce",
    strength: 0.65,
    buildPrompt: (_extra: string) =>
      "RAW photo, DSLR photograph, Canon EOS R5, same room but perfectly clean and organized, " +
      "everything in its place, spotless floors, neatly arranged cushions, " +
      "clear tables, no clutter, no items on the floor, pristine and tidy, " +
      "ultra photorealistic, 8K UHD. Keep the exact same room, same furniture, same layout. Real photograph.",
    negativePrompt:
      "mess, clutter, dirty, clothes on floor, cartoon, illustration, CGI, blurry, different room",
  },
  replace_object: {
    label: "Remplacer un objet",
    strength: 0.75,
    buildPrompt: (extra: string) =>
      `RAW photo, DSLR photograph, photorealistic, hyperrealistic. ${extra}. ` +
      "Seamless integration, matching lighting and shadows, ultra-detailed, 8K UHD. " +
      "NOT a painting. Real photograph.",
    negativePrompt:
      "cartoon, illustration, CGI, 3D render, fake, blurry, low quality, deformed",
  },
  add_person: {
    label: "Ajouter une personne",
    strength: 0.70,
    buildPrompt: (extra: string) =>
      `RAW photo, DSLR photograph, photorealistic, hyperrealistic. ${extra}. ` +
      "Natural skin texture, realistic body proportions, matching lighting from the scene, " +
      "seamless integration, ultra-detailed, 8K UHD. NOT a painting. Real photograph.",
    negativePrompt:
      "cartoon, anime, illustration, CGI, deformed body, bad anatomy, blurry, fake skin",
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

    // Coût : 1 crédit
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
    const prompt = config.buildPrompt(extraInstructions || "");

    // Déduire le crédit
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
      let outputUrl = "";

      // Mode add_person avec photo de référence → PuLID pour reproduire la vraie tête
      if (mode === "add_person" && refImageUrl) {
        const neg =
          "cartoon, anime, CGI, deformed, bad anatomy, plastic skin, blurry, fake, watermark";
        const refPrompt =
          `RAW photo, DSLR, photorealistic. ${extraInstructions || "add this person naturally to the scene"}. ` +
          "Natural skin texture, realistic body, matching scene lighting, seamless integration, 8K UHD.";

        const result = await fal.subscribe("fal-ai/pulid", {
          input: {
            prompt: refPrompt,
            negative_prompt: neg,
            reference_images: [{ image_url: refImageUrl }],
            num_images: 1,
            image_size: "square_hd",
            num_inference_steps: 30,
            guidance_scale: 4.0,
          },
        }) as any;

        const data = result.data || result;
        if (Array.isArray(data.images) && data.images.length > 0) outputUrl = data.images[0].url;
        else if (data.image?.url) outputUrl = data.image.url;

      } else {
        // Tous les autres modes → flux-pro image-to-image
        const result = await fal.subscribe("fal-ai/flux-pro/v1/image-to-image", {
          input: {
            image_url: imageUrl,
            prompt,
            strength: config.strength,
            num_inference_steps: 28,
            guidance_scale: 4.0,
            num_images: 1,
            safety_tolerance: "5",
          },
        }) as any;

        const data = result.data || result;
        if (Array.isArray(data.images) && data.images.length > 0) outputUrl = data.images[0].url;
        else if (data.image?.url) outputUrl = data.image.url;
      }

      if (!outputUrl) throw new Error("FAL returned no image for transform");

      const durationMs = Date.now() - start;

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
      // Rembourser si erreur
      await db.from("User").update({ credits: user.credits }).eq("id", user.id);
      console.error("[TRANSFORM_ERROR]", err.message);
      return NextResponse.json(
        { error: "Transformation failed. Credits refunded." },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("[TRANSFORM_ROUTE_ERROR]", err.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
