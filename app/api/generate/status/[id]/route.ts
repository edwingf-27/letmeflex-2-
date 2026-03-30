import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: generation, error } = await db
      .from("Generation")
      .select(
        "id, status, imageUrl, userId, category, subcategory, createdAt, modelUsed, variationCount, mode, sourceImageUrl, creditsUsed"
      )
      .eq("id", params.id)
      .single();

    if (error || !generation) {
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 }
      );
    }

    if (generation.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch associated GenerationImage rows
    const { data: images } = await db
      .from("GenerationImage")
      .select("id, imageUrl, variationIndex, seed")
      .eq("generationId", params.id)
      .order("variationIndex");

    return NextResponse.json({
      id: generation.id,
      status: generation.status,
      imageUrl: generation.imageUrl,
      category: generation.category,
      subcategory: generation.subcategory,
      createdAt: generation.createdAt,
      modelUsed: generation.modelUsed,
      variationCount: generation.variationCount ?? 1,
      mode: generation.mode ?? "generate",
      sourceImageUrl: generation.sourceImageUrl ?? null,
      creditsUsed: generation.creditsUsed ?? 1,
      images: images || [],
    });
  } catch (error: any) {
    console.error("[GENERATION_STATUS_ERROR]", error?.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
