"use client";

import { useEffect, useState } from "react";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import {
  DollarSign,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Order {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  credits: number;
  type: string;
  status: string;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  createdAt: string;
}

interface RevenueStats {
  mrr: number;
  revenueToday: number;
  revenueMonth: number;
  dailyRevenue: { date: string; amount: number }[];
  revenueByPlan: { plan: string; amount: number }[];
  orders: Order[];
  ordersTotal: number;
  ordersPage: number;
}

const PIE_COLORS = ["#F9CA1F", "#D4A017", "#B8860B", "#8B6914"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0A0A0C] border border-border rounded-xl px-4 py-3 shadow-xl">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-sm font-heading font-bold text-gold">
        ${typeof payload[0].value === "number" ? payload[0].value.toFixed(2) : payload[0].value}
      </p>
    </div>
  );
};

const statusColors: Record<string, string> = {
  COMPLETED: "bg-emerald-500/10 text-emerald-400",
  PENDING: "bg-yellow-500/10 text-yellow-400",
  FAILED: "bg-red-500/10 text-red-400",
  REFUNDED: "bg-zinc-500/10 text-zinc-400",
};

const typeLabels: Record<string, string> = {
  CREDIT_PACK: "Credit Pack",
  SUBSCRIPTION: "Subscription",
};

export default function AdminRevenuePage() {
  const [data, setData] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    async function fetchRevenue() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          section: "revenue",
        });
        const res = await fetch(`/api/admin/stats?${params}`);
        if (!res.ok) throw new Error("Failed to fetch revenue data");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchRevenue();
  }, [page]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-400 font-medium mb-2">Error</p>
          <p className="text-text-muted text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const totalOrderPages = data ? Math.ceil(data.ordersTotal / pageSize) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold">Revenue</h1>
        <p className="text-text-muted mt-1">
          Track MRR, orders, and revenue breakdown by plan.
        </p>
      </div>

      {/* KPI Row */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface border border-border rounded-2xl p-6 animate-pulse"
            >
              <div className="h-4 w-20 bg-surface-2 rounded mb-4" />
              <div className="h-8 w-28 bg-surface-2 rounded" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-gold" />
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                MRR
              </span>
            </div>
            <p className="text-3xl font-heading font-bold text-gold">
              ${(data.mrr / 100).toLocaleString()}
            </p>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Today
              </span>
            </div>
            <p className="text-3xl font-heading font-bold">
              ${(data.revenueToday / 100).toFixed(2)}
            </p>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                This Month
              </span>
            </div>
            <p className="text-3xl font-heading font-bold">
              ${(data.revenueMonth / 100).toLocaleString()}
            </p>
          </div>
        </div>
      ) : null}

      {/* Charts row */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-6 animate-pulse">
            <div className="h-64 bg-surface-2 rounded" />
          </div>
          <div className="bg-surface border border-border rounded-2xl p-6 animate-pulse">
            <div className="h-64 bg-surface-2 rounded" />
          </div>
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MRR Area Chart */}
          <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-6">
            <h3 className="font-heading font-bold text-lg mb-6">
              Daily Revenue{" "}
              <span className="text-text-muted text-sm font-normal">
                (30 days)
              </span>
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.dailyRevenue}>
                <defs>
                  <linearGradient
                    id="revenueGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#F9CA1F" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#F9CA1F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2E" />
                <XAxis
                  dataKey="date"
                  stroke="#8A8A95"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#8A8A95"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#F9CA1F"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue by Plan Pie */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h3 className="font-heading font-bold text-lg mb-6">
              Revenue by Plan
            </h3>
            {data.revenueByPlan && data.revenueByPlan.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.revenueByPlan}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="amount"
                    nameKey="plan"
                    stroke="none"
                  >
                    {data.revenueByPlan.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`$${(Number(value) / 100).toFixed(2)}`, "Revenue"]}
                    contentStyle={{
                      backgroundColor: "#0A0A0C",
                      border: "1px solid #2A2A2E",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-xs text-text-muted">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-text-muted text-sm">
                No revenue data yet
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Orders Table */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-heading font-bold text-lg">Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["User", "Amount", "Credits", "Type", "Status", "Date", "Stripe ID"].map(
                  (col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted"
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-20 bg-surface-2 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-text-muted"
                  >
                    No orders found.
                  </td>
                </tr>
              ) : (
                data?.orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-border/50 hover:bg-surface-2/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-text-muted truncate max-w-[180px]">
                      {order.userEmail}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gold font-medium">
                      {formatCurrency(order.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      {order.credits}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-surface-2 text-text-muted">
                        {typeLabels[order.type] || order.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex px-2.5 py-0.5 rounded-md text-xs font-medium",
                          statusColors[order.status] || statusColors.PENDING
                        )}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted font-mono truncate max-w-[140px]">
                      {order.stripePaymentIntentId || order.stripeSessionId ? (
                        <span className="flex items-center gap-1">
                          {(order.stripePaymentIntentId || order.stripeSessionId || "").slice(0, 20)}...
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && totalOrderPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-text-muted">
              Page {page} of {totalOrderPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg bg-surface-2 border border-border disabled:opacity-30 hover:border-gold/20 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalOrderPages, p + 1))}
                disabled={page >= totalOrderPages}
                className="p-2 rounded-lg bg-surface-2 border border-border disabled:opacity-30 hover:border-gold/20 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
