import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe, PLANS, CREDIT_PACKS, type PlanKey } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import {
  sendPaymentConfirmationEmail,
  sendPaymentFailedEmail,
} from "@/lib/resend";
import type { Plan } from "@prisma/client";

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

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        plan: planKey as Plan,
        credits: plan.credits,
        stripeCustomerId: customerId || undefined,
        stripeSubscriptionId: subscriptionId || undefined,
        subscriptionStatus: "active",
      },
    });

    // Create order record
    await prisma.order.create({
      data: {
        userId,
        stripeSessionId: session.id,
        amount: session.amount_total || 0,
        credits: plan.credits,
        status: "COMPLETED",
        type: "SUBSCRIPTION",
      },
    });

    // Log credit addition
    await prisma.creditLog.create({
      data: {
        userId,
        amount: plan.credits,
        reason: `subscription_${planKey.toLowerCase()}`,
        referenceId: session.id,
      },
    });

    // Send confirmation email (fire and forget)
    const amountStr = session.amount_total
      ? `$${(session.amount_total / 100).toFixed(2)}`
      : `$${plan.price.toFixed(2)}`;

    sendPaymentConfirmationEmail(
      updatedUser.email,
      amountStr,
      plan.credits,
      updatedUser.credits
    ).catch(() => {});
  } else if (type === "credit_pack") {
    const packId = session.metadata?.packId;
    const credits = parseInt(session.metadata?.credits || "0", 10);

    if (!packId || !credits) {
      console.error("[WEBHOOK] Invalid credit_pack metadata");
      return;
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          credits: { increment: credits },
          stripeCustomerId: customerId || undefined,
        },
      });

      await tx.creditLog.create({
        data: {
          userId,
          amount: credits,
          reason: "credit_pack_purchase",
          referenceId: session.id,
        },
      });

      await tx.order.create({
        data: {
          userId,
          stripeSessionId: session.id,
          amount: session.amount_total || 0,
          credits,
          status: "COMPLETED",
          type: "CREDIT_PACK",
        },
      });

      return updated;
    });

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

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: subscription.status,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: "FREE",
      stripeSubscriptionId: null,
      subscriptionStatus: "canceled",
    },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;

  if (!customerId) return;

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { email: true },
  });

  if (user) {
    sendPaymentFailedEmail(user.email).catch(() => {});
  }
}
