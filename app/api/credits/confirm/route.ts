import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, generateId } from "@/lib/db";
import { stripe, PLANS, CREDIT_PACKS, type PlanKey } from "@/lib/stripe";

const confirmSchema = z.object({
  paymentIntentId: z.string(),
  type: z.enum(["credit_pack", "subscription"]),
  packId: z.string().optional(),
  planKey: z.string().optional(),
  subscriptionId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = confirmSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { paymentIntentId, type, packId, planKey, subscriptionId } =
      parsed.data;

    // Verify the PaymentIntent succeeded via Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: "Payment not completed", status: paymentIntent.status },
        { status: 400 }
      );
    }

    // Make sure this payment belongs to this user (check metadata)
    if (paymentIntent.metadata?.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userId = session.user.id;

    // Get current user data
    const { data: user, error: userError } = await db
      .from("User")
      .select("id, credits, plan")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // -------------------------------------------------------
    // Credit Pack confirmation
    // -------------------------------------------------------
    if (type === "credit_pack") {
      const pack = CREDIT_PACKS.find((p) => p.id === packId);
      if (!pack) {
        return NextResponse.json(
          { error: "Invalid credit pack" },
          { status: 400 }
        );
      }

      // Check for duplicate confirmation (idempotency)
      const { data: existingOrder } = await db
        .from("Order")
        .select("id")
        .eq("stripePaymentIntentId", paymentIntentId)
        .single();

      if (existingOrder) {
        // Already processed — return current credits
        return NextResponse.json({
          success: true,
          credits: user.credits,
          message: "Payment already processed",
        });
      }

      const newCredits = (user.credits || 0) + pack.credits;

      await db.from("User").update({ credits: newCredits }).eq("id", userId);

      await db.from("CreditLog").insert({
        id: generateId(),
        userId,
        amount: pack.credits,
        reason: "purchase",
        referenceId: paymentIntentId,
      });

      await db.from("Order").insert({
        id: generateId(),
        userId,
        stripePaymentIntentId: paymentIntentId,
        amount: paymentIntent.amount,
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

    // -------------------------------------------------------
    // Subscription confirmation
    // -------------------------------------------------------
    if (type === "subscription") {
      const key = planKey as PlanKey;
      const plan = PLANS[key];
      if (!plan || !key || !(key in PLANS)) {
        return NextResponse.json(
          { error: "Invalid plan" },
          { status: 400 }
        );
      }

      // Check for duplicate confirmation
      const { data: existingOrder } = await db
        .from("Order")
        .select("id")
        .eq("stripePaymentIntentId", paymentIntentId)
        .single();

      if (existingOrder) {
        return NextResponse.json({
          success: true,
          credits: user.credits,
          message: "Subscription already processed",
        });
      }

      const newCredits = (user.credits || 0) + plan.credits;

      await db
        .from("User")
        .update({
          credits: newCredits,
          plan: key,
          stripeSubscriptionId: subscriptionId || null,
          subscriptionStatus: "active",
        })
        .eq("id", userId);

      await db.from("CreditLog").insert({
        id: generateId(),
        userId,
        amount: plan.credits,
        reason: "subscription",
        referenceId: paymentIntentId,
      });

      await db.from("Order").insert({
        id: generateId(),
        userId,
        stripePaymentIntentId: paymentIntentId,
        amount: paymentIntent.amount,
        credits: plan.credits,
        status: "COMPLETED",
        type: "SUBSCRIPTION",
      });

      return NextResponse.json({
        success: true,
        credits: newCredits,
        message: `Subscribed to ${plan.name}! +${plan.credits} credits added.`,
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    console.error("[CONFIRM_ERROR]", error?.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
