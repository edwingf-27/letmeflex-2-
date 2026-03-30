import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const generation = await prisma.generation.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        imageUrl: true,
        userId: true,
        category: true,
        subcategory: true,
        createdAt: true,
        modelUsed: true,
      },
    });

    if (!generation) {
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (generation.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      id: generation.id,
      status: generation.status,
      imageUrl: generation.imageUrl,
      category: generation.category,
      subcategory: generation.subcategory,
      createdAt: generation.createdAt,
      modelUsed: generation.modelUsed,
    });
  } catch (error) {
    console.error("[GENERATION_STATUS_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
