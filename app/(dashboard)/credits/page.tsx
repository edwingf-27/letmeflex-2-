"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PLANS, CREDIT_PACKS, type PlanKey } from "@/lib/stripe";
import { cn, formatDate } from "@/lib/utils";
import {
  Coins,
  Crown,
  Check,
  Copy,
  Loader2,
  Users,
  Zap,
  CreditCard,
  X,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// -------------------------------------------------------
// Stripe setup
// -------------------------------------------------------
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const stripeAppearance = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#F9CA1F",
    colorBackground: "#1C1C1F",
    colorText: "#FFFFFF",
    colorDanger: "#ef4444",
    fontFamily: "Montserrat, sans-serif",
    borderRadius: "10px",
    colorTextPlaceholder: "#4A4A55",
  },
  rules: {
    ".Input": {
      border: "1px solid #2A2A2E",
      backgroundColor: "#1C1C1F",
    },
    ".Input:focus": {
      border: "1px solid #F9CA1F",
      boxShadow: "0 0 0 3px rgba(249,202,31,0.12)",
    },
    ".Label": { color: "#8A8A95" },
  },
};

// -------------------------------------------------------
// Types
// -------------------------------------------------------
const planKeys = Object.keys(PLANS) as PlanKey[];

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

interface PaymentModalData {
  clientSecret: string;
  amount: number; // cents
  credits: number;
  type: "credit_pack" | "subscription";
  packId?: string;
  planKey?: string;
  subscriptionId?: string;
  label: string; // e.g. "100 Credits" or "Pro Plan"
}

