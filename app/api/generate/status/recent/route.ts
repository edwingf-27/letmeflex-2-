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
      .select("id, category, subcategory, imageUrl, thumbnailUrl, status, creditsUsed, isFaceSwap, createdAt")
      .eq("userId", session.user.id)
      .eq("deleted", false)
      .order("createdAt", { ascending: false })
      .limit(all ? 100 : 8);

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    const { data: generations, error } = await query;

    if (error) {
      console.error("Error fetching generations:", error.message);
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(generations || []);
  } catch (error: any) {
    console.error("Error fetching generations:", error?.message);
    return NextResponse.json([], { status: 200 });
  }
}
