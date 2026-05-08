import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const [ordersResult, countResult] = await Promise.all([
      db
        .from("Order")
        .select("*, user:User!userId(email, name)")
        .order("createdAt", { ascending: false })
        .range(skip, skip + limit - 1),
      db
        .from("Order")
        .select("*", { count: "exact", head: true }),
    ]);

    const orders = ordersResult.data || [];
    const total = countResult.count ?? 0;

    return NextResponse.json({
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Admin orders error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
