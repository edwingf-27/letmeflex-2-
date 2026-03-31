"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  ImageIcon,
  Cpu,
  DollarSign,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Loader2,
  MessageSquare,
  FlaskConical,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/generations", label: "Generations", icon: ImageIcon },
  { href: "/admin/models", label: "Models", icon: Cpu },
  { href: "/admin/prompts", label: "Prompts", icon: MessageSquare },
  { href: "/admin/ab-testing", label: "A/B Testing", icon: FlaskConical },
  { href: "/admin/revenue", label: "Revenue", icon: DollarSign },
  { href: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (!session?.user || session.user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center p-8 rounded-2xl bg-surface border border-border max-w-md">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="font-heading text-2xl font-bold mb-2">
            Access Denied
          </h1>
          <p className="text-text-muted mb-6">
            You do not have administrator privileges to access this area.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-3 bg-gold text-black font-heading font-bold rounded-xl hover:bg-gold/90 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-[#0A0A0C] fixed h-full z-30">
        <div className="p-6 border-b border-border">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse-gold" />
            <span className="font-heading text-xl font-extrabold text-white">
              letmeflex<span className="text-gold">.ai</span>
            </span>
          </Link>
          <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-md text-[10px] font-heading font-bold uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20">
            Admin Panel
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
                  isActive
                    ? "bg-gold/10 text-gold border border-gold/20"
                    : "text-text-muted hover:text-text-primary hover:bg-surface-2"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <ChevronRight className="w-4 h-4 text-gold/60" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Admin user info */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-heading font-bold text-sm ring-2 ring-red-500/30">
              {session.user.name?.[0] || session.user.email?.[0] || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {session.user.name || "Admin"}
              </p>
              <p className="text-xs text-text-muted truncate">
                {session.user.email}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard"
              className="flex-1 text-center text-xs px-3 py-2 rounded-lg bg-surface-2 text-text-muted hover:text-text-primary transition-colors border border-border"
            >
              Dashboard
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center justify-center px-3 py-2 rounded-lg bg-surface-2 text-text-muted hover:text-red-400 transition-colors border border-border"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[#0A0A0C] border-b border-border z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse-gold" />
            <span className="font-heading text-lg font-extrabold text-white">
              letmeflex<span className="text-gold">.ai</span>
            </span>
          </Link>
          <span className="px-2 py-0.5 rounded text-[9px] font-heading font-bold uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20">
            Admin
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-surface-2"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-30"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute top-14 right-0 w-64 bg-[#0A0A0C] border-l border-border h-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(item.href));
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
        <div className="pt-14 lg:pt-0 p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
