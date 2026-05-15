"use client";

import { TrendingUp, Lock } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

export default function MonetisationPage() {
  const { t } = useLanguage();

  return (
    <div className="max-w-xl mx-auto py-4 lg:py-8 space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-heading font-bold text-white">
          {t("monetisation_title")}
        </h1>
        <p className="text-zinc-500 mt-1 text-sm">
          {t("monetisation_subtitle")}
        </p>
      </div>

      <div className="rounded-2xl bg-[#141416] border border-[#2A2A2E] p-10 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#F9CA1F]/10 flex items-center justify-center">
          <TrendingUp className="w-7 h-7 text-[#F9CA1F]" />
        </div>
        <div>
          <p className="text-white font-heading font-semibold text-lg">{t("monetisation_soon")}</p>
          <p className="text-zinc-500 text-sm mt-2 max-w-xs">
            {t("monetisation_desc")}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-600 bg-[#0C0C0E] border border-[#2A2A2E] rounded-full px-3 py-1.5">
          <Lock className="w-3 h-3" />
          {t("monetisation_pro")}
        </div>
      </div>
    </div>
  );
}
