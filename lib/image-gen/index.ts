import { db } from "@/lib/db";
import { generateWithFal, generateSingleWithFal } from "./providers/fal";
import { generateWithReplicate } from "./providers/replicate";
import { generateWithOpenAI } from "./providers/openai";
import type {
  GenerationRequest,
  GenerationResult,
  MultiGenerationResult,
} from "./providers/fal";

export type { GenerationRequest, GenerationResult, MultiGenerationResult };

/**
 * Backward-compatible single image generation.
 */
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
    return generateSingleWithFal(req);
  }

  switch (activeModel.provider) {
    case "fal":
      return generateSingleWithFal(req, activeModel.modelId);
    case "replicate":
      return generateWithReplicate(req, activeModel.modelId);
    case "openai":
      return generateWithOpenAI(req, activeModel.modelId);
    default:
      return generateSingleWithFal(req);
  }
}

/**
 * Multi-image generation. Returns all requested images.
 */
export async function generateImages(
  req: GenerationRequest & { numImages?: number }
): Promise<MultiGenerationResult> {
  const numImages = req.numImages || 1;

  const { data: activeModel } = await db
    .from("ModelConfig")
    .select("*")
    .eq("isDefault", true)
    .eq("isActive", true)
    .single();

  if (!activeModel || activeModel.provider === "fal") {
    return generateWithFal(req, activeModel?.modelId || "fal-ai/flux/dev", numImages);
  }

  // For non-fal providers, fall back to generating N single images
  const results: Array<{ imageUrl: string; seed?: number }> = [];
  let modelUsed = "";
  let provider = "";
  const start = Date.now();

  for (let i = 0; i < numImages; i++) {
    let result: GenerationResult;
    switch (activeModel.provider) {
      case "replicate":
        result = await generateWithReplicate(req, activeModel.modelId);
        break;
      case "openai":
        result = await generateWithOpenAI(req, activeModel.modelId);
        break;
      default:
        result = await generateSingleWithFal(req, activeModel.modelId);
        break;
    }
    results.push({ imageUrl: result.imageUrl });
    modelUsed = result.modelUsed;
    provider = result.provider;
  }

  return {
    images: results,
    modelUsed,
    provider,
    durationMs: Date.now() - start,
  };
}
