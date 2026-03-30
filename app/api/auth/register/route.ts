import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendReferralBonusEmail } from "@/lib/resend";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  referralCode: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password, referralCode } = parsed.data;

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Find referrer if referral code provided
    let referrer: { id: string; email: string; credits: number } | null = null;
    if (referralCode) {
      referrer = await prisma.user.findUnique({
        where: { referralCode },
        select: { id: true, email: true, credits: true },
      });
    }

    // Create user with transaction to handle referral atomically
    const user = await prisma.$transaction(async (tx) => {
      // Determine initial credits: 3 (signup bonus) + 2 if referred
      const initialCredits = referrer ? 5 : 3;

      const newUser = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          credits: initialCredits,
          referredById: referrer?.id || undefined,
        },
      });

      // Log signup bonus credits
      await tx.creditLog.create({
        data: {
          userId: newUser.id,
          amount: 3,
          reason: "signup_bonus",
        },
      });

      // Handle referral bonuses
      if (referrer) {
        // Award +2 bonus credits to new user
        await tx.creditLog.create({
          data: {
            userId: newUser.id,
            amount: 2,
            reason: "referral_bonus_new_user",
            referenceId: referrer.id,
          },
        });

        // Award +5 credits to referrer
        await tx.user.update({
          where: { id: referrer.id },
          data: { credits: { increment: 5 } },
        });

        await tx.creditLog.create({
          data: {
            userId: referrer.id,
            amount: 5,
            reason: "referral_bonus_referrer",
            referenceId: newUser.id,
          },
        });
      }

      return newUser;
    });

    // Send referral email to referrer (fire and forget)
    if (referrer) {
      sendReferralBonusEmail(referrer.email, 5).catch(() => {});
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        credits: user.credits,
        plan: user.plan,
      },
    });
  } catch (error) {
    console.error("[REGISTER_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
