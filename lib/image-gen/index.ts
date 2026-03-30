import { prisma } from "@/lib/prisma";
import { generateWithFal } from "./providers/fal";
import { generateWithReplicate } from "./providers/replicate";
import { generateWithOpenAI } from "./providers/openai";
import type { GenerationRequest, GenerationResult } from "./providers/fal";

export type { GenerationRequest, GenerationResult };

export async function generateImage(
  req: GenerationRequest
): Promise<GenerationResult> {
  const activeModel = await prisma.modelConfig.findFirst({
    where: { isDefault: true, isActive: true },
  });

  if (!activeModel) {
    // Fallback to fal.ai flux/dev
    return generateWithFal(req);
  }

  switch (activeModel.provider) {
    case "fal":
      return generateWithFal(req, activeModel.modelId);
    case "replicate":
      return generateWithReplicate(req, activeModel.modelId);
    case "openai":
      return generateWithOpenAI(req, activeModel.modelId);
    default:
      return generateWithFal(req);
  }
}
