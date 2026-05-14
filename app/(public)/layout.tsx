"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { LogIn, LayoutDashboard } from "lucide-react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();

  return (
    <>
      {children}

      {/* ── Bouton connexion fixe en bas à gauche ───────────── */}
      {status !== "loading" && (
        <div className="fixed bottom-6 left-6 z-50">
          {session ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#111113] border border-[#2A2A2E] text-sm font-medium text-white shadow-xl hover:border-[#F9CA1F]/30 hover:text-[#F9CA1F] transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              Mon studio
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#111113] border border-[#2A2A2E] text-sm font-medium text-zinc-300 shadow-xl hover:border-[#F9CA1F]/30 hover:text-white transition-all"
            >
              <LogIn className="w-4 h-4" />
              Se connecter
            </Link>
          )}
        </div>
      )}
    </>
  );
}
