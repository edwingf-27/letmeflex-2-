import type { GenerationRequest, GenerationResult } from "./fal";

export async function generateWithOpenAI(
  req: GenerationRequest,
  modelId: string = "dall-e-3"
): Promise<GenerationResult> {
  const start = Date.now();
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: req.prompt,
      n: 1,
      size: "1792x1024",
      quality: "hd",
      response_format: "url",
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "OpenAI generation failed");
  }
  return {
    imageUrl: data.data[0].url,
    modelUsed: "dall-e-3",
    provider: "openai",
    durationMs: Date.now() - start,
  };
}
