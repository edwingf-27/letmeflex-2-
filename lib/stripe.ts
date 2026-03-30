import Stripe from "stripe";

let _stripe: Stripe;

export function getStripeInstance(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_placeholder", {
      // @ts-expect-error - API version may differ from SDK type
      apiVersion: "2024-06-20",
    });
  }
  return _stripe;
}

// Lazy proxy — importing `stripe` doesn't initialize the SDK at module load
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripeInstance() as any)[prop];
  },
});

export const PLANS = {
  FREE: {
    name: "Free",
    credits: 3,
    monthlyCredits: 0,
    price: 0,
    features: [
      "3 free generations",
      "Standard quality",
      "Watermark on images",
    ],
  },
  STARTER: {
    name: "Starter",
    credits: 30,
    monthlyCredits: 30,
    price: 9.99,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
    features: [
      "30 credits/month",
      "HD quality",
      "No watermark",
      "Face swap access",
    ],
  },
  PRO: {
    name: "Pro",
    credits: 100,
    monthlyCredits: 100,
    price: 24.99,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    features: [
      "100 credits/month",
      "HD quality",
      "No watermark",
      "Face swap",
      "Priority queue",
      "All models",
    ],
  },
  UNLIMITED: {
    name: "Unlimited",
    credits: 999999,
    monthlyCredits: 999999,
    price: 59.99,
    stripePriceId: process.env.STRIPE_UNLIMITED_PRICE_ID,
    features: [
      "Unlimited generations",
      "4K quality",
      "No watermark",
      "All features",
      "Priority support",
    ],
  },
} as const;

export const CREDIT_PACKS = [
  {
    id: "pack_10",
    credits: 10,
    price: 4.99,
    stripePriceId: process.env.STRIPE_PACK_10,
  },
  {
    id: "pack_30",
    credits: 30,
    price: 12.99,
    stripePriceId: process.env.STRIPE_PACK_30,
  },
  {
    id: "pack_100",
    credits: 100,
    price: 34.99,
    stripePriceId: process.env.STRIPE_PACK_100,
  },
] as const;

export type PlanKey = keyof typeof PLANS;
