import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [referralCountResult, referralCreditsResult] = await Promise.all([
      db
        .from("User")
        .select("*", { count: "exact", head: true })
        .eq("referredById", session.user.id),
      db
        .from("CreditLog")
        .select("amount")
        .eq("userId", session.user.id)
        .eq("reason", "referral_bonus"),
    ]);

    const totalReferrals = referralCountResult.count ?? 0;

    // Sum up the amounts in JS
    const creditsEarned = (referralCreditsResult.data || []).reduce(
      (sum: number, log: { amount: number }) => sum + (log.amount || 0),
      0
    );

    return NextResponse.json({
      totalReferrals,
      creditsEarned,
    });
  } catch (error) {
    console.error("Error fetching referral stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
