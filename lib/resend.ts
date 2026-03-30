import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY || "re_placeholder");
}

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "noreply@letmeflex.ai";
const APP_NAME = "letmeflex.ai";

export async function sendWelcomeEmail(email: string, name?: string) {
  await getResend().emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: email,
    subject: "Welcome to letmeflex.ai 🔥",
    html: welcomeEmailHtml(name || "there"),
  });
}

export async function sendGenerationCompleteEmail(
  email: string,
  imageUrl: string,
  category: string
) {
  await getResend().emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: email,
    subject: "Your flex is ready 🔥",
    html: generationCompleteHtml(imageUrl, category),
  });
}

export async function sendReferralBonusEmail(
  email: string,
  creditsEarned: number
) {
  await getResend().emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: email,
    subject: `You earned ${creditsEarned} credits! 💰`,
    html: referralBonusHtml(creditsEarned),
  });
}

export async function sendLowCreditsEmail(
  email: string,
  creditsRemaining: number
) {
  await getResend().emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: email,
    subject: "You're running low on credits",
    html: lowCreditsHtml(creditsRemaining),
  });
}

export async function sendPaymentConfirmationEmail(
  email: string,
  amount: string,
  creditsAdded: number,
  newBalance: number
) {
  await getResend().emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: email,
    subject: "Payment confirmed — credits added",
    html: paymentConfirmationHtml(amount, creditsAdded, newBalance),
  });
}

export async function sendPaymentFailedEmail(email: string) {
  await getResend().emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: email,
    subject: "Action required: payment failed",
    html: paymentFailedHtml(),
  });
}

function emailWrapper(content: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://letmeflex.ai";
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0C0C0E;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 24px;">
  <div style="text-align:center;margin-bottom:32px;">
    <h1 style="color:#F9CA1F;font-size:28px;margin:0;letter-spacing:0.02em;">letmeflex.ai</h1>
    <div style="width:60px;height:2px;background:linear-gradient(90deg,transparent,#F9CA1F,transparent);margin:12px auto;"></div>
  </div>
  ${content}
  <div style="text-align:center;margin-top:40px;padding-top:24px;border-top:1px solid #2A2A2E;">
    <p style="color:#4A4A55;font-size:12px;margin:0;">
      <a href="${appUrl}" style="color:#8A8A95;text-decoration:none;">letmeflex.ai</a> — Flex without limits.
    </p>
  </div>
</div>
</body>
</html>`;
}

function welcomeEmailHtml(name: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://letmeflex.ai";
  return emailWrapper(`
    <h2 style="color:#FFFFFF;font-size:24px;margin:0 0 16px;">Welcome, ${name}!</h2>
    <p style="color:#8A8A95;font-size:15px;line-height:1.6;margin:0 0 24px;">
      You've just unlocked 3 free credits to create ultra-realistic luxury lifestyle photos with AI.
      Watches, supercars, yachts, penthouses — it's all yours now.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${appUrl}/generate" style="display:inline-block;padding:14px 32px;background:#F9CA1F;color:#000;text-decoration:none;border-radius:9999px;font-weight:700;font-size:14px;letter-spacing:0.06em;text-transform:uppercase;">Generate Your First Flex</a>
    </div>
    <p style="color:#4A4A55;font-size:13px;text-align:center;">Your 3 free credits are waiting.</p>
  `);
}

function generationCompleteHtml(imageUrl: string, category: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://letmeflex.ai";
  return emailWrapper(`
    <h2 style="color:#FFFFFF;font-size:24px;margin:0 0 16px;">Your ${category} flex is ready!</h2>
    <div style="text-align:center;margin:24px 0;">
      <img src="${imageUrl}" alt="Generated image" style="max-width:100%;border-radius:12px;border:1px solid #2A2A2E;" />
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${appUrl}/gallery" style="display:inline-block;padding:14px 32px;background:#F9CA1F;color:#000;text-decoration:none;border-radius:9999px;font-weight:700;font-size:14px;letter-spacing:0.06em;text-transform:uppercase;">View & Download</a>
    </div>
  `);
}

function referralBonusHtml(credits: number) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://letmeflex.ai";
  return emailWrapper(`
    <h2 style="color:#FFFFFF;font-size:24px;margin:0 0 16px;">You earned ${credits} credits!</h2>
    <p style="color:#8A8A95;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Someone just signed up using your referral link. As a thank you, we've added ${credits} credits to your account.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${appUrl}/generate" style="display:inline-block;padding:14px 32px;background:#F9CA1F;color:#000;text-decoration:none;border-radius:9999px;font-weight:700;font-size:14px;letter-spacing:0.06em;text-transform:uppercase;">Use Your Credits</a>
    </div>
  `);
}

function lowCreditsHtml(remaining: number) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://letmeflex.ai";
  return emailWrapper(`
    <h2 style="color:#FFFFFF;font-size:24px;margin:0 0 16px;">You're running low on credits</h2>
    <p style="color:#8A8A95;font-size:15px;line-height:1.6;margin:0 0 24px;">
      You have ${remaining} credit${remaining === 1 ? "" : "s"} remaining. Top up to keep creating amazing flex content.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${appUrl}/credits" style="display:inline-block;padding:14px 32px;background:#F9CA1F;color:#000;text-decoration:none;border-radius:9999px;font-weight:700;font-size:14px;letter-spacing:0.06em;text-transform:uppercase;">Get More Credits</a>
    </div>
  `);
}

function paymentConfirmationHtml(
  amount: string,
  creditsAdded: number,
  newBalance: number
) {
  return emailWrapper(`
    <h2 style="color:#FFFFFF;font-size:24px;margin:0 0 16px;">Payment confirmed!</h2>
    <div style="background:#141416;border:1px solid #2A2A2E;border-radius:12px;padding:24px;margin:24px 0;">
      <p style="color:#8A8A95;font-size:13px;margin:0 0 8px;">Amount paid</p>
      <p style="color:#FFFFFF;font-size:20px;font-weight:700;margin:0 0 16px;">${amount}</p>
      <p style="color:#8A8A95;font-size:13px;margin:0 0 8px;">Credits added</p>
      <p style="color:#F9CA1F;font-size:20px;font-weight:700;margin:0 0 16px;">+${creditsAdded}</p>
      <p style="color:#8A8A95;font-size:13px;margin:0 0 8px;">New balance</p>
      <p style="color:#FFFFFF;font-size:20px;font-weight:700;margin:0;">${newBalance} credits</p>
    </div>
  `);
}

function paymentFailedHtml() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://letmeflex.ai";
  return emailWrapper(`
    <h2 style="color:#FFFFFF;font-size:24px;margin:0 0 16px;">Payment failed</h2>
    <p style="color:#8A8A95;font-size:15px;line-height:1.6;margin:0 0 24px;">
      We were unable to process your most recent payment. Please update your billing information to continue your subscription.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${appUrl}/settings" style="display:inline-block;padding:14px 32px;background:#F9CA1F;color:#000;text-decoration:none;border-radius:9999px;font-weight:700;font-size:14px;letter-spacing:0.06em;text-transform:uppercase;">Update Billing</a>
    </div>
  `);
}
