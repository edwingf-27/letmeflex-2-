import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

export async function GET() {
  const checks: Record<string, any> = {};

  // Check env vars
  checks.FAL_KEY = process.env.FAL_KEY ? `set (${process.env.FAL_KEY.substring(0, 8)}...)` : "MISSING";
  checks.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "MISSING";
  checks.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "MISSING";

  // Test fal.ai
  try {
    fal.config({ credentials: process.env.FAL_KEY! });
    const result = await fal.subscribe("fal-ai/flux/dev", {
      input: {
        prompt: "a gold coin on white background",
        image_size: "square",
        num_inference_steps: 4,
      },
    }) as any;
    checks.fal_test = {
      success: true,
      imageUrl: result.images?.[0]?.url || "no url",
      timings: result.timings,
    };
  } catch (err: any) {
    checks.fal_test = {
      success: false,
      error: err.message,
      status: err.status,
      body: JSON.stringify(err.body || err).substring(0, 300),
    };
  }

  // Test Supabase
  try {
    const { db } = await import("@/lib/db");
    const { data, error } = await db.from("User").select("id").limit(1);
    checks.supabase_test = {
      success: !error,
      error: error?.message,
      rowCount: data?.length,
    };
  } catch (err: any) {
    checks.supabase_test = { success: false, error: err.message };
  }

  return NextResponse.json(checks);
}
