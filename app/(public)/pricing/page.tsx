"use client";

import Link from "next/link";
import { PLANS } from "@/lib/stripe";
import { cn } from "@/lib/utils";
import { Check, ArrowLeft, Crown } from "lucide-react";

const planKeys = ["FREE", "STARTER", "PRO", "UNLIMITED"] as const;

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-heading text-xl font-bold text-gold">
            letmeflex.ai
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="px-5 py-2 rounded-full bg-gold text-black font-heading font-bold text-sm hover:bg-gold-dark transition-colors"
            >
              Start Free
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-display-2 font-heading font-bold">
            Choose your <span className="text-gold">flex</span> plan
          </h1>
          <p className="text-text-muted mt-4 text-lg max-w-2xl mx-auto">
            Start free with 3 credits. Upgrade anytime to unlock more
            generations, HD quality, and face swap.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {planKeys.map((key) => {
            const plan = PLANS[key];
            const isPro = key === "PRO";

            return (
              <div
                key={key}
                className={cn(
                  "relative rounded-2xl p-6 flex flex-col",
                  isPro
                    ? "bg-surface border-2 border-gold shadow-gold"
                    : "bg-surface border border-border"
                )}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gold text-black text-xs font-heading font-bold uppercase tracking-wider flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="font-heading font-semibold text-lg">
                    {plan.name}
                  </h3>
                  <div className="mt-3">
                    <span className="text-4xl font-heading font-extrabold">
                      {plan.price === 0 ? "Free" : `$${plan.price}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-text-muted text-sm">/month</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-3 flex-1 mb-6">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Check className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                      <span className="text-text-muted">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={key === "FREE" ? "/register" : "/register"}
                  className={cn(
                    "block text-center py-3 rounded-full font-heading font-bold text-sm uppercase tracking-wider transition-all",
                    isPro
                      ? "bg-gold text-black shadow-gold hover:bg-gold-dark"
                      : key === "FREE"
                        ? "bg-surface-2 text-text-primary border border-border hover:border-gold/30"
                        : "border border-gold text-gold hover:bg-gold/10"
                  )}
                >
                  {key === "FREE" ? "Start Free" : "Subscribe"}
                </Link>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-gold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
