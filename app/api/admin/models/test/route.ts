import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateWithFal } from "@/lib/image-gen/providers/fal";
import { generateWithReplicate } from "@/lib/image-gen/providers/replicate";
import { generateWithOpenAI } from "@/lib/image-gen/providers/openai";

const TEST_PROMPT =
  "A luxury gold watch on a marble surface, photorealistic, shallow depth of field, studio lighting, 85mm lens";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { modelId: configId } = await req.json();

    const model = await prisma.modelConfig.findUnique({
      where: { id: configId },
    });

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    const request = { prompt: TEST_PROMPT };
    let result;

    switch (model.provider) {
      case "fal":
        result = await generateWithFal(request, model.modelId);
        break;
      case "replicate":
        result = await generateWithReplicate(request, model.modelId);
        break;
      case "openai":
        result = await generateWithOpenAI(request, model.modelId);
        break;
      default:
        return NextResponse.json(
          { error: "Unknown provider" },
          { status: 400 }
        );
    }

    // Update avg seconds
    const avgSeconds = Math.round(result.durationMs / 1000);
    await prisma.modelConfig.update({
      where: { id: configId },
      data: { avgSeconds },
    });

    return NextResponse.json({
      imageUrl: result.imageUrl,
      durationMs: result.durationMs,
      provider: result.provider,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error("Model test error:", error);
    return NextResponse.json(
      { error: error.message || "Test failed" },
      { status: 500 }
    );
  }
}
