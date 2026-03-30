import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [totalReferrals, referralCredits] = await Promise.all([
      prisma.user.count({
        where: { referredById: session.user.id },
      }),
      prisma.creditLog.aggregate({
        where: {
          userId: session.user.id,
          reason: "referral_bonus",
        },
        _sum: { amount: true },
      }),
    ]);

    return NextResponse.json({
      totalReferrals,
      creditsEarned: referralCredits._sum.amount || 0,
    });
  } catch (error) {
    console.error("Error fetching referral stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
