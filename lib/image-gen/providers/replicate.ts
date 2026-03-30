import Replicate from "replicate";
import type { GenerationRequest, GenerationResult } from "./fal";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function generateWithReplicate(
  req: GenerationRequest,
  modelId: string = "black-forest-labs/flux-1.1-pro"
): Promise<GenerationResult> {
  const start = Date.now();

  const output = await replicate.run(modelId as `${string}/${string}`, {
    input: {
      prompt: req.prompt,
      negative_prompt: req.negativePrompt,
      width: req.width || 1344,
      height: req.height || 768,
      num_inference_steps: req.steps || 28,
      guidance_scale: 3.5,
    },
  });

  const imageUrl = Array.isArray(output) ? output[0] : (output as any)?.url || String(output);

  return {
    imageUrl,
    modelUsed: modelId,
    provider: "replicate",
    durationMs: Date.now() - start,
  };
}
