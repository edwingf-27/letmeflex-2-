import { fal } from "@fal-ai/client";

const falKey = process.env.FAL_KEY?.trim();
if (falKey) {
  fal.config({ credentials: falKey });
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

// Extrait les images d'une réponse FAL peu importe le format (images[] ou image)
function extractImages(data: any): Array<{ url: string; seed?: number }> {
  if (Array.isArray(data.images) && data.images.length > 0) {
    return data.images;
  }
  if (data.image?.url) {
    return [data.image];
  }
  return [];
}

export async function generateWithFal(
  req: GenerationRequest,
  modelId: string = "fal-ai/flux-pro/v1.1",
  numImages: number = 1
): Promise<MultiGenerationResult> {
  const start = Date.now();

  // fal-ai/flux-realism et fal-ai/flux-pro ont des paramètres légèrement différents
  const isRealism = modelId.includes("flux-realism");

  const result = await fal.subscribe(modelId, {
    input: {
      prompt: req.prompt,
      negative_prompt: req.negativePrompt,
      image_size: "landscape_16_9",
      num_images: numImages,
      ...(isRealism ? {
        num_inference_steps: 28,
        guidance_scale: 3.5,
        enable_safety_checker: false,
      } : {
        safety_tolerance: "5",
      }),
    },
  }) as any;

  const data = result.data || result;
  const rawImages = extractImages(data);

  if (rawImages.length === 0) {
    throw new Error(`FAL AI (${modelId}) returned no images. The prompt may have been filtered.`);
  }

  const images = rawImages.map((img: any) => ({
    imageUrl: img.url || "",
    seed: img.seed ?? data.seed ?? undefined,
  }));

  return {
    images,
    modelUsed: modelId,
    provider: "fal",
    durationMs: Date.now() - start,
  };
}

export async function generateSingleWithFal(
  req: GenerationRequest,
  modelId: string = "fal-ai/flux-pro/v1.1"
): Promise<GenerationResult> {
  const multi = await generateWithFal(req, modelId, 1);
  return {
    imageUrl: multi.images[0]?.imageUrl || "",
    modelUsed: multi.modelUsed,
    provider: multi.provider,
    durationMs: multi.durationMs,
  };
}

export async function generateWithFaceAndPrompt(
  prompt: string,
  faceImageUrl: string,
  numImages: number = 1,
  negativePrompt?: string
): Promise<MultiGenerationResult> {
  const start = Date.now();

  const neg = negativePrompt ||
    "painting, drawing, cartoon, anime, illustration, CGI, 3D render, " +
    "plastic skin, airbrushed skin, smooth skin, fake, artificial, " +
    "deformed face, bad anatomy, extra limbs, watermark, text, logo, " +
    "blurry, low quality, overprocessed, oversaturated";

  const result = await fal.subscribe("fal-ai/pulid", {
    input: {
      prompt,
      negative_prompt: neg,
      reference_images: [{ image_url: faceImageUrl }],
      num_images: numImages,
      image_size: "landscape_16_9",
      num_inference_steps: 30,
      guidance_scale: 4.0,
    },
  }) as any;

  const data = result.data || result;
  const rawImages = extractImages(data);

  if (rawImages.length === 0) {
    throw new Error("FAL AI (fal-ai/pulid) returned no images. The prompt or face image may have been filtered.");
  }

  const images = rawImages.map((img: any) => ({
    imageUrl: img.url || "",
    seed: img.seed ?? data.seed ?? undefined,
  }));

  return {
    images,
    modelUsed: "fal-ai/pulid",
    provider: "fal",
    durationMs: Date.now() - start,
  };
}

export async function backgroundSwapWithFal(
  itemImageUrl: string,
  backgroundPrompt: string,
  numImages: number = 1
): Promise<MultiGenerationResult> {
  const start = Date.now();

  const result = await fal.subscribe("fal-ai/flux-pro/v1.1", {
    input: {
      prompt: backgroundPrompt,
      image_size: "landscape_16_9",
      num_images: numImages,
      safety_tolerance: "5",
    },
  }) as any;

  const data = result.data || result;
  const rawImages = extractImages(data);

  if (rawImages.length === 0) {
    throw new Error("FAL AI returned no images for background swap.");
  }

  const images = rawImages.map((img: any) => ({
    imageUrl: img.url || "",
    seed: img.seed ?? data.seed ?? undefined,
  }));

  return {
    images,
    modelUsed: "fal-ai/flux-pro/v1.1",
    provider: "fal",
    durationMs: Date.now() - start,
  };
}
