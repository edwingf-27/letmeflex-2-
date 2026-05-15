import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, generateId } from "@/lib/db";
import { fal } from "@fal-ai/client";
import { imageToImageWithFal } from "@/lib/image-gen/providers/fal";

export const maxDuration = 300;

const falKey = process.env.FAL_KEY?.trim();
if (falKey) fal.config({ credentials: falKey });

type TransformMode = "replace_person" | "add_person";

// ─── Face swap helper ──────────────────────────────────────────────────────────
// Swaps the face in targetImageUrl with the face from refImageUrl
async function faceSwap(targetImageUrl: string, refImageUrl: string): Promise<string> {
  const result = await fal.subscribe("fal-ai/face-swap", {
    input: {
      image0: { image_url: targetImageUrl },
      image1: { image_url: refImageUrl },
    },
  }) as any;

  const data = result.data || result;
  const url = data.image?.url || data.images?.[0]?.url;
  if (!url) throw new Error("face-swap returned no image");
  return url;
}

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
      let outputUrl = "";

      if (mode === "replace_person") {
        // ── Replace an existing person next to you ────────────────────────────
        // If a reference photo is provided → face swap directly on source photo
        // If no reference → use image-to-image with the text prompt
        if (refImageUrl) {
          outputUrl = await faceSwap(imageUrl, refImageUrl);
        } else {
          const prompt =
            `RAW photo, DSLR photograph, Canon EOS R5, photorealistic. ` +
            `${extraInstructions || "replace the person next to the main subject with someone else"}. ` +
            "Natural skin texture, matching lighting, seamless integration, 8K UHD. Real photograph.";
          const r = await imageToImageWithFal(imageUrl, prompt, 0.72, 1);
          outputUrl = r.images[0]?.imageUrl || "";
        }

      } else if (mode === "add_person") {
        // ── Add a new person next to you ─────────────────────────────────────
        // Step 1: image-to-image to physically add a person into the scene
        const addPrompt =
          `RAW photo, DSLR photograph, Canon EOS R5, photorealistic, hyperrealistic. ` +
          `${extraInstructions || "add a person naturally standing next to the main subject, same lighting, realistic body"}. ` +
          "Keep the original background and main subject exactly the same. " +
          "Natural skin texture, realistic proportions, seamless integration, 8K UHD. Real photograph.";

        const step1 = await imageToImageWithFal(imageUrl, addPrompt, 0.78, 1);
        const step1Url = step1.images[0]?.imageUrl || "";
        if (!step1Url) throw new Error("Image-to-image step failed");

        // Step 2: if a reference face is provided, swap the new person's face
        if (refImageUrl) {
          try {
            outputUrl = await faceSwap(step1Url, refImageUrl);
          } catch (faceSwapErr: any) {
            console.warn("[TRANSFORM] face-swap step failed, returning step1:", faceSwapErr.message);
            // Fall back to step1 result without face swap
            outputUrl = step1Url;
          }
        } else {
          outputUrl = step1Url;
        }
      }

      if (!outputUrl) throw new Error("Transform produced no image");

      const durationMs = Date.now() - start;
      console.log(`[TRANSFORM] mode=${mode} duration=${durationMs}ms hasRef=${!!refImageUrl}`);

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
        { error: `Transformation failed: ${err?.message || "unknown error"}. Credits refunded.` },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("[TRANSFORM_ROUTE_ERROR]", err?.message || err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
