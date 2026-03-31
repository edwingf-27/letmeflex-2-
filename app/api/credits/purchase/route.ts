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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://letmeflex.ai";
    const data = parsed.data;

    // Quick buy: charge saved card instantly (no checkout page)
    if (data.type === "quick_buy") {
      const pack = CREDIT_PACKS.find((p) => p.id === data.packId);
      if (!pack) {
        return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
      }

      if (!user.stripeCustomerId) {
        return NextResponse.json(
          { error: "no_saved_card" },
          { status: 400 }
        );
      }

      // Get saved payment methods
      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: "card",
      });

      if (paymentMethods.data.length === 0) {
        return NextResponse.json(
          { error: "no_saved_card" },
          { status: 400 }
        );
      }

      // Charge the default/first card
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
        // Add credits immediately
        const { data: currentUser } = await db
          .from("User")
          .select("credits")
          .eq("id", user.id)
          .single();

        const newCredits = (currentUser?.credits || 0) + pack.credits;
        await db
          .from("User")
          .update({ credits: newCredits })
          .eq("id", user.id);

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

      return NextResponse.json(
        { error: "Payment failed" },
        { status: 402 }
      );
    }

    // Ensure we have a Stripe customer for embedded checkout
    const customerId = await getOrCreateStripeCustomer(
      user.id,
      user.email,
      user.stripeCustomerId
    );

    if (data.type === "credit_pack") {
      const pack = CREDIT_PACKS.find((p) => p.id === data.packId);
      if (!pack || !pack.stripePriceId) {
        return NextResponse.json(
          { error: "Invalid credit pack" },
          { status: 400 }
        );
      }

      const checkoutSession = await (stripe.checkout.sessions.create as any)({
        ui_mode: "embedded",
        mode: "payment",
        customer: customerId,
        line_items: [{ price: pack.stripePriceId, quantity: 1 }],
        payment_method_collection: "always",
        saved_payment_method_options: {
          payment_method_save: "enabled",
        },
        payment_intent_data: {
          setup_future_usage: "off_session",
          metadata: {
            userId: user.id,
            type: "credit_pack",
            packId: pack.id,
            credits: String(pack.credits),
          },
        },
        metadata: {
          userId: user.id,
          type: "credit_pack",
          packId: pack.id,
          credits: String(pack.credits),
        },
        return_url: `${appUrl}/credits?session_id={CHECKOUT_SESSION_ID}`,
      });

      return NextResponse.json({
        clientSecret: checkoutSession.client_secret,
        sessionId: checkoutSession.id,
      });
    }

    // Subscription
    const planKey = data.planKey as PlanKey;
    const plan = PLANS[planKey];
    if (!plan || !("stripePriceId" in plan) || !plan.stripePriceId) {
      return NextResponse.json(
        { error: "Invalid subscription plan" },
        { status: 400 }
      );
    }

    const checkoutSession = await (stripe.checkout.sessions.create as any)({
      ui_mode: "embedded",
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      payment_method_collection: "always",
      saved_payment_method_options: {
        payment_method_save: "enabled",
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          planKey,
        },
      },
      metadata: {
        userId: user.id,
        type: "subscription",
        planKey,
        credits: String(plan.credits),
      },
      return_url: `${appUrl}/credits?session_id={CHECKOUT_SESSION_ID}`,
    });

    return NextResponse.json({
      clientSecret: checkoutSession.client_secret,
      sessionId: checkoutSession.id,
    });
  } catch (error: any) {
    console.error("[PURCHASE_ERROR]", error?.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
