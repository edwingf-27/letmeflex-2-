"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: "easeOut" as const },
  }),
};

const trustBadges = [
  { icon: Sparkles, label: "AI-powered generation" },
  { icon: Shield, label: "Private & secure" },
  { icon: Zap, label: "Ready in seconds" },
];

export function Hero() {
  return (
    <section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-bg px-4 py-20">
      {/* CSS Grid pattern background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(rgba(42,42,46,0.3) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(42,42,46,0.3) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
        aria-hidden="true"
      />

      {/* Radial glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: "800px",
          height: "600px",
          background:
            "radial-gradient(ellipse, rgba(249,202,31,0.06) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
        {/* Badge */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/5 px-4 py-1.5"
        >
          <Sparkles className="h-3.5 w-3.5 text-gold" />
          <span className="font-body text-xs font-medium tracking-wide text-gold">
            AI-Generated Luxury Content
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="font-heading text-display-1 text-text-primary"
        >
          Flex Without{" "}
          <span className="gold-gradient-text">Limits.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-6 max-w-2xl font-body text-lg text-text-muted md:text-xl"
        >
          Generate stunning luxury lifestyle images with AI.
          Watches, supercars, mansions, yachts — your content, your flex.
        </motion.p>

        {/* CTAs */}
        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <Link href="/register">
            <Button variant="primary" size="lg">
              Start For Free
            </Button>
          </Link>
          <a href="#categories">
            <Button variant="ghost" size="lg" className="border border-border">
              See Examples
            </Button>
          </a>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-16 flex flex-wrap items-center justify-center gap-8"
        >
          {trustBadges.map((badge) => (
            <div
              key={badge.label}
              className="flex items-center gap-2 text-text-subtle"
            >
              <badge.icon className="h-4 w-4 text-gold/60" />
              <span className="font-body text-sm">{badge.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
