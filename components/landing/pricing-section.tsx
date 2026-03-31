"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLANS } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const planEntries = Object.entries(PLANS) as [
  keyof typeof PLANS,
  (typeof PLANS)[keyof typeof PLANS]
][];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section id="pricing" className="w-full bg-bg px-4 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        {/* Section heading */}
        <div className="mb-12 text-center">
          <h2 className="font-heading text-display-2 text-text-primary">
            Simple pricing
          </h2>
          <p className="mt-4 font-body text-text-muted">
            Start free. Upgrade when you need more.
          </p>

          {/* Annual / Monthly Toggle */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <span
              className={cn(
                "text-sm font-medium transition-colors",
                !isAnnual ? "text-text-primary" : "text-text-subtle"
              )}
            >
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={cn(
                "relative w-14 h-7 rounded-full transition-colors",
                isAnnual ? "bg-gold" : "bg-surface-2 border border-border"
              )}
            >
              <motion.div
                className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md"
                animate={{ left: isAnnual ? 30 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
            <span
              className={cn(
                "text-sm font-medium transition-colors",
                isAnnual ? "text-text-primary" : "text-text-subtle"
              )}
            >
              Annual
            </span>
            {isAnnual && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-2.5 py-1 rounded-full bg-gold/15 text-gold text-xs font-heading font-bold border border-gold/20"
              >
                Save 50%
              </motion.span>
            )}
          </div>
        </div>

        {/* Plan cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {planEntries.map(([key, plan]) => {
            const isPro = key === "PRO";
            const displayPrice = isAnnual ? plan.annualPrice : plan.price;
            const monthlyEquivalent = plan.price;
            const showSavings = isAnnual && plan.price > 0;

            return (
              <motion.div
                key={key}
                variants={cardVariants}
                className={cn(
                  "relative flex flex-col rounded-card border bg-surface p-6",
                  isPro ? "border-gold shadow-gold" : "border-border"
                )}
              >
                {/* Popular badge */}
                {isPro && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    Most Popular
                  </Badge>
                )}

                {/* Plan name */}
                <h3 className="font-heading text-lg font-semibold text-text-primary">
                  {plan.name}
                </h3>

                {/* Price */}
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="font-heading text-4xl font-bold text-text-primary">
                      {displayPrice === 0 ? "$0" : `$${displayPrice.toFixed(2)}`}
                    </span>
                    {displayPrice > 0 && (
                      <span className="font-body text-sm text-text-muted">
                        /{isAnnual ? "mo" : "mo"}
                      </span>
                    )}
                  </div>
                  {showSavings && (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-text-subtle line-through">
                        ${monthlyEquivalent}/mo
                      </span>
                      {isAnnual && (
                        <span className="text-xs text-gold font-medium">
                          Billed ${(plan.annualPrice * 12).toFixed(0)}/yr
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Features */}
                <ul className="mt-6 flex flex-1 flex-col gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold" />
                      <span className="font-body text-sm text-text-muted">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="mt-8">
                  <Link
                    href={
                      key === "FREE"
                        ? "/register"
                        : `/register?plan=${key.toLowerCase()}&billing=${isAnnual ? "annual" : "monthly"}`
                    }
                    className="block"
                  >
                    <Button
                      variant={isPro ? "primary" : "secondary"}
                      size="md"
                      className="w-full"
                    >
                      {key === "FREE" ? "Start Free" : "Subscribe"}
                    </Button>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
