"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { CATEGORIES } from "@/types/categories";
import { cn } from "@/lib/utils";
import { Sparkles, Copy, Check, ArrowRight, Coins, Users } from "lucide-react";
import { useState } from "react";
import Image from "next/image";

const quickStartItems = [
  { key: "watches", filter: "Watches" },
  { key: "cars", filter: "Cars" },
  { key: "yacht", filter: "Lifestyle" },
  { key: "penthouse", filter: "Lifestyle" },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const [copied, setCopied] = useState(false);

  const { data: recentGenerations } = useQuery({
    queryKey: ["recent-generations"],
    queryFn: async () => {
      const res = await fetch("/api/generate/status/recent");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const referralLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://letmeflex.ai"}/r/${user?.referralCode || ""}`;

  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl lg:text-4xl font-heading font-bold">
          Ready to flex, <span className="text-gold">{user?.name?.split(" ")[0] || "there"}</span>?
        </h1>
        <p className="text-text-muted mt-2">
          Choose a category below and create your next masterpiece.
        </p>
      </div>

      {/* Credits Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gold/20 via-gold/10 to-transparent border border-gold/30 p-6">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-5 h-5 text-gold" />
            <span className="text-sm font-medium uppercase tracking-wider text-gold/80">
              Credits Available
            </span>
          </div>
          <p className="text-5xl font-heading font-extrabold text-gold">
            {(user?.credits ?? 0) >= 999999 ? "Unlimited" : user?.credits ?? 0}
          </p>
          <Link
            href="/credits"
            className="inline-flex items-center gap-1 mt-3 text-sm text-gold hover:text-gold-dark transition-colors"
          >
            Get more credits <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-gold/10 rounded-full blur-3xl" />
      </div>

      {/* Quick Start Categories */}
      <div>
        <h2 className="text-xl font-heading font-semibold mb-4">Quick Start</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickStartItems.map(({ key, filter }) => {
            const cat = CATEGORIES[key];
            return (
              <Link
                key={key}
                href={`/dashboard/generate?category=${encodeURIComponent(filter)}`}
                className="group relative overflow-hidden rounded-2xl bg-surface border border-border hover:border-gold/30 transition-all p-6 flex flex-col items-center text-center gap-3"
              >
                <span className="text-4xl">{cat.icon}</span>
                <span className="font-heading font-semibold text-sm">
                  {cat.label}
                </span>
                <span className="text-xs text-text-muted">{cat.description}</span>
                <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            );
          })}
        </div>
        <Link
          href="/dashboard/generate"
          className="inline-flex items-center gap-2 mt-4 text-sm text-text-muted hover:text-gold transition-colors"
        >
          View all categories <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Recent Generations */}
      {recentGenerations && recentGenerations.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-heading font-semibold">
              Recent Generations
            </h2>
            <Link
              href="/gallery"
              className="text-sm text-text-muted hover:text-gold transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(recentGenerations as any[]).slice(0, 8).map((gen: any) => (
              <div
                key={gen.id}
                className="relative aspect-video rounded-xl overflow-hidden bg-surface border border-border group"
              >
                {gen.imageUrl ? (
                  <Image
                    src={gen.imageUrl}
                    alt={gen.category}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-text-subtle">
                    <Sparkles className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <span className="text-xs font-medium capitalize">
                    {gen.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Referral CTA */}
      <div className="rounded-2xl bg-surface border border-border p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-gold/10">
            <Users className="w-6 h-6 text-gold" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-lg">
              Invite friends, earn credits
            </h3>
            <p className="text-sm text-text-muted mt-1">
              Share your referral link and earn 5 credits for every friend who
              signs up. They get 2 bonus credits too!
            </p>
            <div className="flex items-center gap-2 mt-4">
              <div className="flex-1 bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-sm text-text-muted truncate font-mono">
                {referralLink}
              </div>
              <button
                onClick={copyReferral}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gold text-black font-heading font-bold text-sm hover:bg-gold-dark transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
