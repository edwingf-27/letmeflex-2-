import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, generateId } from "@/lib/db";
import { fal } from "@fal-ai/client";

export const maxDuration = 300;

const falKey = process.env.FAL_KEY?.trim();
if (falKey) fal.config({ credentials: falKey });

const TRANSFORM_MODES = {
  clean_room: {
    label: "Nettoyer une pièce",
    strength: 0.65,
    buildPrompt: (_extra: string) =>
      "RAW photo, DSLR photograph, perfectly clean and organized room, " +
      "tidy, minimalist, everything in place, no clutter, no mess, " +
      "spotless floors, neatly arranged furniture, photorealistic, 8K UHD. " +
      "NOT a painting. Real photograph.",
    negativePrompt:
      "mess, clutter, dirty, untidy, cartoon, illustration, CGI, blurry",
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
    const { imageUrl, mode, extraInstructions } = body as {
      imageUrl: string;
      mode: TransformMode;
      extraInstructions?: string;
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

      const result = await fal.subscribe("fal-ai/flux/dev/image-to-image", {
        input: {
          image_url: imageUrl,
          prompt,
          strength: config.strength,
          num_inference_steps: 28,
          guidance_scale: 3.5,
          num_images: 1,
          enable_safety_checker: true,
        },
      }) as any;

      const data = result.data || result;
      let outputUrl = "";

      if (Array.isArray(data.images) && data.images.length > 0) {
        outputUrl = data.images[0].url;
      } else if (data.image?.url) {
        outputUrl = data.image.url;
      }

      if (!outputUrl) {
        throw new Error("FAL returned no image for transform");
      }

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
