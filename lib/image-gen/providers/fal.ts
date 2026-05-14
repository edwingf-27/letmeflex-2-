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

// ─── Extraction universelle des images FAL ────────────────────────────────────
function extractImages(data: any): Array<{ url: string; seed?: number }> {
  if (Array.isArray(data.images) && data.images.length > 0) return data.images;
  if (data.image?.url) return [data.image];
  return [];
}

// ─── Génération standard — flux-pro/v1.1-ultra (meilleure qualité) ────────────
export async function generateWithFal(
  req: GenerationRequest,
  modelId: string = "fal-ai/flux-pro/v1.1-ultra",
  numImages: number = 1
): Promise<MultiGenerationResult> {
  const start = Date.now();

  const isUltra = modelId.includes("v1.1-ultra");
  const isRealism = modelId.includes("flux-realism");

  const result = await fal.subscribe(modelId, {
    input: {
      prompt: req.prompt,
      num_images: numImages,
      ...(isUltra ? {
        // Ultra : paramètres spécifiques, raw=true pour rendu naturel non-IA
        aspect_ratio: "16:9",
        safety_tolerance: "6",
        raw: true,
      } : isRealism ? {
        image_size: "landscape_16_9",
        num_inference_steps: 28,
        guidance_scale: 3.5,
        enable_safety_checker: true,
      } : {
        // flux-pro standard
        image_size: "landscape_16_9",
        safety_tolerance: "5",
      }),
    },
  }) as any;

  const data = result.data || result;
  const rawImages = extractImages(data);

  if (rawImages.length === 0) {
    throw new Error(`FAL AI (${modelId}) returned no images. The prompt may have been filtered.`);
  }

  return {
    images: rawImages.map((img: any) => ({
      imageUrl: img.url || "",
      seed: img.seed ?? data.seed ?? undefined,
    })),
    modelUsed: modelId,
    provider: "fal",
    durationMs: Date.now() - start,
  };
}

export async function generateSingleWithFal(
  req: GenerationRequest,
  modelId: string = "fal-ai/flux-pro/v1.1-ultra"
): Promise<GenerationResult> {
  const multi = await generateWithFal(req, modelId, 1);
  return {
    imageUrl: multi.images[0]?.imageUrl || "",
    modelUsed: multi.modelUsed,
    provider: multi.provider,
    durationMs: multi.durationMs,
  };
}

// ─── Face swap — PuLID ────────────────────────────────────────────────────────
export async function generateWithFaceAndPrompt(
  prompt: string,
  faceImageUrl: string,
  numImages: number = 1,
  negativePrompt?: string
): Promise<MultiGenerationResult> {
  const start = Date.now();

  const neg = negativePrompt ||
    "painting, drawing, cartoon, anime, illustration, CGI, 3D render, " +
    "plastic skin, airbrushed, smooth skin, fake, artificial, " +
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
    throw new Error("FAL AI (fal-ai/pulid) returned no images.");
  }

  return {
    images: rawImages.map((img: any) => ({
      imageUrl: img.url || "",
      seed: img.seed ?? data.seed ?? undefined,
    })),
    modelUsed: "fal-ai/pulid",
    provider: "fal",
    durationMs: Date.now() - start,
  };
}

// ─── Image-to-image — flux-pro/v1.1/image-to-image ───────────────────────────
export async function imageToImageWithFal(
  imageUrl: string,
  prompt: string,
  strength: number = 0.35,
  numImages: number = 1
): Promise<MultiGenerationResult> {
  const start = Date.now();

  const result = await fal.subscribe("fal-ai/flux-pro/v1.1/image-to-image", {
    input: {
      image_url: imageUrl,
      prompt,
      strength,
      num_images: numImages,
      safety_tolerance: "6",
    },
  }) as any;

  const data = result.data || result;
  const rawImages = extractImages(data);

  if (rawImages.length === 0) {
    throw new Error("FAL AI (image-to-image) returned no images.");
  }

  return {
    images: rawImages.map((img: any) => ({
      imageUrl: img.url || "",
      seed: img.seed ?? data.seed ?? undefined,
    })),
    modelUsed: "fal-ai/flux-pro/v1.1/image-to-image",
    provider: "fal",
    durationMs: Date.now() - start,
  };
}

// ─── Background swap (legacy) ─────────────────────────────────────────────────
export async function backgroundSwapWithFal(
  itemImageUrl: string,
  backgroundPrompt: string,
  numImages: number = 1
): Promise<MultiGenerationResult> {
  return generateWithFal({ prompt: backgroundPrompt }, "fal-ai/flux-pro/v1.1-ultra", numImages);
}
