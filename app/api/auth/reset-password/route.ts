import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db, generateId } from "@/lib/db";
import crypto from "crypto";

const requestSchema = z.object({
  email: z.string().email(),
});

const resetSchema = z.object({
  token: z.string(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// POST with email → send reset link
// POST with token + password → reset password
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // If token is provided, reset the password
    if (body.token) {
      const parsed = resetSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0].message },
          { status: 400 }
        );
      }

      const { token, password } = parsed.data;

      // Find the verification token
      const { data: tokenRecord } = await db
        .from("VerificationToken")
        .select("*")
        .eq("token", token)
        .single();

      if (!tokenRecord) {
        return NextResponse.json(
          { error: "Invalid or expired reset link" },
          { status: 400 }
        );
      }

      // Check expiry
      if (new Date(tokenRecord.expires) < new Date()) {
        // Delete expired token
        await db.from("VerificationToken").delete().eq("token", token);
        return NextResponse.json(
          { error: "Reset link has expired. Please request a new one." },
          { status: 400 }
        );
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(password, 12);

      // Update user password
      await db
        .from("User")
        .update({ passwordHash, updatedAt: new Date().toISOString() })
        .eq("email", tokenRecord.identifier);

      // Delete used token
      await db.from("VerificationToken").delete().eq("token", token);

      return NextResponse.json({ message: "Password reset successfully" });
    }

    // Otherwise, send reset email
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Check if user exists
    const { data: user } = await db
      .from("User")
      .select("id, email, name")
      .eq("email", email)
      .single();

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: "If an account exists with that email, a reset link has been sent.",
      });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    // Store token
    await db.from("VerificationToken").insert({
      identifier: email,
      token,
      expires,
    });

    // Send reset email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://letmeflex.ai";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: `letmeflex.ai <${process.env.RESEND_FROM_EMAIL || "noreply@letmeflex.ai"}>`,
        to: email,
        subject: "Reset your password — letmeflex.ai",
        html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0C0C0E;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 24px;">
  <h1 style="color:#F9CA1F;font-size:28px;text-align:center;">letmeflex.ai</h1>
  <div style="width:60px;height:2px;background:linear-gradient(90deg,transparent,#F9CA1F,transparent);margin:12px auto 32px;"></div>
  <h2 style="color:#FFFFFF;font-size:20px;">Reset your password</h2>
  <p style="color:#8A8A95;font-size:15px;line-height:1.6;">
    Click the button below to reset your password. This link expires in 1 hour.
  </p>
  <div style="text-align:center;margin:32px 0;">
    <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:#F9CA1F;color:#000;text-decoration:none;border-radius:9999px;font-weight:700;font-size:14px;">RESET PASSWORD</a>
  </div>
  <p style="color:#4A4A55;font-size:12px;text-align:center;">If you didn't request this, ignore this email.</p>
</div>
</body>
</html>`,
      });
    } catch (emailErr: any) {
      console.error("[RESET_EMAIL_ERROR]", emailErr?.message);
      // Still return success to prevent enumeration
    }

    return NextResponse.json({
      message: "If an account exists with that email, a reset link has been sent.",
    });
  } catch (error: any) {
    console.error("[RESET_PASSWORD_ERROR]", error?.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
