import { fal } from "@fal-ai/client";

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

export async function generateWithFal(
  req: GenerationRequest,
  modelId: string = "fal-ai/flux/dev"
): Promise<GenerationResult> {
  const start = Date.now();

  const result = await fal.subscribe(modelId, {
    input: {
      prompt: req.prompt,
      negative_prompt: req.negativePrompt,
      image_size: "landscape_16_9",
      num_inference_steps: req.steps || 28,
      guidance_scale: 3.5,
    },
  }) as any;

  return {
    imageUrl: result.images?.[0]?.url || result.output?.url || "",
    modelUsed: modelId,
    provider: "fal",
    durationMs: Date.now() - start,
  };
}

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

  return {
    imageUrl: result.image?.url || result.output?.url || "",
    modelUsed: "fal-ai/face-swap",
    provider: "fal",
    durationMs: Date.now() - start,
  };
}
