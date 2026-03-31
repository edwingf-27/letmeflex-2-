import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, generateId } from "@/lib/db";
import { stripe, PLANS, CREDIT_PACKS, type PlanKey } from "@/lib/stripe";

const purchaseSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("credit_pack"),
    packId: z.string(),
  }),
  z.object({
    type: z.literal("subscription"),
    planKey: z.enum(["STARTER", "PRO", "UNLIMITED"]),
  }),
  z.object({
    type: z.literal("quick_buy"),
    packId: z.string(),
  }),
]);

async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  existingCustomerId?: string | null
): Promise<string> {
  if (existingCustomerId) return existingCustomerId;

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  await db
    .from("User")
    .update({ stripeCustomerId: customer.id })
    .eq("id", userId);

  return customer.id;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = purchaseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { data: user, error: userError } = await db
      .from("User")
      .select("id, email, stripeCustomerId")
      .eq("id", session.user.id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const data = parsed.data;

    // -------------------------------------------------------
    // Quick buy: charge saved card instantly (unchanged flow)
    // -------------------------------------------------------
    if (data.type === "quick_buy") {
      const pack = CREDIT_PACKS.find((p) => p.id === data.packId);
      if (!pack) {
        return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
      }

      if (!user.stripeCustomerId) {
        return NextResponse.json({ error: "no_saved_card" }, { status: 400 });
      }

      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: "card",
      });

      if (paymentMethods.data.length === 0) {
        return NextResponse.json({ error: "no_saved_card" }, { status: 400 });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(pack.price * 100),
        currency: "usd",
        customer: user.stripeCustomerId,
        payment_method: paymentMethods.data[0].id,
        off_session: true,
        confirm: true,
        metadata: {
          userId: user.id,
          type: "credit_pack",
          packId: pack.id,
          credits: String(pack.credits),
        },
      });

      if (paymentIntent.status === "succeeded") {
        const { data: currentUser } = await db
          .from("User")
          .select("credits")
          .eq("id", user.id)
          .single();

        const newCredits = (currentUser?.credits || 0) + pack.credits;
        await db.from("User").update({ credits: newCredits }).eq("id", user.id);

        await db.from("CreditLog").insert({
          id: generateId(),
          userId: user.id,
          amount: pack.credits,
          reason: "purchase",
          referenceId: paymentIntent.id,
        });

        await db.from("Order").insert({
          id: generateId(),
          userId: user.id,
          stripePaymentIntentId: paymentIntent.id,
          amount: Math.round(pack.price * 100),
          credits: pack.credits,
          status: "COMPLETED",
          type: "CREDIT_PACK",
        });

        return NextResponse.json({
          success: true,
          credits: newCredits,
          message: `+${pack.credits} credits added!`,
        });
      }

      return NextResponse.json({ error: "Payment failed" }, { status: 402 });
    }

    // -------------------------------------------------------
    // In-app payment flows (PaymentIntent / Subscription)
    // -------------------------------------------------------
    const customerId = await getOrCreateStripeCustomer(
      user.id,
      user.email,
      user.stripeCustomerId
    );

    // --- Credit Pack: create a PaymentIntent, return clientSecret ---
    if (data.type === "credit_pack") {
      const pack = CREDIT_PACKS.find((p) => p.id === data.packId);
      if (!pack) {
        return NextResponse.json(
          { error: "Invalid credit pack" },
          { status: 400 }
        );
      }

      const amountInCents = Math.round(pack.price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "usd",
        customer: customerId,
        setup_future_usage: "off_session",
        metadata: {
          userId: user.id,
          type: "credit_pack",
          packId: pack.id,
          credits: String(pack.credits),
        },
      });

      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        amount: amountInCents,
        credits: pack.credits,
      });
    }

    // --- Subscription: create incomplete subscription, return clientSecret ---
    if (data.type === "subscription") {
      const planKey = data.planKey as PlanKey;
      const plan = PLANS[planKey];
      if (!plan || !("stripePriceId" in plan) || !plan.stripePriceId) {
        return NextResponse.json(
          { error: "Invalid plan" },
          { status: 400 }
        );
      }

      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: plan.stripePriceId }],
        payment_behavior: "default_incomplete",
        payment_settings: {
          save_default_payment_method: "on_subscription",
        },
        expand: ["latest_invoice.payment_intent"],
        metadata: {
          userId: user.id,
          planKey,
          credits: String(plan.credits),
        },
      });

      const invoice = subscription.latest_invoice as any;
      const paymentIntent = invoice?.payment_intent as any;

      if (!paymentIntent?.client_secret) {
        return NextResponse.json(
          { error: "Failed to create subscription payment" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        subscriptionId: subscription.id,
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    console.error("[PURCHASE_ERROR]", error?.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
