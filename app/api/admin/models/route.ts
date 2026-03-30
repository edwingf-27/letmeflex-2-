import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function GET() {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const models = await prisma.modelConfig.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ models });
  } catch (error) {
    console.error("[ADMIN_MODELS_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const createModelSchema = z.object({
  name: z.string().min(1),
  provider: z.string().min(1),
  modelId: z.string().min(1),
  isActive: z.boolean().default(false),
  isDefault: z.boolean().default(false),
  costPerGen: z.number().min(0),
  avgSeconds: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createModelSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // If this is being set as default, unset existing defaults
    if (data.isDefault) {
      await prisma.modelConfig.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const model = await prisma.modelConfig.create({ data });

    return NextResponse.json({ model }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN_MODELS_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const updateModelSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  provider: z.string().min(1).optional(),
  modelId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  costPerGen: z.number().min(0).optional(),
  avgSeconds: z.number().int().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(req: Request) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateModelSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { id, ...updateData } = parsed.data;

    // If setting as default, ensure only one default
    if (updateData.isDefault === true) {
      await prisma.modelConfig.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const model = await prisma.modelConfig.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ model });
  } catch (error) {
    console.error("[ADMIN_MODELS_PATCH_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Model ID is required" },
        { status: 400 }
      );
    }

    await prisma.modelConfig.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_MODELS_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
