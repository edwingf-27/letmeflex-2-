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

export async function generateWithFal(
  req: GenerationRequest,
  modelId: string = "fal-ai/flux-pro/v1.1",
  numImages: number = 1
): Promise<MultiGenerationResult> {
  const start = Date.now();

  const result = await fal.subscribe("fal-ai/flux-pro/v1.1", {
    input: {
      prompt: req.prompt,
    
      image_size: "landscape_16_9",
     
      num_images: numImages,
      safety_tolerance: "5",
    },
  }) as any;

  const data = result.data || result;
  const rawImages = data.images || [];

  const images = rawImages.map((img: any) => ({
    imageUrl: img.url || "",
    seed: img.seed ?? undefined,
  }));

  return {
    images,
    modelUsed: "fal-ai/flux-pro/v1.1",
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
  numImages: number = 1
): Promise<MultiGenerationResult> {
  const start = Date.now();

  const result = await fal.subscribe("fal-ai/pulid", {
    input: {
      prompt,
      reference_images: [{ image_url: faceImageUrl }],
      num_images: numImages,
      image_size: "landscape_16_9",
    },
  }) as any;

  const data = result.data || result;
  const rawImages = data.images || [];

  const images = rawImages.map((img: any) => ({
    imageUrl: img.url || "",
    seed: img.seed ?? undefined,
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
    },
  }) as any;

  const data = result.data || result;
  const rawImages = data.images || [];

  const images = rawImages.map((img: any) => ({
    imageUrl: img.url || "",
    seed: img.seed ?? undefined,
  }));

  return {
    images,
    modelUsed: "fal-ai/flux-pro/v1.1",
    provider: "fal",
    durationMs: Date.now() - start,
  };
}