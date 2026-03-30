import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

export async function GET() {
  const checks: Record<string, any> = {};

  checks.FAL_KEY = process.env.FAL_KEY ? `set (${process.env.FAL_KEY.substring(0, 8)}...)` : "MISSING";

  // Test fal.ai and dump the full response structure
  try {
    fal.config({ credentials: process.env.FAL_KEY! });
    const result = await fal.subscribe("fal-ai/flux/dev", {
      input: {
        prompt: "a gold coin on white background",
        image_size: "square",
        num_inference_steps: 4,
      },
    }) as any;

    // Dump all top-level keys and the data structure
    checks.fal_test = {
      success: true,
      topLevelKeys: Object.keys(result),
      hasData: !!result.data,
      dataKeys: result.data ? Object.keys(result.data) : null,
      images_direct: result.images?.[0]?.url || null,
      images_in_data: result.data?.images?.[0]?.url || null,
      full_response: JSON.stringify(result).substring(0, 500),
    };
  } catch (err: any) {
    checks.fal_test = {
      success: false,
      error: err.message,
      body: JSON.stringify(err.body || err).substring(0, 300),
    };
  }

  return NextResponse.json(checks);
}
