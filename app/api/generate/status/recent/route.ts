import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";
    const category = searchParams.get("category");

    let query = db
      .from("Generation")
      .select("id, category, subcategory, imageUrl, status, creditsUsed, isFaceSwap, variationCount, createdAt")
      .eq("userId", session.user.id)
      .eq("deleted", false)
      .eq("status", "COMPLETED")
      .order("createdAt", { ascending: false })
      .limit(all ? 100 : 8);

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    const { data: generations, error } = await query;

    if (error || !generations) {
      console.error("Error fetching generations:", error?.message);
      return NextResponse.json([], { status: 200 });
    }

    // For generations with multiple variations, fetch all GenerationImage rows
    const genIds = generations
      .filter((g: any) => (g.variationCount || 1) > 1)
      .map((g: any) => g.id);

    let imageMap: Record<string, any[]> = {};

    if (genIds.length > 0) {
      const { data: images } = await db
        .from("GenerationImage")
        .select("id, generationId, imageUrl, variationIndex")
        .in("generationId", genIds)
        .order("variationIndex", { ascending: true });

      if (images) {
        for (const img of images) {
          if (!imageMap[img.generationId]) imageMap[img.generationId] = [];
          imageMap[img.generationId].push(img);
        }
      }
    }

    // Expand: each variation becomes its own gallery item
    const result: any[] = [];
    for (const gen of generations) {
      const variations = imageMap[gen.id];
      if (variations && variations.length > 0) {
        for (const v of variations) {
          result.push({
            id: `${gen.id}-${v.variationIndex}`,
            category: gen.category,
            subcategory: gen.subcategory,
            imageUrl: v.imageUrl,
            createdAt: gen.createdAt,
            isFaceSwap: gen.isFaceSwap,
          });
        }
      } else if (gen.imageUrl) {
        result.push({
          id: gen.id,
          category: gen.category,
          subcategory: gen.subcategory,
          imageUrl: gen.imageUrl,
          createdAt: gen.createdAt,
          isFaceSwap: gen.isFaceSwap,
        });
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching generations:", error?.message);
    return NextResponse.json([], { status: 200 });
  }
}
