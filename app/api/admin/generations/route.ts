import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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
    const skip = (page - 1) * limit;

    let query = db
      .from("Generation")
      .select("*, user:User!userId(email, name)")
      .order("createdAt", { ascending: false })
      .range(skip, skip + limit - 1);

    let countQuery = db
      .from("Generation")
      .select("*", { count: "exact", head: true });

    if (status) {
      query = query.eq("status", status);
      countQuery = countQuery.eq("status", status);
    }
    if (category) {
      query = query.eq("category", category);
      countQuery = countQuery.eq("category", category);
    }

    const [generationsResult, countResult] = await Promise.all([
      query,
      countQuery,
    ]);

    const generations = generationsResult.data || [];
    const total = countResult.count ?? 0;

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
      await db
        .from("Generation")
        .update({ deleted: true, imageUrl: null })
        .eq("id", id);

      // Optionally delete from storage
      try {
        const { deleteGeneratedImage } = await import("@/lib/supabase");
        const { data: gen } = await db
          .from("Generation")
          .select("userId, id")
          .eq("id", id)
          .single();
        if (gen) {
          await deleteGeneratedImage(gen.userId, gen.id);
        }
      } catch {
        // Non-critical
      }

      return NextResponse.json({ success: true });
    }

    if (action === "flag") {
      await db
        .from("Generation")
        .update({
          metadata: {
            flagged: true,
            flaggedAt: new Date().toISOString(),
            flaggedBy: session.user.id,
          },
        })
        .eq("id", id);
      return NextResponse.json({ success: true });
    }

    if (action === "unflag") {
      await db
        .from("Generation")
        .update({
          metadata: {
            flagged: false,
          },
        })
        .eq("id", id);
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
