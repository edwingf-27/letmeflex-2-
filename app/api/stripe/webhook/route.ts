import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe, PLANS, CREDIT_PACKS, type PlanKey } from "@/lib/stripe";
import { db, generateId } from "@/lib/db";

export const maxDuration = 30;
import {
  sendPaymentConfirmationEmail,
  sendPaymentFailedEmail,
} from "@/lib/resend";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = headers();
  const sig = headersList.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[WEBHOOK_SIGNATURE_ERROR]", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      }

      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;
      }

      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;
      }

      case "invoice.payment_failed": {
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      }

      default:
        // Unhandled event type — that's fine
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`[WEBHOOK_HANDLER_ERROR] ${event.type}:`, error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error("[WEBHOOK] No userId in checkout session metadata");
    return;
  }

  const type = session.metadata?.type;
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  if (type === "subscription") {
    const planKey = session.metadata?.planKey as PlanKey | undefined;
    if (!planKey || !PLANS[planKey]) {
      console.error("[WEBHOOK] Invalid planKey in metadata:", planKey);
      return;
    }

    const plan = PLANS[planKey];
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;

    const { data: updatedUser } = await db
      .from("User")
      .update({
        plan: planKey,
        credits: plan.credits,
        stripeCustomerId: customerId || undefined,
        stripeSubscriptionId: subscriptionId || undefined,
        subscriptionStatus: "active",
      })
      .eq("id", userId)
      .select()
      .single();

    // Create order record
    await db.from("Order").insert({
      id: generateId(),
      userId,
      stripeSessionId: session.id,
      amount: session.amount_total || 0,
      credits: plan.credits,
      status: "COMPLETED",
      type: "SUBSCRIPTION",
    });

    // Log credit addition
    await db.from("CreditLog").insert({
      id: generateId(),
      userId,
      amount: plan.credits,
      reason: `subscription_${planKey.toLowerCase()}`,
      referenceId: session.id,
    });

    // Send confirmation email (fire and forget)
    if (updatedUser) {
      const amountStr = session.amount_total
        ? `$${(session.amount_total / 100).toFixed(2)}`
        : `$${plan.price.toFixed(2)}`;

      sendPaymentConfirmationEmail(
        updatedUser.email,
        amountStr,
        plan.credits,
        updatedUser.credits
      ).catch(() => {});
    }
  } else if (type === "credit_pack") {
    const packId = session.metadata?.packId;
    const credits = parseInt(session.metadata?.credits || "0", 10);

    if (!packId || !credits) {
      console.error("[WEBHOOK] Invalid credit_pack metadata");
      return;
    }

    // Get current user to increment credits
    const { data: currentUser } = await db
      .from("User")
      .select("credits, email")
      .eq("id", userId)
      .single();

    if (!currentUser) {
      console.error("[WEBHOOK] User not found:", userId);
      return;
    }

    const newCredits = (currentUser.credits || 0) + credits;

    const { data: updatedUser } = await db
      .from("User")
      .update({
        credits: newCredits,
        stripeCustomerId: customerId || undefined,
      })
      .eq("id", userId)
      .select()
      .single();

    await db.from("CreditLog").insert({
      id: generateId(),
      userId,
      amount: credits,
      reason: "credit_pack_purchase",
      referenceId: session.id,
    });

    await db.from("Order").insert({
      id: generateId(),
      userId,
      stripeSessionId: session.id,
      amount: session.amount_total || 0,
      credits,
      status: "COMPLETED",
      type: "CREDIT_PACK",
    });

    if (updatedUser) {
      const amountStr = session.amount_total
        ? `$${(session.amount_total / 100).toFixed(2)}`
        : "N/A";

      sendPaymentConfirmationEmail(
        updatedUser.email,
        amountStr,
        credits,
        updatedUser.credits
      ).catch(() => {});
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  await db
    .from("User")
    .update({
      subscriptionStatus: subscription.status,
    })
    .eq("id", userId);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  await db
    .from("User")
    .update({
      plan: "FREE",
      stripeSubscriptionId: null,
      subscriptionStatus: "canceled",
    })
    .eq("id", userId);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;

  if (!customerId) return;

  const { data: user } = await db
    .from("User")
    .select("email")
    .eq("stripeCustomerId", customerId)
    .single();

  if (user) {
    sendPaymentFailedEmail(user.email).catch(() => {});
  }
}
