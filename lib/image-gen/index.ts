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

function normalizeFalModelId(modelId?: string): string {
  if (!modelId) return "fal-ai/flux/dev";
  if (modelId === "fal-ai/flux") return "fal-ai/flux/dev";
  return modelId;
}

function getPreferredProviderWithoutDb():
  | { provider: "fal"; modelId: string }
  | { provider: "replicate"; modelId: string }
  | { provider: "openai"; modelId: string } {
    if (process.env.FAL_KEY?.trim()) {
      return { provider: "fal", modelId: "fal-ai/flux-pro/v1.1" };
    }
    if (process.env.OPENAI_API_KEY?.trim()) {
      return { provider: "openai", modelId: "gpt-image-1" };
    }
    if (process.env.REPLICATE_API_TOKEN?.trim()) {
      return { provider: "replicate", modelId: "black-forest-labs/flux-1.1-pro" };
    }
  throw new Error(
    "No AI provider configured. Set one of: FAL_KEY, REPLICATE_API_TOKEN, OPENAI_API_KEY in .env.local."
  );
}

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
    const fallback = getPreferredProviderWithoutDb();
    if (fallback.provider === "fal") {
      return generateSingleWithFal(req, fallback.modelId);
    }
    if (fallback.provider === "replicate") {
      return generateWithReplicate(req, fallback.modelId);
    }
    return generateWithOpenAI(req, fallback.modelId);
  }

  switch (activeModel.provider) {
    case "fal":
      return generateSingleWithFal(req, normalizeFalModelId(activeModel.modelId));
    case "replicate":
      return generateWithReplicate(req, activeModel.modelId);
    case "openai":
      return generateWithOpenAI(req, activeModel.modelId);
    default:
      return generateSingleWithFal(req, "fal-ai/flux/dev");
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

  if (!activeModel) {
    const fallback = getPreferredProviderWithoutDb();
    if (fallback.provider === "fal") {
      return generateWithFal(req, fallback.modelId, numImages);
    }

    const results: Array<{ imageUrl: string; seed?: number }> = [];
    const start = Date.now();
    for (let i = 0; i < numImages; i++) {
      const single =
        fallback.provider === "replicate"
          ? await generateWithReplicate(req, fallback.modelId)
          : await generateWithOpenAI(req, fallback.modelId);
      results.push({ imageUrl: single.imageUrl });
    }
    return {
      images: results,
      modelUsed: fallback.modelId,
      provider: fallback.provider,
      durationMs: Date.now() - start,
    };
  }

  if (activeModel.provider === "fal") {
    return generateWithFal(req, normalizeFalModelId(activeModel.modelId), numImages);
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
