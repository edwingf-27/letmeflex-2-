import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, generateId } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || searchParams.get("q") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || searchParams.get("pageSize") || "20", 10))
    );
    const skip = (page - 1) * limit;

    // Build query
    let usersQuery = db
      .from("User")
      .select("id, name, email, image, role, credits, plan, subscriptionStatus, referralCode, createdAt")
      .order("createdAt", { ascending: false })
      .range(skip, skip + limit - 1);

    let countQuery = db
      .from("User")
      .select("*", { count: "exact", head: true });

    if (search) {
      usersQuery = usersQuery.or(
        `email.ilike.%${search}%,name.ilike.%${search}%`
      );
      countQuery = countQuery.or(
        `email.ilike.%${search}%,name.ilike.%${search}%`
      );
    }

    const [usersResult, countResult] = await Promise.all([
      usersQuery,
      countQuery,
    ]);

    const users = usersResult.data || [];
    const total = countResult.count ?? 0;

    // Get generation counts for these users
    const userIds = users.map((u: any) => u.id);
    let generationCounts: Record<string, number> = {};

    if (userIds.length > 0) {
      const { data: genData } = await db
        .from("Generation")
        .select("userId")
        .in("userId", userIds);

      if (genData) {
        for (const g of genData) {
          generationCounts[g.userId] = (generationCounts[g.userId] || 0) + 1;
        }
      }
    }

    return NextResponse.json({
      users: users.map((u: any) => ({
        ...u,
        generationCount: generationCounts[u.id] || 0,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[ADMIN_USERS_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const updateUserSchema = z.object({
  userId: z.string(),
  credits: z.number().int().min(0).optional(),
  plan: z.enum(["FREE", "STARTER", "PRO", "UNLIMITED"]).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
});

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Normalize: frontend may send { userId, action, plan } or { userId, credits, plan }
    const normalized = {
      userId: body.userId,
      credits: body.credits,
      plan: body.plan,
      role: body.role,
    };

    const parsed = updateUserSchema.safeParse(normalized);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { userId, credits, plan, role } = parsed.data;

    const updateData: Record<string, unknown> = {};
    if (credits !== undefined) updateData.credits = credits;
    if (plan !== undefined) updateData.plan = plan;
    if (role !== undefined) updateData.role = role;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // If credits are being changed, log the delta before updating
    let creditDelta = 0;
    if (credits !== undefined) {
      const { data: currentUser } = await db
        .from("User")
        .select("credits")
        .eq("id", userId)
        .single();
      creditDelta = credits - (currentUser?.credits || 0);
    }

    const { data: updatedUser, error: updateError } = await db
      .from("User")
      .update(updateData)
      .eq("id", userId)
      .select("id, name, email, role, credits, plan")
      .single();

    if (updateError) {
      console.error("[ADMIN_USERS_UPDATE_ERROR]", updateError);
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 }
      );
    }

    if (credits !== undefined && creditDelta !== 0) {
      await db.from("CreditLog").insert({
        id: generateId(),
        userId,
        amount: creditDelta,
        reason: "admin_adjustment",
        referenceId: session.user.id,
      });
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("[ADMIN_USERS_PATCH_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
