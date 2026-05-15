"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Crown,
  Gift,
  TrendingUp,
  Clock,
  Settings,
  Coins,
  Menu,
  X,
  Wand2,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Studio", icon: Sparkles },
  { href: "/transform", label: "Transformer", icon: Wand2 },
  { href: "/credits", label: "Abonnement", icon: Crown },
  { href: "/invite", label: "Invite & Gagne", icon: Gift },
  { href: "/monetisation", label: "Monétisation", icon: TrendingUp },
  { href: "/gallery", label: "Historique", icon: Clock },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const user = session?.user;
  const credits = user?.credits ?? 0;
  const plan = user?.plan ?? "FREE";

  return (
    <div className="min-h-screen bg-[#0C0C0E] flex">

      {/* ── Desktop Sidebar ─────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-[#1E1E22] bg-[#111113] fixed h-full z-30">

        {/* Logo */}
        <div className="px-6 pt-7 pb-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#F9CA1F] animate-pulse" />
            <span className="font-heading text-xl font-extrabold text-white">
              letmeflex<span className="text-[#F9CA1F]">.ai</span>
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-[#F9CA1F]/10 text-[#F9CA1F] border border-[#F9CA1F]/20"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Credits */}
        <div className="mx-3 mb-3 p-4 rounded-xl bg-[#F9CA1F]/5 border border-[#F9CA1F]/15">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-3.5 h-3.5 text-[#F9CA1F]" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
              Crédits
            </span>
          </div>
          <p className="text-2xl font-heading font-bold text-[#F9CA1F]">
            {credits >= 999999 ? "∞" : credits}
          </p>
          <p className="text-xs text-zinc-600 mt-0.5 capitalize">{plan.toLowerCase()} plan</p>
        </div>

        {/* User */}
        <div className="p-4 border-t border-[#1E1E22]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#F9CA1F]/20 flex items-center justify-center text-[#F9CA1F] font-bold text-sm flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.name || "Utilisateur"}
              </p>
              <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile Header ────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[#111113] border-b border-[#1E1E22] z-40 flex items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F9CA1F] animate-pulse" />
          <span className="font-heading text-base font-extrabold text-white">
            letmeflex<span className="text-[#F9CA1F]">.ai</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F9CA1F]/10 border border-[#F9CA1F]/20">
            <Coins className="w-3.5 h-3.5 text-[#F9CA1F]" />
            <span className="text-sm font-bold text-[#F9CA1F]">
              {credits >= 999999 ? "∞" : credits}
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg hover:bg-white/5 text-zinc-400"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 z-30"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute top-14 right-0 w-56 bg-[#111113] border-l border-[#1E1E22] h-full p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="space-y-0.5">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                      isActive
                        ? "bg-[#F9CA1F]/10 text-[#F9CA1F]"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* ── Main ─────────────────────────────────────────── */}
      <main className="flex-1 lg:ml-60 min-h-screen">
        <div className="pt-14 lg:pt-0 p-4 lg:p-8 pb-24 lg:pb-8">{children}</div>
      </main>

      {/* ── Mobile Bottom Nav ─────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#111113] border-t border-[#1E1E22] z-40 flex pb-safe">
        {[navItems[0], navItems[1], navItems[5], navItems[6]].map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 text-xs",
                isActive ? "text-[#F9CA1F]" : "text-zinc-600"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
