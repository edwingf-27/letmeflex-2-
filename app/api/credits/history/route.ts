import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const [logsResult, countResult] = await Promise.all([
      db
        .from("CreditLog")
        .select("*")
        .eq("userId", session.user.id)
        .order("createdAt", { ascending: false })
        .range(skip, skip + limit - 1),
      db
        .from("CreditLog")
        .select("*", { count: "exact", head: true })
        .eq("userId", session.user.id),
    ]);

    const logs = logsResult.data || [];
    const total = countResult.count ?? 0;

    return NextResponse.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching credit history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
