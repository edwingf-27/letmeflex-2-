import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
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
]);

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
    if (data.type === "credit_pack") {
      const pack = CREDIT_PACKS.find((p) => p.id === data.packId);
      if (!pack || !pack.stripePriceId) {
        return NextResponse.json(
          { error: "Invalid credit pack" },
          { status: 400 }
        );
      }

      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user.stripeCustomerId ? undefined : user.email,
        customer: user.stripeCustomerId || undefined,
        line_items: [{ price: pack.stripePriceId, quantity: 1 }],
        metadata: {
          userId: user.id,
          type: "credit_pack",
          packId: pack.id,
          credits: String(pack.credits),
        },
        success_url: `${appUrl}/credits?success=true`,
        cancel_url: `${appUrl}/credits?canceled=true`,
      });

      return NextResponse.json({ url: checkoutSession.url });
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

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.stripeCustomerId ? undefined : user.email,
      customer: user.stripeCustomerId || undefined,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      metadata: {
        userId: user.id,
        type: "subscription",
        planKey,
        credits: String(plan.credits),
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          planKey,
        },
      },
      success_url: `${appUrl}/dashboard?upgraded=true`,
      cancel_url: `${appUrl}/credits?canceled=true`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("[PURCHASE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
