import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db, generateId } from "@/lib/db";

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
    const { data: existing } = await db
      .from("User")
      .select("id")
      .eq("email", email)
      .single();

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
      const { data } = await db
        .from("User")
        .select("id, email, credits")
        .eq("referralCode", referralCode)
        .single();
      referrer = data;
    }

    const userId = generateId();
    const referralCodeNew = generateId();
    const initialCredits = referrer ? 5 : 3;

    // Create user
    const { data: newUser, error: createError } = await db
      .from("User")
      .insert({
        id: userId,
        name,
        email,
        passwordHash,
        credits: initialCredits,
        referralCode: referralCodeNew,
        referredById: referrer?.id || null,
        role: "USER",
        plan: "FREE",
        updatedAt: new Date().toISOString(),
      })
      .select("id, name, email, credits, plan")
      .single();

    if (createError) {
      console.error("[REGISTER_DB_ERROR]", createError.message);
      return NextResponse.json(
        { error: "Failed to create account: " + createError.message },
        { status: 500 }
      );
    }

    // Log signup bonus credits
    await db.from("CreditLog").insert({
      id: generateId(),
      userId,
      amount: 3,
      reason: "signup_bonus",
    });

    // Handle referral bonuses
    if (referrer) {
      // +2 bonus for new user
      await db.from("CreditLog").insert({
        id: generateId(),
        userId,
        amount: 2,
        reason: "referral_bonus_new_user",
        referenceId: referrer.id,
      });

      // +5 for referrer
      await db
        .from("User")
        .update({ credits: referrer.credits + 5 })
        .eq("id", referrer.id);

      await db.from("CreditLog").insert({
        id: generateId(),
        userId: referrer.id,
        amount: 5,
        reason: "referral_bonus_referrer",
        referenceId: userId,
      });

      // Send referral email (fire and forget)
      try {
        const { sendReferralBonusEmail } = await import("@/lib/resend");
        sendReferralBonusEmail(referrer.email, 5).catch(() => {});
      } catch {}
    }

    return NextResponse.json({ user: newUser });
  } catch (error: any) {
    console.error("[REGISTER_ERROR]", error?.message || error);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}
