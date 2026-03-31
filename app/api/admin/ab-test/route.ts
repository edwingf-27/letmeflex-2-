import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, generateId } from "@/lib/db";
import { generateWithFal } from "@/lib/image-gen/providers/fal";
import { generateWithReplicate } from "@/lib/image-gen/providers/replicate";
import { generateWithOpenAI } from "@/lib/image-gen/providers/openai";
import { ALL_SCENES } from "@/types/scenes";

async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

const runTestSchema = z.object({
  sceneId: z.string().min(1),
  models: z.array(
    z.object({
      modelId: z.string(),
      provider: z.string(),
      name: z.string(),
    })
  ).min(1),
  variationsPerModel: z.number().int().min(1).max(10).default(3),
  promptVariants: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = runTestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { sceneId, models, variationsPerModel, promptVariants } = parsed.data;

    // Find the scene
    const scene = ALL_SCENES.find((s) => s.id === sceneId);
    if (!scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    // Build prompts to test
    const prompts = promptVariants && promptVariants.length > 0
      ? promptVariants.filter((p) => p.trim().length > 0)
      : [scene.prompt];

    const testRunId = generateId();
    const results: Array<{
      id: string;
      modelId: string;
      modelName: string;
      provider: string;
      prompt: string;
      promptIndex: number;
      imageUrl: string;
      durationMs: number;
      variationIndex: number;
      error?: string;
    }> = [];

    // Generate images for each model x prompt x variation
    for (const model of models) {
      for (let pi = 0; pi < prompts.length; pi++) {
        const prompt = prompts[pi];
        for (let vi = 0; vi < variationsPerModel; vi++) {
          const genId = generateId();
          try {
            const start = Date.now();
            let imageUrl = "";
            let durationMs = 0;

            switch (model.provider) {
              case "fal": {
                const result = await generateWithFal(
                  { prompt },
                  model.modelId,
                  1
                );
                imageUrl = result.images[0]?.imageUrl || "";
                durationMs = result.durationMs;
                break;
              }
              case "replicate": {
                const result = await generateWithReplicate(
                  { prompt },
                  model.modelId
                );
                imageUrl = result.imageUrl;
                durationMs = result.durationMs;
                break;
              }
              case "openai": {
                const result = await generateWithOpenAI(
                  { prompt },
                  model.modelId
                );
                imageUrl = result.imageUrl;
                durationMs = result.durationMs;
                break;
              }
              default: {
                const result = await generateWithFal(
                  { prompt },
                  model.modelId,
                  1
                );
                imageUrl = result.images[0]?.imageUrl || "";
                durationMs = result.durationMs;
              }
            }

            // Store in Generation table with AB test metadata
            await db.from("Generation").insert({
              id: genId,
              userId: session.user.id,
              sceneId: scene.id,
              prompt,
              imageUrl,
              status: "COMPLETED",
              model: model.modelId,
              provider: model.provider,
              durationMs,
              metadata: {
                abTestRunId: testRunId,
                abTestModelName: model.name,
                abTestPromptIndex: pi,
                abTestVariationIndex: vi,
                isAbTest: true,
              },
              createdAt: new Date().toISOString(),
            });

            results.push({
              id: genId,
              modelId: model.modelId,
              modelName: model.name,
              provider: model.provider,
              prompt,
              promptIndex: pi,
              imageUrl,
              durationMs,
              variationIndex: vi,
            });
          } catch (err: any) {
            console.error(
              `[AB_TEST] Error generating for ${model.name}:`,
              err.message
            );
            results.push({
              id: genId,
              modelId: model.modelId,
              modelName: model.name,
              provider: model.provider,
              prompt,
              promptIndex: pi,
              imageUrl: "",
              durationMs: 0,
              variationIndex: vi,
              error: err.message,
            });
          }
        }
      }
    }

    return NextResponse.json({
      testRunId,
      sceneId: scene.id,
      sceneLabel: scene.label,
      models: models.map((m) => m.name),
      totalImages: results.length,
      results,
    });
  } catch (error) {
    console.error("[AB_TEST_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const sceneId = searchParams.get("sceneId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Fetch all AB test generations
    let query = db
      .from("Generation")
      .select("*")
      .not("metadata->abTestRunId", "is", null)
      .order("createdAt", { ascending: false })
      .range(skip, skip + limit - 1);

    if (sceneId) {
      query = query.eq("sceneId", sceneId);
    }

    const { data: generations, error } = await query;

    if (error) {
      throw error;
    }

    // Group by test run
    const testRuns: Record<string, any> = {};
    for (const gen of generations || []) {
      const runId = gen.metadata?.abTestRunId;
      if (!runId) continue;

      if (!testRuns[runId]) {
        testRuns[runId] = {
          testRunId: runId,
          sceneId: gen.sceneId,
          createdAt: gen.createdAt,
          models: new Set<string>(),
          results: [],
          totalImages: 0,
        };
      }

      testRuns[runId].models.add(gen.metadata?.abTestModelName || gen.model);
      testRuns[runId].totalImages++;
      testRuns[runId].results.push({
        id: gen.id,
        modelId: gen.model,
        modelName: gen.metadata?.abTestModelName || gen.model,
        provider: gen.provider,
        prompt: gen.prompt,
        promptIndex: gen.metadata?.abTestPromptIndex ?? 0,
        imageUrl: gen.imageUrl,
        durationMs: gen.durationMs,
        variationIndex: gen.metadata?.abTestVariationIndex ?? 0,
        rating: gen.metadata?.abTestRating ?? null,
        createdAt: gen.createdAt,
      });
    }

    // Convert Sets to arrays
    const runs = Object.values(testRuns).map((run: any) => ({
      ...run,
      models: Array.from(run.models),
    }));

    return NextResponse.json({ testRuns: runs, page, limit });
  } catch (error) {
    console.error("[AB_TEST_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Rate an AB test image
export async function PATCH(req: Request) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { generationId, rating } = body;

    if (!generationId || !["up", "down", null].includes(rating)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Fetch existing metadata
    const { data: gen, error: fetchError } = await db
      .from("Generation")
      .select("metadata")
      .eq("id", generationId)
      .single();

    if (fetchError || !gen) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    const updatedMetadata = {
      ...(gen.metadata || {}),
      abTestRating: rating,
      abTestRatedAt: new Date().toISOString(),
      abTestRatedBy: session.user.id,
    };

    const { error: updateError } = await db
      .from("Generation")
      .update({ metadata: updatedMetadata })
      .eq("id", generationId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, rating });
  } catch (error) {
    console.error("[AB_TEST_PATCH_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
