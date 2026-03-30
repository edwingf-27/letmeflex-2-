import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, generateId } from "@/lib/db";
import { generateAIPrompts } from "@/lib/image-gen/prompts/ai-generator";

async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

// POST — generate AI prompts and save as draft templates
export async function POST(req: NextRequest) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      category,
      subcategory,
      shot,
      count = 3,
      basePrompt,
    } = body;

    if (!category) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }

    const clampedCount = Math.min(10, Math.max(1, count));

    // Generate AI prompts
    const generated = await generateAIPrompts({
      category,
      subcategory,
      shot,
      count: clampedCount,
      basePrompt,
    });

    if (generated.length === 0) {
      return NextResponse.json(
        { error: "AI generation failed. Check API keys." },
        { status: 500 }
      );
    }

    // Insert each into PromptTemplate
    const now = new Date().toISOString();
    const templates = generated.map((item) => ({
      id: generateId(),
      category,
      subcategory: subcategory || null,
      shot: shot || null,
      promptText: item.promptText,
      negativePrompt: item.negativePrompt,
      source: "ai_generated",
      status: "draft",
      createdBy: session.user.id,
      usageCount: 0,
      rating: null,
      createdAt: now,
      updatedAt: now,
    }));

    const { data, error } = await db
      .from("PromptTemplate")
      .insert(templates)
      .select();

    if (error) throw error;

    return NextResponse.json({ templates: data || [] });
  } catch (error) {
    console.error("[ADMIN_PROMPTS_GENERATE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
