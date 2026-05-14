"use client";

import { TrendingUp, Lock } from "lucide-react";

export default function MonetisationPage() {
  return (
    <div className="max-w-xl mx-auto py-4 lg:py-8 space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-heading font-bold text-white">
          Monétisation 💰
        </h1>
        <p className="text-zinc-500 mt-1 text-sm">
          Revends tes photos générées et monétise ton contenu
        </p>
      </div>

      <div className="rounded-2xl bg-[#141416] border border-[#2A2A2E] p-10 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#F9CA1F]/10 flex items-center justify-center">
          <TrendingUp className="w-7 h-7 text-[#F9CA1F]" />
        </div>
        <div>
          <p className="text-white font-heading font-semibold text-lg">Bientôt disponible</p>
          <p className="text-zinc-500 text-sm mt-2 max-w-xs">
            La fonctionnalité de monétisation est en cours de développement.
            Tu seras notifié dès son lancement.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-600 bg-[#0C0C0E] border border-[#2A2A2E] rounded-full px-3 py-1.5">
          <Lock className="w-3 h-3" />
          Réservé aux membres Pro
        </div>
      </div>
    </div>
  );
}
