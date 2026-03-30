import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Run all queries in parallel
    const [
      totalUsers,
      totalGenerations,
      todayGenerations,
      weekGenerations,
      revenueResult,
      activeSubscriptions,
      dailyGenerationsRaw,
      dailyRevenueRaw,
      dailySignupsRaw,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),

      // Total generations
      prisma.generation.count({ where: { status: "COMPLETED" } }),

      // Today's generations
      prisma.generation.count({
        where: {
          status: "COMPLETED",
          createdAt: { gte: todayStart },
        },
      }),

      // This week's generations
      prisma.generation.count({
        where: {
          status: "COMPLETED",
          createdAt: { gte: weekStart },
        },
      }),

      // Total revenue (sum of completed orders)
      prisma.order.aggregate({
        _sum: { amount: true },
        where: { status: "COMPLETED" },
      }),

      // Active subscriptions by plan
      prisma.user.groupBy({
        by: ["plan"],
        _count: true,
        where: {
          plan: { not: "FREE" },
          subscriptionStatus: "active",
        },
      }),

      // Daily generations (last 7 days)
      prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM "Generation"
        WHERE status = 'COMPLETED' AND created_at >= ${weekStart}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,

      // Daily revenue (last 30 days)
      prisma.$queryRaw<{ date: string; total: bigint }[]>`
        SELECT DATE(created_at) as date, SUM(amount) as total
        FROM "Order"
        WHERE status = 'COMPLETED' AND created_at >= ${thirtyDaysAgo}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,

      // Daily signups (last 30 days)
      prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM "User"
        WHERE created_at >= ${thirtyDaysAgo}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
    ]);

    // Calculate MRR from active subscriptions
    const mrrResult = await prisma.order.aggregate({
      _sum: { amount: true },
      where: {
        status: "COMPLETED",
        type: "SUBSCRIPTION",
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), 1),
        },
      },
    });

    const totalRevenue = (revenueResult._sum.amount || 0) / 100; // Convert cents to dollars
    const mrr = (mrrResult._sum.amount || 0) / 100;

    // Format daily data, converting BigInt to Number
    const dailyGenerations = dailyGenerationsRaw.map((d) => ({
      date: String(d.date),
      count: Number(d.count),
    }));

    const dailyRevenue = dailyRevenueRaw.map((d) => ({
      date: String(d.date),
      total: Number(d.total) / 100,
    }));

    const dailySignups = dailySignupsRaw.map((d) => ({
      date: String(d.date),
      count: Number(d.count),
    }));

    const subscriptionsByPlan = Object.fromEntries(
      activeSubscriptions.map((s) => [s.plan, s._count])
    );

    return NextResponse.json({
      totalUsers,
      totalGenerations,
      todayGenerations,
      weekGenerations,
      totalRevenue,
      mrr,
      activeSubscriptions: subscriptionsByPlan,
      dailyGenerations,
      dailyRevenue,
      dailySignups,
    });
  } catch (error) {
    console.error("[ADMIN_STATS_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
