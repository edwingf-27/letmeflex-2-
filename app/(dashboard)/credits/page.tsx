"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { PLANS, CREDIT_PACKS, type PlanKey } from "@/lib/stripe";
import { cn, formatDate } from "@/lib/utils";
import {
  Coins,
  Crown,
  Check,
  Copy,
  ArrowRight,
  Loader2,
  Users,
  Zap,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

const planKeys = Object.keys(PLANS) as PlanKey[];

export default function CreditsPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const credits = user?.credits ?? 0;
  const currentPlan = ((user?.plan && user.plan in PLANS ? user.plan : "FREE")) as PlanKey;

  const [purchasingPack, setPurchasingPack] = useState<string | null>(null);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);

  // Credit history
  const { data: creditHistory = [] } = useQuery<
    { id: string; amount: number; reason: string; createdAt: string }[]
  >({
    queryKey: ["credit-history"],
    queryFn: async () => {
      const res = await fetch("/api/credits/history");
      if (!res.ok) return [];
      const data = await res.json();
      return data.logs || data || [];
    },
  });

  // Referral stats
  const { data: referralStats } = useQuery<{
    totalReferrals: number;
    creditsEarned: number;
  }>({
    queryKey: ["referral-stats"],
    queryFn: async () => {
      const res = await fetch("/api/user/referral-stats");
      if (!res.ok) return { totalReferrals: 0, creditsEarned: 0 };
      return res.json();
    },
  });

  const handleBuyPack = async (packId: string) => {
    setPurchasingPack(packId);
    try {
      const res = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to create checkout");
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start purchase.");
      setPurchasingPack(null);
    }
  };

  const handleUpgradePlan = async (planKey: string) => {
    setUpgradingPlan(planKey);
    try {
      const res = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to create checkout");
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start upgrade.");
      setUpgradingPlan(null);
    }
  };

  const referralLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://letmeflex.ai"}/r/${user?.referralCode || ""}`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setReferralCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setReferralCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Credit Balance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gold/20 via-gold/10 to-transparent border border-gold/30 p-8 text-center"
      >
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Coins className="w-6 h-6 text-gold" />
            <span className="text-sm font-medium uppercase tracking-wider text-gold/80">
              Credit Balance
            </span>
          </div>
          <p className="text-6xl lg:text-7xl font-heading font-extrabold text-gold">
            {credits >= 999999 ? "Unlimited" : credits.toLocaleString()}
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Crown className="w-4 h-4 text-gold/60" />
            <span className="text-sm text-gold/60">
              {PLANS[currentPlan].name} Plan
            </span>
          </div>
        </div>
        <div className="absolute -right-12 -top-12 w-56 h-56 bg-gold/10 rounded-full blur-3xl" />
        <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-gold/5 rounded-full blur-3xl" />
      </motion.div>

      {/* Credit Packs */}
      <div>
        <h2 className="text-xl font-heading font-semibold mb-1">
          Buy Credit Packs
        </h2>
        <p className="text-sm text-text-muted mb-6">
          One-time purchases. Credits never expire.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CREDIT_PACKS.map((pack, index) => (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="rounded-2xl bg-surface border border-border p-6 flex flex-col items-center text-center gap-4 hover:border-gold/20 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-gold" />
              </div>
              <div>
                <p className="text-3xl font-heading font-bold text-gold">
                  {pack.credits}
                </p>
                <p className="text-sm text-text-muted">credits</p>
              </div>
              <p className="text-2xl font-heading font-bold">
                ${pack.price.toFixed(2)}
              </p>
              <button
                onClick={() => handleBuyPack(pack.id)}
                disabled={purchasingPack === pack.id}
                className={cn(
                  "w-full py-3 rounded-xl font-heading font-bold text-sm transition-all",
                  purchasingPack === pack.id
                    ? "bg-gold/50 text-black/50 cursor-not-allowed"
                    : "bg-surface-2 border border-border text-text-primary hover:border-gold/30 hover:text-gold"
                )}
              >
                {purchasingPack === pack.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  "Buy"
                )}
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Plans */}
      <div>
        <h2 className="text-xl font-heading font-semibold mb-1">
          Subscription Plans
        </h2>
        <p className="text-sm text-text-muted mb-6">
          Get monthly credits and unlock premium features.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {planKeys.map((key, index) => {
            const plan = PLANS[key];
            const isCurrent = currentPlan === key;
            const isPopular = key === "PRO";

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "relative rounded-2xl p-6 flex flex-col gap-4",
                  isPopular
                    ? "bg-gold/10 border-2 border-gold/40"
                    : "bg-surface border border-border",
                  isCurrent && "ring-2 ring-gold/30"
                )}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gold text-black text-xs font-heading font-bold">
                    Popular
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-3 right-4 px-3 py-1 rounded-full bg-surface-2 border border-gold/30 text-gold text-xs font-heading font-bold">
                    Current
                  </span>
                )}

                <div>
                  <h3 className="font-heading font-bold text-lg">
                    {plan.name}
                  </h3>
                  <div className="mt-2">
                    <span className="text-3xl font-heading font-bold">
                      {plan.price === 0 ? "Free" : `$${plan.price}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-sm text-text-muted">/month</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-2 flex-1">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-text-muted"
                    >
                      <Check className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="py-3 rounded-xl bg-surface-2 border border-border text-center text-sm font-medium text-text-muted">
                    Current Plan
                  </div>
                ) : key === "FREE" ? null : (
                  <button
                    onClick={() => handleUpgradePlan(key)}
                    disabled={upgradingPlan === key}
                    className={cn(
                      "w-full py-3 rounded-xl font-heading font-bold text-sm transition-all",
                      isPopular
                        ? "bg-gold text-black hover:bg-gold-dark"
                        : "bg-surface-2 border border-border hover:border-gold/30 hover:text-gold"
                    )}
                  >
                    {upgradingPlan === key ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : planKeys.indexOf(key) > planKeys.indexOf(currentPlan) ? (
                      "Upgrade"
                    ) : (
                      "Switch"
                    )}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Referral Section */}
      <div className="rounded-2xl bg-surface border border-border p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-gold/10 shrink-0">
            <Users className="w-6 h-6 text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-semibold text-lg">
              Refer friends, earn credits
            </h3>
            <p className="text-sm text-text-muted mt-1">
              Share your link and earn 5 credits for every friend who signs up.
            </p>

            {/* Referral Stats */}
            <div className="flex gap-6 mt-4">
              <div>
                <p className="text-2xl font-heading font-bold text-gold">
                  {referralStats?.totalReferrals ?? 0}
                </p>
                <p className="text-xs text-text-muted">Referrals</p>
              </div>
              <div>
                <p className="text-2xl font-heading font-bold text-gold">
                  {referralStats?.creditsEarned ?? 0}
                </p>
                <p className="text-xs text-text-muted">Credits earned</p>
              </div>
            </div>

            {/* Copy Link */}
            <div className="flex items-center gap-2 mt-4">
              <div className="flex-1 bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-sm text-text-muted truncate font-mono">
                {referralLink}
              </div>
              <button
                onClick={copyReferralLink}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gold text-black font-heading font-bold text-sm hover:bg-gold-dark transition-colors shrink-0"
              >
                {referralCopied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {referralCopied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Credit History */}
      <div>
        <h2 className="text-xl font-heading font-semibold mb-4">
          Credit History
        </h2>
        {creditHistory.length === 0 ? (
          <div className="rounded-2xl bg-surface border border-border p-8 text-center">
            <p className="text-text-muted text-sm">
              No credit transactions yet.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-surface border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-subtle">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-subtle">
                      Reason
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-subtle">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {creditHistory.map((entry) => (
                    <tr key={entry.id} className="hover:bg-surface-2/50">
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-text-primary">
                        {entry.reason}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right font-heading font-bold whitespace-nowrap",
                          entry.amount > 0 ? "text-green-400" : "text-red-400"
                        )}
                      >
                        {entry.amount > 0 ? "+" : ""}
                        {entry.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
