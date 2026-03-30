"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  ImageIcon,
  Coins,
  Settings,
  LayoutDashboard,
  Crown,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/generate", label: "Generate", icon: Sparkles },
  { href: "/gallery", label: "My Gallery", icon: ImageIcon },
  { href: "/credits", label: "Credits", icon: Coins },
  { href: "/settings", label: "Settings", icon: Settings },
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
    <div className="min-h-screen bg-bg flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-surface fixed h-full z-30">
        <div className="p-6">
          <Link href="/dashboard" className="block">
            <h1 className="font-heading text-xl font-bold text-gold">
              letmeflex.ai
            </h1>
          </Link>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-gold/10 text-gold border border-gold/20"
                    : "text-text-muted hover:text-text-primary hover:bg-surface-2"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Credits badge */}
        <div className="p-4 mx-3 mb-3 rounded-xl bg-surface-2 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-4 h-4 text-gold" />
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Credits
            </span>
          </div>
          <p className="text-2xl font-heading font-bold text-gold">
            {credits >= 999999 ? "∞" : credits}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <Crown className="w-3 h-3 text-text-subtle" />
            <span className="text-xs text-text-subtle">{plan} plan</span>
          </div>
        </div>

        {/* User */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold font-heading font-bold text-sm">
              {user?.name?.[0] || user?.email?.[0] || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-text-muted truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-surface border-b border-border z-40 flex items-center justify-between px-4">
        <Link href="/dashboard">
          <h1 className="font-heading text-lg font-bold text-gold">
            letmeflex.ai
          </h1>
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold/10 border border-gold/20">
            <Coins className="w-3.5 h-3.5 text-gold" />
            <span className="text-sm font-bold text-gold">
              {credits >= 999999 ? "∞" : credits}
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg hover:bg-surface-2"
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-30"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute top-16 right-0 w-64 bg-surface border-l border-border h-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                      isActive
                        ? "bg-gold/10 text-gold"
                        : "text-text-muted hover:text-text-primary"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 min-h-screen">
        <div className="pt-16 lg:pt-0 p-4 lg:p-8">{children}</div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-40 flex">
        {navItems.slice(0, 4).map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 text-xs",
                isActive ? "text-gold" : "text-text-subtle"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label.split(" ").pop()}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
