import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

const PLANS = {
  starter: { price: 999, name: 'Starter' },
  pro: { price: 2499, name: 'Pro' },
  proplus: { price: 8999, name: 'Pro Plus' },
} as const;

type PlanKey = keyof typeof PLANS;

function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === 'string' && value in PLANS;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const plan = body?.plan;

    if (!isPlanKey(plan)) {
      return NextResponse.json(
        { error: 'Plan invalide. Utilise: starter, pro, proplus.' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return NextResponse.json(
        { error: 'Configuration manquante: NEXT_PUBLIC_APP_URL.' },
        { status: 500 }
      );
    }

    const selectedPlan = PLANS[plan];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: { name: selectedPlan.name },
            unit_amount: selectedPlan.price,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard?success=true`,
      cancel_url: `${appUrl}/pricing?canceled=true`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'Impossible de recuperer l’URL de checkout.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la creation de la session Stripe.' },
      { status: 500 }
    );
  }
}
