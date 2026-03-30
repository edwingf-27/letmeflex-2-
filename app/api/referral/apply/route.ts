import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const referralSchema = z.object({
  referralCode: z.string().min(1, "Referral code is required"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = referralSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { referralCode } = parsed.data;

    const referrer = await prisma.user.findUnique({
      where: { referralCode },
      select: { id: true, name: true },
    });

    if (!referrer) {
      return NextResponse.json(
        { valid: false, error: "Invalid referral code" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      referrerName: referrer.name,
    });
  } catch (error) {
    console.error("[REFERRAL_APPLY_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
