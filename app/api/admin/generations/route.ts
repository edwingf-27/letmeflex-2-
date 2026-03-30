import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const [generations, total] = await Promise.all([
      prisma.generation.findMany({
        where,
        include: {
          user: { select: { email: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.generation.count({ where }),
    ]);

    return NextResponse.json({
      generations,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Admin generations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, action } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing generation id" }, { status: 400 });
    }

    if (action === "delete") {
      await prisma.generation.update({
        where: { id },
        data: { deleted: true, imageUrl: null },
      });

      // Optionally delete from storage
      try {
        const { deleteGeneratedImage } = await import("@/lib/supabase");
        const gen = await prisma.generation.findUnique({ where: { id } });
        if (gen) {
          await deleteGeneratedImage(gen.userId, gen.id);
        }
      } catch {
        // Non-critical
      }

      return NextResponse.json({ success: true });
    }

    if (action === "flag") {
      await prisma.generation.update({
        where: { id },
        data: {
          metadata: {
            flagged: true,
            flaggedAt: new Date().toISOString(),
            flaggedBy: session.user.id,
          },
        },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "unflag") {
      await prisma.generation.update({
        where: { id },
        data: {
          metadata: {
            flagged: false,
          },
        },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Admin generation patch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