// -------------------------------------------------------
// CheckoutForm — rendered inside <Elements>
// -------------------------------------------------------
function CheckoutForm({
  modalData,
  onSuccess,
  onClose,
}: {
  modalData: PaymentModalData;
  onSuccess: (data: { credits: number; message: string }) => void;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/credits`,
        },
        redirect: "if_required",
      });

      if (error) {
        setErrorMessage(error.message || "Payment failed. Please try again.");
        setProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        // Confirm on our backend to add credits
        const res = await fetch("/api/credits/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            type: modalData.type,
            packId: modalData.packId,
            planKey: modalData.planKey,
            subscriptionId: modalData.subscriptionId,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setErrorMessage(data.error || "Failed to confirm payment.");
          setProcessing(false);
          return;
        }

        onSuccess({ credits: data.credits, message: data.message });
      } else {
        setErrorMessage("Payment was not completed. Please try again.");
        setProcessing(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
      setProcessing(false);
    }
  };

  const displayAmount = (modalData.amount / 100).toFixed(2);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="text-center pb-4 border-b border-border">
        <p className="text-sm text-text-muted mb-1">You are purchasing</p>
        <p className="text-xl font-heading font-bold text-gold">
          {modalData.label}
        </p>
      </div>

      {/* Stripe PaymentElement */}
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />

      {/* Error */}
      {errorMessage && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {errorMessage}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!stripe || !elements || processing}
        className="w-full py-3.5 rounded-xl bg-gold text-black font-heading font-bold text-sm hover:bg-gold-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          `Pay $${displayAmount}`
        )}
      </button>

      {/* Cancel link */}
      <button
        type="button"
        onClick={onClose}
        disabled={processing}
        className="w-full text-center text-sm text-text-muted hover:text-text-primary transition-colors"
      >
        Cancel
      </button>
    </form>
  );
}

// -------------------------------------------------------
// PaymentModal — wraps CheckoutForm in Elements provider
// -------------------------------------------------------
function PaymentModal({
  modalData,
  onSuccess,
  onClose,
}: {
  modalData: PaymentModalData;
  onSuccess: (data: { credits: number; message: string }) => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative w-full max-w-md rounded-2xl bg-surface border border-border p-6 shadow-2xl"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: modalData.clientSecret,
              appearance: stripeAppearance,
            }}
          >
            <CheckoutForm
              modalData={modalData}
              onSuccess={onSuccess}
              onClose={onClose}
            />
          </Elements>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// -------------------------------------------------------
// Main Page
// -------------------------------------------------------
export default function CreditsPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <CreditsContent />
    </Suspense>
  );
}

function CreditsContent() {
  const { data: session, update: updateSession } = useSession();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const user = session?.user;
  const credits = user?.credits ?? 0;
  const currentPlan = (user?.plan && user.plan in PLANS
    ? user.plan
    : "FREE") as PlanKey;

  const [purchasingPack, setPurchasingPack] = useState<string | null>(null);
  const [quickBuying, setQuickBuying] = useState<string | null>(null);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);

  // Payment modal state
  const [paymentModal, setPaymentModal] = useState<PaymentModalData | null>(
    null
  );

  // Check return from Stripe redirect (edge case for 3DS)
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      fetch(`/api/credits/session?session_id=${sessionId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.paymentStatus === "paid") {
            toast.success("Payment successful! Credits added.");
            updateSession();
            queryClient.invalidateQueries({ queryKey: ["credit-history"] });
          }
        })
        .catch(() => {});
      window.history.replaceState({}, "", "/credits");
    }
  }, [searchParams, updateSession, queryClient]);

  // Also check for payment_intent in URL (redirect from 3DS)
  useEffect(() => {
    const piClientSecret = searchParams.get("payment_intent_client_secret");
    const redirectStatus = searchParams.get("redirect_status");
    if (piClientSecret && redirectStatus === "succeeded") {
      const piId = searchParams.get("payment_intent");
      if (piId) {
        // Try to confirm the payment
        fetch("/api/credits/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentIntentId: piId,
            type: "credit_pack",
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              toast.success(data.message || "Payment successful!");
              updateSession();
              queryClient.invalidateQueries({ queryKey: ["credit-history"] });
            }
          })
          .catch(() => {});
      }
      window.history.replaceState({}, "", "/credits");
    }
  }, [searchParams, updateSession, queryClient]);

  // Saved cards
  const { data: savedCards = [] } = useQuery<SavedCard[]>({
    queryKey: ["saved-cards"],
    queryFn: async () => {
      const res = await fetch("/api/credits/saved-cards");
      if (!res.ok) return [];
      const data = await res.json();
      return data.cards || [];
    },
  });

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

  const hasSavedCard = savedCards.length > 0;

  // -------------------------------------------------------
  // Quick buy with saved card (unchanged)
  // -------------------------------------------------------
  const handleQuickBuy = async (packId: string) => {
    setQuickBuying(packId);
    try {
      const res = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "quick_buy", packId }),
      });
      const data = await res.json();

      if (data.error === "no_saved_card") {
        handleBuyPack(packId);
        return;
      }

      if (!res.ok) throw new Error(data.error || "Payment failed");

      toast.success(data.message || "Credits added!");
      updateSession();
      queryClient.invalidateQueries({ queryKey: ["credit-history"] });
      queryClient.invalidateQueries({ queryKey: ["saved-cards"] });
    } catch (err: any) {
      toast.error(err.message || "Payment failed");
    } finally {
      setQuickBuying(null);
    }
  };

  // -------------------------------------------------------
  // Buy credit pack — open in-app modal
  // -------------------------------------------------------
  const handleBuyPack = async (packId: string) => {
    setPurchasingPack(packId);
    try {
      const res = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "credit_pack", packId }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to start payment");

      const pack = CREDIT_PACKS.find((p) => p.id === packId);

      setPaymentModal({
        clientSecret: data.clientSecret,
        amount: data.amount,
        credits: data.credits,
        type: "credit_pack",
        packId,
        label: `${data.credits} Credits`,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to start purchase.");
    } finally {
      setPurchasingPack(null);
    }
  };

  // -------------------------------------------------------
  // Subscribe — open in-app modal
  // -------------------------------------------------------
  const handleUpgradePlan = async (planKey: string) => {
    setUpgradingPlan(planKey);
    try {
      const res = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "subscription", planKey }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to start subscription");

      const plan = PLANS[planKey as PlanKey];

      setPaymentModal({
        clientSecret: data.clientSecret,
        amount: Math.round(plan.price * 100),
        credits: plan.credits,
        type: "subscription",
        planKey,
        subscriptionId: data.subscriptionId,
        label: `${plan.name} Plan - $${plan.price}/mo`,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to start upgrade.");
    } finally {
      setUpgradingPlan(null);
    }
  };

  // -------------------------------------------------------
  // Payment success handler
  // -------------------------------------------------------
  const handlePaymentSuccess = (data: {
    credits: number;
    message: string;
  }) => {
    setPaymentModal(null);
    toast.success(data.message || "Payment successful!");
    updateSession();
    queryClient.invalidateQueries({ queryKey: ["credit-history"] });
    queryClient.invalidateQueries({ queryKey: ["saved-cards"] });
  };

  const referralLink = `${
    process.env.NEXT_PUBLIC_APP_URL || "https://letmeflex.ai"
  }/r/${user?.referralCode || ""}`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setReferralCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setReferralCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Payment Modal */}
      {paymentModal && (
        <PaymentModal
          modalData={paymentModal}
          onSuccess={handlePaymentSuccess}
          onClose={() => setPaymentModal(null)}
        />
      )}

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
      </motion.div>

      {/* Saved Card */}
      {hasSavedCard && (
        <div className="rounded-xl bg-surface border border-border p-4 flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-gold" />
          <div className="flex-1">
            <span className="text-sm font-medium">
              {savedCards[0].brand.charAt(0).toUpperCase() +
                savedCards[0].brand.slice(1)}{" "}
              ending in {savedCards[0].last4}
            </span>
            <span className="text-xs text-text-muted ml-2">
              expires {savedCards[0].expMonth}/{savedCards[0].expYear}
            </span>
          </div>
          <span className="text-xs text-gold font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            One-click buy enabled
          </span>
        </div>
      )}

      {/* Credit Packs */}
      <div>
        <h2 className="text-xl font-heading font-semibold mb-1">
          Buy Credit Packs
        </h2>
        <p className="text-sm text-text-muted mb-6">
          One-time purchases. Credits never expire.
          {hasSavedCard && " Click to buy instantly with saved card."}
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

              {hasSavedCard ? (
                <div className="w-full space-y-2">
                  <button
                    onClick={() => handleQuickBuy(pack.id)}
                    disabled={quickBuying === pack.id}
                    className="w-full py-3 rounded-xl bg-gold text-black font-heading font-bold text-sm hover:bg-gold-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {quickBuying === pack.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Buy Instantly
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleBuyPack(pack.id)}
                    disabled={purchasingPack === pack.id}
                    className="w-full py-2 rounded-xl text-xs text-text-muted hover:text-text-primary transition-colors"
                  >
                    Use different card
                  </button>
                </div>
              ) : (
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
              )}
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
                      <td className="px-4 py-3 text-text-primary capitalize">
                        {entry.reason.replace(/_/g, " ")}
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
