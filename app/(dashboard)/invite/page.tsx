"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Copy, Check, Gift, Users } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

export default function InvitePage() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const user = session?.user;
  const [copied, setCopied] = useState(false);

  const referralLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://letmeflex.ai"}/r/${user?.referralCode || ""}`;

  const copy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-xl mx-auto py-4 lg:py-8 space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-heading font-bold text-white">
          {t("invite_title")}
        </h1>
        <p className="text-zinc-500 mt-1 text-sm">
          {t("invite_subtitle")}
        </p>
      </div>

      {/* Rewards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#141416] border border-[#2A2A2E] p-5 text-center">
          <div className="text-3xl font-heading font-bold text-[#F9CA1F]">+5</div>
          <div className="text-sm text-zinc-400 mt-1">{t("invite_for_you")}</div>
        </div>
        <div className="rounded-2xl bg-[#141416] border border-[#2A2A2E] p-5 text-center">
          <div className="text-3xl font-heading font-bold text-[#F9CA1F]">+2</div>
          <div className="text-sm text-zinc-400 mt-1">{t("invite_for_friend")}</div>
        </div>
      </div>

      {/* Referral link */}
      <div className="rounded-2xl bg-[#141416] border border-[#2A2A2E] p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <Gift className="w-4 h-4 text-[#F9CA1F]" />
          {t("invite_link_label")}
        </div>
        <div className="flex gap-2">
          <div className="flex-1 bg-[#0C0C0E] border border-[#2A2A2E] rounded-xl px-3 py-2.5 text-xs text-zinc-400 font-mono truncate">
            {referralLink}
          </div>
          <button
            onClick={copy}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F9CA1F] text-black font-semibold text-sm hover:bg-[#F9CA1F]/90 transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? t("invite_copied") : t("invite_copy")}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm text-zinc-500 bg-[#141416] border border-[#2A2A2E] rounded-2xl p-4">
        <Users className="w-5 h-5 text-zinc-600 flex-shrink-0" />
        {t("invite_stats_soon")}
      </div>
    </div>
  );
}
