import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Run all queries in parallel
    const [
      totalUsersResult,
      totalGenerationsResult,
      todayGenerationsResult,
      weekGenerationsResult,
      revenueOrders,
      activeSubUsers,
      weekGenerationsData,
      thirtyDayOrders,
      thirtyDayUsers,
      mrrOrders,
    ] = await Promise.all([
      // Total users
      db.from("User").select("*", { count: "exact", head: true }),

      // Total completed generations
      db.from("Generation").select("*", { count: "exact", head: true }).eq("status", "COMPLETED"),

      // Today's generations
      db.from("Generation").select("*", { count: "exact", head: true })
        .eq("status", "COMPLETED")
        .gte("createdAt", todayStart.toISOString()),

      // This week's generations
      db.from("Generation").select("*", { count: "exact", head: true })
        .eq("status", "COMPLETED")
        .gte("createdAt", weekStart.toISOString()),

      // Total revenue (all completed orders)
      db.from("Order").select("amount").eq("status", "COMPLETED"),

      // Active subscriptions by plan
      db.from("User").select("plan")
        .neq("plan", "FREE")
        .eq("subscriptionStatus", "active"),

      // Generations from last 7 days (for daily chart)
      db.from("Generation").select("createdAt")
        .eq("status", "COMPLETED")
        .gte("createdAt", weekStart.toISOString()),

      // Orders from last 30 days (for daily revenue chart)
      db.from("Order").select("createdAt, amount")
        .eq("status", "COMPLETED")
        .gte("createdAt", thirtyDaysAgo.toISOString()),

      // Users from last 30 days (for daily signups chart)
      db.from("User").select("createdAt")
        .gte("createdAt", thirtyDaysAgo.toISOString()),

      // MRR: subscription orders this month
      db.from("Order").select("amount")
        .eq("status", "COMPLETED")
        .eq("type", "SUBSCRIPTION")
        .gte("createdAt", monthStart.toISOString()),
    ]);

    const totalUsers = totalUsersResult.count ?? 0;
    const totalGenerations = totalGenerationsResult.count ?? 0;
    const todayGenerations = todayGenerationsResult.count ?? 0;
    const weekGenerations = weekGenerationsResult.count ?? 0;

    // Sum revenue
    const totalRevenue = (revenueOrders.data || []).reduce(
      (sum: number, o: any) => sum + (o.amount || 0), 0
    ) / 100;

    // MRR
    const mrr = (mrrOrders.data || []).reduce(
      (sum: number, o: any) => sum + (o.amount || 0), 0
    ) / 100;

    // Active subscriptions grouped by plan
    const subscriptionsByPlan: Record<string, number> = {};
    for (const u of (activeSubUsers.data || [])) {
      subscriptionsByPlan[u.plan] = (subscriptionsByPlan[u.plan] || 0) + 1;
    }

    // Aggregate daily generations
    const dailyGenMap: Record<string, number> = {};
    for (const g of (weekGenerationsData.data || [])) {
      const date = g.createdAt.substring(0, 10);
      dailyGenMap[date] = (dailyGenMap[date] || 0) + 1;
    }
    const dailyGenerations = Object.entries(dailyGenMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Aggregate daily revenue
    const dailyRevMap: Record<string, number> = {};
    for (const o of (thirtyDayOrders.data || [])) {
      const date = o.createdAt.substring(0, 10);
      dailyRevMap[date] = (dailyRevMap[date] || 0) + (o.amount || 0);
    }
    const dailyRevenue = Object.entries(dailyRevMap)
      .map(([date, total]) => ({ date, total: total / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Aggregate daily signups
    const dailySignupMap: Record<string, number> = {};
    for (const u of (thirtyDayUsers.data || [])) {
      const date = u.createdAt.substring(0, 10);
      dailySignupMap[date] = (dailySignupMap[date] || 0) + 1;
    }
    const dailySignups = Object.entries(dailySignupMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Revenue today and this month
    const todayRevenue = (thirtyDayOrders.data || [])
      .filter((o: any) => o.createdAt >= todayStart.toISOString())
      .reduce((sum: number, o: any) => sum + (o.amount || 0), 0) / 100;

    const monthRevenue = (thirtyDayOrders.data || [])
      .filter((o: any) => o.createdAt >= monthStart.toISOString())
      .reduce((sum: number, o: any) => sum + (o.amount || 0), 0) / 100;

    // User growth (% change vs previous week)
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const thisWeekSignups = (thirtyDayUsers.data || [])
      .filter((u: any) => u.createdAt >= weekStart.toISOString()).length;
    const prevWeekSignups = (thirtyDayUsers.data || [])
      .filter((u: any) => u.createdAt >= prevWeekStart.toISOString() && u.createdAt < weekStart.toISOString()).length;
    const userGrowth = prevWeekSignups > 0 ? ((thisWeekSignups - prevWeekSignups) / prevWeekSignups) * 100 : thisWeekSignups > 0 ? 100 : 0;

    // Subscriptions with defaults for all plans
    const subscriptions = {
      FREE: 0,
      STARTER: subscriptionsByPlan["STARTER"] || 0,
      PRO: subscriptionsByPlan["PRO"] || 0,
      UNLIMITED: subscriptionsByPlan["UNLIMITED"] || 0,
    };

    // Normalize dailyRevenue to use "amount" key
    const dailyRevenueNormalized = dailyRevenue.map((d) => ({
      date: d.date,
      amount: d.total,
    }));

    return NextResponse.json({
      totalUsers,
      userGrowth,
      totalGenerations,
      generationsToday: todayGenerations,
      generationsWeek: weekGenerations,
      totalRevenue,
      mrr,
      revenueToday: todayRevenue,
      revenueMonth: monthRevenue,
      subscriptions,
      activeSubscriptions: subscriptionsByPlan,
      dailyGenerations,
      dailyRevenue: dailyRevenueNormalized,
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
