import { fal } from "@fal-ai/client";

// Ensure fal.ai credentials are set from env
if (process.env.FAL_KEY) {
  fal.config({ credentials: process.env.FAL_KEY });
}

export interface GenerationRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
}

export interface GenerationResult {
  imageUrl: string;
  modelUsed: string;
  provider: string;
  durationMs: number;
}

export interface MultiGenerationResult {
  images: Array<{ imageUrl: string; seed?: number }>;
  modelUsed: string;
  provider: string;
  durationMs: number;
}

/**
 * Generate multiple images with fal.ai. Returns all images.
 */
export async function generateWithFal(
  req: GenerationRequest,
  modelId: string = "fal-ai/flux/dev",
  numImages: number = 1
): Promise<MultiGenerationResult> {
  const start = Date.now();

  const result = await fal.subscribe(modelId, {
    input: {
      prompt: req.prompt,
      negative_prompt: req.negativePrompt,
      image_size: "landscape_16_9",
      num_inference_steps: req.steps || 28,
      guidance_scale: 3.5,
      num_images: numImages,
    },
  }) as any;

  // fal.subscribe wraps response in result.data
  const data = result.data || result;
  const rawImages = data.images || data.output?.images || [];

  const images = rawImages.map((img: any) => ({
    imageUrl: img.url || img.image_url || "",
    seed: img.seed ?? undefined,
  }));

  // Fallback: if no images array, try single image fields
  if (images.length === 0) {
    const singleUrl =
      data.images?.[0]?.url ||
      data.output?.url ||
      result.images?.[0]?.url ||
      "";
    if (singleUrl) {
      images.push({ imageUrl: singleUrl, seed: undefined });
    }
  }

  return {
    images,
    modelUsed: modelId,
    provider: "fal",
    durationMs: Date.now() - start,
  };
}

/**
 * Backward-compatible single image generation.
 */
export async function generateSingleWithFal(
  req: GenerationRequest,
  modelId: string = "fal-ai/flux/dev"
): Promise<GenerationResult> {
  const multi = await generateWithFal(req, modelId, 1);
  return {
    imageUrl: multi.images[0]?.imageUrl || "",
    modelUsed: multi.modelUsed,
    provider: multi.provider,
    durationMs: multi.durationMs,
  };
}

/**
 * Face swap: swap a face onto a base image.
 */
export async function faceSwapWithFal(
  sourceImageUrl: string,
  targetFaceUrl: string
): Promise<GenerationResult> {
  const start = Date.now();

  const result = await fal.subscribe("fal-ai/face-swap", {
    input: {
      base_image_url: sourceImageUrl,
      swap_image_url: targetFaceUrl,
    },
  }) as any;

  const data = result.data || result;
  return {
    imageUrl:
      data.image?.url ||
      data.images?.[0]?.url ||
      data.output?.url ||
      "",
    modelUsed: "fal-ai/face-swap",
    provider: "fal",
    durationMs: Date.now() - start,
  };
}

/**
 * Background swap: use image-to-image to replace the background of a source image.
 */
export async function backgroundSwapWithFal(
  itemImageUrl: string,
  backgroundPrompt: string,
  numImages: number = 1
): Promise<MultiGenerationResult> {
  const start = Date.now();

  const result = await fal.subscribe("fal-ai/flux/dev/image-to-image", {
    input: {
      image_url: itemImageUrl,
      prompt: backgroundPrompt,
      strength: 0.75,
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: numImages,
    },
  }) as any;

  const data = result.data || result;
  const rawImages = data.images || data.output?.images || [];

  const images = rawImages.map((img: any) => ({
    imageUrl: img.url || img.image_url || "",
    seed: img.seed ?? undefined,
  }));

  if (images.length === 0) {
    const singleUrl =
      data.images?.[0]?.url ||
      data.output?.url ||
      result.images?.[0]?.url ||
      "";
    if (singleUrl) {
      images.push({ imageUrl: singleUrl, seed: undefined });
    }
  }

  return {
    images,
    modelUsed: "fal-ai/flux/dev/image-to-image",
    provider: "fal",
    durationMs: Date.now() - start,
  };
}
