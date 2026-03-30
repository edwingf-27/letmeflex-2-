/**
 * AI prompt generation service.
 * Uses fal.ai's any-llm model or OpenAI to generate unique photography prompts.
 */

interface GeneratedPrompt {
  promptText: string;
  negativePrompt: string;
}

const DEFAULT_NEGATIVE =
  "watermark, text, logo, blurry, low quality, cartoon, illustration, ugly, distorted, amateur, grain, overexposed";

export async function generateAIPrompts(params: {
  category: string;
  subcategory?: string;
  shot?: string;
  count: number;
  basePrompt?: string;
}): Promise<GeneratedPrompt[]> {
  const { category, subcategory, shot, count, basePrompt } = params;

  const systemPrompt = `You are an expert luxury photography prompt engineer for AI image generation. Generate ${count} unique, highly detailed prompts for the category '${category}'${subcategory ? `, subcategory '${subcategory}'` : ""}${shot ? `, shot type '${shot}'` : ""}. Each prompt must describe a hyper-realistic luxury scene with specific camera settings (lens, aperture, lighting). Include brand names, materials, textures. Each prompt should be different in composition, angle, or setting.${basePrompt ? ` Base context: ${basePrompt}` : ""}

Respond ONLY with a valid JSON array. Each element must have "promptText" and "negativePrompt" fields.
Example format:
[
  {
    "promptText": "Ultra-photorealistic photograph of...",
    "negativePrompt": "watermark, text, logo, blurry..."
  }
]`;

  // Try OpenAI first if key is set
  if (process.env.OPENAI_API_KEY) {
    try {
      return await callOpenAI(systemPrompt, count);
    } catch (err) {
      console.error("[AI_GENERATOR] OpenAI call failed, trying fal.ai:", err);
    }
  }

  // Fallback to fal.ai any-llm
  if (process.env.FAL_KEY) {
    try {
      return await callFalAI(systemPrompt, count);
    } catch (err) {
      console.error("[AI_GENERATOR] fal.ai call failed:", err);
    }
  }

  // Final fallback: return empty array
  console.warn("[AI_GENERATOR] No AI provider available, returning empty array");
  return [];
}

async function callOpenAI(
  systemPrompt: string,
  count: number
): Promise<GeneratedPrompt[]> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate exactly ${count} unique luxury photography prompts as a JSON array.`,
        },
      ],
      temperature: 0.9,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API error: ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";
  return parsePromptResponse(content, count);
}

async function callFalAI(
  systemPrompt: string,
  count: number
): Promise<GeneratedPrompt[]> {
  const res = await fetch("https://fal.run/fal-ai/any-llm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${process.env.FAL_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-flash-1.5",
      prompt: `${systemPrompt}\n\nGenerate exactly ${count} unique luxury photography prompts as a JSON array.`,
    }),
  });

  if (!res.ok) {
    throw new Error(`fal.ai API error: ${res.status}`);
  }

  const data = await res.json();
  const content = data.output || data.result || "";
  return parsePromptResponse(content, count);
}

function parsePromptResponse(
  content: string,
  expectedCount: number
): GeneratedPrompt[] {
  try {
    // Extract JSON array from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("No JSON array found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) {
      throw new Error("Parsed result is not an array");
    }

    return parsed.slice(0, expectedCount).map((item: any) => ({
      promptText: item.promptText || item.prompt || "",
      negativePrompt: item.negativePrompt || item.negative_prompt || DEFAULT_NEGATIVE,
    }));
  } catch (err) {
    console.error("[AI_GENERATOR] Failed to parse response:", err);
    return [];
  }
}
