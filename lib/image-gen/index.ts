import { db } from "@/lib/db";
import { generateWithFal } from "./providers/fal";
import { generateWithReplicate } from "./providers/replicate";
import { generateWithOpenAI } from "./providers/openai";
import type { GenerationRequest, GenerationResult } from "./providers/fal";

export type { GenerationRequest, GenerationResult };

export async function generateImage(
  req: GenerationRequest
): Promise<GenerationResult> {
  const { data: activeModel } = await db
    .from("ModelConfig")
    .select("*")
    .eq("isDefault", true)
    .eq("isActive", true)
    .single();

  if (!activeModel) {
    // Fallback to fal.ai flux/dev
    return generateWithFal(req);
  }

  switch (activeModel.provider) {
    case "fal":
      return generateWithFal(req, activeModel.modelId);
    case "replicate":
      return generateWithReplicate(req, activeModel.modelId);
    case "openai":
      return generateWithOpenAI(req, activeModel.modelId);
    default:
      return generateWithFal(req);
  }
}
