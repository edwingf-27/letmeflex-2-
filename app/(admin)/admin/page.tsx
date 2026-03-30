"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Users,
  ImageIcon,
  DollarSign,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Loader2,
  ArrowUpRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AdminStats {
  totalUsers: number;
  userGrowth: number;
  totalGenerations: number;
  generationsToday: number;
  generationsWeek: number;
  mrr: number;
  revenueToday: number;
  revenueMonth: number;
  subscriptions: {
    FREE: number;
    STARTER: number;
    PRO: number;
    UNLIMITED: number;
  };
  dailyGenerations: { date: string; count: number }[];
  dailyRevenue: { date: string; amount: number }[];
  dailySignups: { date: string; count: number }[];
}

function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded-2xl p-6 animate-pulse">
      <div className="h-4 w-24 bg-surface-2 rounded mb-4" />
      <div className="h-8 w-32 bg-surface-2 rounded mb-2" />
      <div className="h-3 w-20 bg-surface-2 rounded" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-surface border border-border rounded-2xl p-6 animate-pulse">
      <div className="h-5 w-40 bg-surface-2 rounded mb-6" />
      <div className="h-64 bg-surface-2 rounded" />
    </div>
  );
}

const CustomTooltip = ({
  active,
  payload,
  label,
  valuePrefix = "",
  valueSuffix = "",
}: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0A0A0C] border border-border rounded-xl px-4 py-3 shadow-xl">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-sm font-heading font-bold text-gold">
        {valuePrefix}
        {typeof payload[0].value === "number"
          ? payload[0].value.toLocaleString()
          : payload[0].value}
        {valueSuffix}
      </p>
    </div>
  );
};

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        if (!res.ok) throw new Error("Failed to fetch stats");
        const data = await res.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message || "Failed to load admin stats");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-400 font-medium mb-2">Error loading stats</p>
          <p className="text-text-muted text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold">Admin Overview</h1>
        <p className="text-text-muted mt-1">
          Platform metrics and performance at a glance.
        </p>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Total Users */}
          <div className="bg-surface border border-border rounded-2xl p-6 hover:border-gold/20 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Total Users
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <p className="text-3xl font-heading font-bold">
              {stats.totalUsers.toLocaleString()}
            </p>
            <div className="flex items-center gap-1 mt-2">
              {stats.userGrowth >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              )}
              <span
                className={cn(
                  "text-xs font-medium",
                  stats.userGrowth >= 0 ? "text-emerald-400" : "text-red-400"
                )}
              >
                {stats.userGrowth >= 0 ? "+" : ""}
                {stats.userGrowth.toFixed(1)}% this week
              </span>
            </div>
          </div>

          {/* Total Generations */}
          <div className="bg-surface border border-border rounded-2xl p-6 hover:border-gold/20 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Generations
              </span>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <p className="text-3xl font-heading font-bold">
              {stats.totalGenerations.toLocaleString()}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
              <span>
                Today:{" "}
                <span className="text-gold font-medium">
                  {stats.generationsToday}
                </span>
              </span>
              <span className="text-border">|</span>
              <span>
                Week:{" "}
                <span className="text-text-primary font-medium">
                  {stats.generationsWeek}
                </span>
              </span>
            </div>
          </div>

          {/* Revenue */}
          <div className="bg-surface border border-border rounded-2xl p-6 hover:border-gold/20 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Revenue
              </span>
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-gold" />
              </div>
            </div>
            <p className="text-3xl font-heading font-bold text-gold">
              ${(stats.mrr / 100).toLocaleString()}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
              <span>
                MRR{" "}
                <ArrowUpRight className="w-3 h-3 inline text-emerald-400" />
              </span>
              <span className="text-border">|</span>
              <span>
                Today: ${(stats.revenueToday / 100).toFixed(0)}
              </span>
              <span className="text-border">|</span>
              <span>
                Month: ${(stats.revenueMonth / 100).toFixed(0)}
              </span>
            </div>
          </div>

          {/* Subscriptions */}
          <div className="bg-surface border border-border rounded-2xl p-6 hover:border-gold/20 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Subscriptions
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <p className="text-3xl font-heading font-bold">
              {(stats.subscriptions.STARTER +
                stats.subscriptions.PRO +
                stats.subscriptions.UNLIMITED
              ).toLocaleString()}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">
                Starter: {stats.subscriptions.STARTER}
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">
                Pro: {stats.subscriptions.PRO}
              </span>
              <span className="px-2 py-0.5 rounded bg-gold/10 text-gold">
                Unltd: {stats.subscriptions.UNLIMITED}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Charts */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
          <SkeletonChart />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Generations */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h3 className="font-heading font-bold text-lg mb-6">
              Daily Generations{" "}
              <span className="text-text-muted text-sm font-normal">
                (7 days)
              </span>
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={stats.dailyGenerations}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2E" />
                <XAxis
                  dataKey="date"
                  stroke="#8A8A95"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#8A8A95"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#F9CA1F"
                  strokeWidth={2.5}
                  dot={{ fill: "#F9CA1F", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, stroke: "#F9CA1F", strokeWidth: 2, fill: "#0C0C0E" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue Chart */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h3 className="font-heading font-bold text-lg mb-6">
              Revenue{" "}
              <span className="text-text-muted text-sm font-normal">
                (30 days)
              </span>
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={stats.dailyRevenue}>
                <defs>
                  <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F9CA1F" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#F9CA1F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2E" />
                <XAxis
                  dataKey="date"
                  stroke="#8A8A95"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#8A8A95"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  content={<CustomTooltip valuePrefix="$" />}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#F9CA1F"
                  strokeWidth={2}
                  fill="url(#goldGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Signups */}
          <div className="bg-surface border border-border rounded-2xl p-6 lg:col-span-2">
            <h3 className="font-heading font-bold text-lg mb-6">
              New Signups{" "}
              <span className="text-text-muted text-sm font-normal">
                (30 days)
              </span>
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.dailySignups}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2E" />
                <XAxis
                  dataKey="date"
                  stroke="#8A8A95"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#8A8A95"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  fill="#F9CA1F"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
