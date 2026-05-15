import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, generateId } from "@/lib/db";
import { fal } from "@fal-ai/client";

export const maxDuration = 300;

const falKey = process.env.FAL_KEY?.trim();
if (falKey) fal.config({ credentials: falKey });

type TransformMode = "replace_person" | "add_person";

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

    if (!imageUrl || !mode) {
      return NextResponse.json({ error: "imageUrl and mode are required" }, { status: 400 });
    }
    if (!refImageUrl) {
      return NextResponse.json({ error: "A reference photo is required." }, { status: 400 });
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

      // ── OmniGen — multi-image composition ────────────────────────────────────
      // <image1> = source photo (the user's scene)
      // <image2> = reference photo (the person to add/replace)
      //
      // OmniGen understands natural language + multiple images:
      // it can insert a full-body person from image2 into the scene of image1
      // without deforming the original photo.

      let prompt: string;

      if (mode === "replace_person") {
        prompt =
          `The person in <image1> is a photo. ` +
          `Replace the person standing next to the main subject in <image1> ` +
          `with the person from <image2>, full body, realistic. ` +
          `${extraInstructions ? extraInstructions + ". " : ""}` +
          `Keep the main subject, background, lighting and all other details from <image1> exactly the same. ` +
          `The result must look like a real photograph, ultra-detailed, photorealistic.`;
      } else {
        prompt =
          `The person in <image1> is a photo. ` +
          `Add the person from <image2> standing naturally next to the main subject in <image1>, full body. ` +
          `${extraInstructions ? extraInstructions + ". " : ""}` +
          `Keep the original background, main subject and all details from <image1> exactly the same. ` +
          `The added person should blend naturally with matching lighting and shadows. ` +
          `The result must look like a real photograph, ultra-detailed, photorealistic.`;
      }

      const result = await fal.subscribe("fal-ai/omnigen-v1", {
        input: {
          prompt,
          input_images: [imageUrl, refImageUrl],
          guidance_scale: 3.0,
          img_guidance_scale: 1.8,
          num_inference_steps: 50,
        },
      }) as any;

      const data = result.data || result;
      const outputUrl =
        data.images?.[0]?.url ||
        data.image?.url ||
        "";

      if (!outputUrl) throw new Error("OmniGen returned no image");

      const durationMs = Date.now() - start;
      console.log(`[TRANSFORM] mode=${mode} model=omnigen-v1 duration=${durationMs}ms`);

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
      // Refund on error
      await db.from("User").update({ credits: user.credits }).eq("id", user.id);
      console.error("[TRANSFORM_ERROR]", err?.message || err);
      return NextResponse.json(
        { error: `Transform failed: ${err?.message || "unknown error"}. Credits refunded.` },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("[TRANSFORM_ROUTE_ERROR]", err?.message || err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
