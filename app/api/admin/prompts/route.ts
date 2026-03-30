import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, generateId } from "@/lib/db";

async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

// GET — list prompt templates with pagination and filters
export async function GET(req: NextRequest) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;

    let query = db.from("PromptTemplate").select("*", { count: "exact" });

    if (category) query = query.eq("category", category);
    if (status) query = query.eq("status", status);
    if (source) query = query.eq("source", source);

    query = query
      .order("createdAt", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: templates, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      templates: templates || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("[ADMIN_PROMPTS_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST — create a new prompt template
export async function POST(req: NextRequest) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { category, subcategory, shot, promptText, negativePrompt } = body;

    if (!category || !promptText) {
      return NextResponse.json(
        { error: "Category and promptText are required" },
        { status: 400 }
      );
    }

    const id = generateId();
    const now = new Date().toISOString();

    const { data, error } = await db.from("PromptTemplate").insert({
      id,
      category,
      subcategory: subcategory || null,
      shot: shot || null,
      promptText,
      negativePrompt: negativePrompt || null,
      source: "manual",
      status: "draft",
      createdBy: session.user.id,
      usageCount: 0,
      rating: null,
      createdAt: now,
      updatedAt: now,
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ template: data });
  } catch (error) {
    console.error("[ADMIN_PROMPTS_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH — actions: approve, reject, update, rate
export async function PATCH(req: NextRequest) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, action, ...data } = body;

    if (!id || !action) {
      return NextResponse.json(
        { error: "id and action are required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    let updateData: Record<string, any> = { updatedAt: now };

    switch (action) {
      case "approve":
        updateData.status = "approved";
        updateData.approvedBy = session.user.id;
        break;
      case "reject":
        updateData.status = "rejected";
        break;
      case "update":
        if (data.promptText) updateData.promptText = data.promptText;
        if (data.negativePrompt !== undefined)
          updateData.negativePrompt = data.negativePrompt;
        if (data.category) updateData.category = data.category;
        if (data.subcategory !== undefined)
          updateData.subcategory = data.subcategory;
        if (data.shot !== undefined) updateData.shot = data.shot;
        break;
      case "rate":
        if (typeof data.rating === "number") {
          updateData.rating = Math.min(5, Math.max(0, data.rating));
        }
        break;
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    const { data: updated, error } = await db
      .from("PromptTemplate")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ template: updated });
  } catch (error) {
    console.error("[ADMIN_PROMPTS_PATCH_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE — delete a prompt template
export async function DELETE(req: NextRequest) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await db.from("PromptTemplate").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_PROMPTS_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
