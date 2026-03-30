import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";
    const category = searchParams.get("category");

    const where: any = {
      userId: session.user.id,
      deleted: false,
    };

    if (category && category !== "all") {
      where.category = category;
    }

    const generations = await prisma.generation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: all ? 100 : 8,
      select: {
        id: true,
        category: true,
        subcategory: true,
        imageUrl: true,
        thumbnailUrl: true,
        status: true,
        creditsUsed: true,
        isFaceSwap: true,
        createdAt: true,
      },
    });

    return NextResponse.json(generations);
  } catch (error) {
    console.error("Error fetching generations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
