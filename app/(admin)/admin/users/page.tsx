"use client";

import { useEffect, useState, useCallback } from "react";
import { cn, formatDate } from "@/lib/utils";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Eye,
  ArrowUpDown,
  X,
  Loader2,
  Crown,
} from "lucide-react";
import toast from "react-hot-toast";

interface UserRecord {
  id: string;
  name: string | null;
  email: string;
  plan: string;
  credits: number;
  role: string;
  generationsCount: number;
  createdAt: string;
  stripeCustomerId: string | null;
  subscriptionStatus: string | null;
  creditLogs?: { id: string; amount: number; reason: string; createdAt: string }[];
  generations?: { id: string; category: string; status: string; imageUrl: string | null; createdAt: string }[];
}

interface UsersResponse {
  users: UserRecord[];
  total: number;
  page: number;
  pageSize: number;
}

type SortField = "name" | "email" | "plan" | "credits" | "generationsCount" | "createdAt";
type SortDir = "asc" | "desc";

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Modals
  const [creditsModal, setCreditsModal] = useState<UserRecord | null>(null);
  const [creditsAmount, setCreditsAmount] = useState(10);
  const [planModal, setPlanModal] = useState<UserRecord | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [detailsModal, setDetailsModal] = useState<UserRecord | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const pageSize = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sort: sortField,
        dir: sortDir,
      });
      if (search) params.set("q", search);
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, search, sortField, sortDir]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsers();
    }, search ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [fetchUsers, search]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  const handleAddCredits = async () => {
    if (!creditsModal || creditsAmount <= 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: creditsModal.id,
          action: "addCredits",
          amount: creditsAmount,
        }),
      });
      if (!res.ok) throw new Error("Failed to add credits");
      toast.success(`Added ${creditsAmount} credits to ${creditsModal.email}`);
      setCreditsModal(null);
      setCreditsAmount(10);
      fetchUsers();
    } catch {
      toast.error("Failed to add credits");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePlan = async () => {
    if (!planModal || !selectedPlan) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: planModal.id,
          action: "changePlan",
          plan: selectedPlan,
        }),
      });
      if (!res.ok) throw new Error("Failed to change plan");
      toast.success(`Changed ${planModal.email} to ${selectedPlan} plan`);
      setPlanModal(null);
      setSelectedPlan("");
      fetchUsers();
    } catch {
      toast.error("Failed to change plan");
    } finally {
      setSaving(false);
    }
  };

  const openDetails = async (user: UserRecord) => {
    setDetailsModal(user);
    setDetailsLoading(true);
    try {
      const res = await fetch(`/api/admin/users?userId=${user.id}&detail=true`);
      if (!res.ok) throw new Error("Failed to fetch details");
      const json = await res.json();
      setDetailsModal(json.user);
    } catch {
      toast.error("Failed to load user details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const planColors: Record<string, string> = {
    FREE: "bg-zinc-500/10 text-zinc-400",
    STARTER: "bg-blue-500/10 text-blue-400",
    PRO: "bg-purple-500/10 text-purple-400",
    UNLIMITED: "bg-gold/10 text-gold",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Users</h1>
          <p className="text-text-muted mt-1">
            Manage user accounts, credits, and plans.
          </p>
        </div>
        {data && (
          <span className="text-sm text-text-muted">
            {data.total.toLocaleString()} total users
          </span>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm placeholder:text-text-muted focus:outline-none focus:border-gold/40 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {[
                  { key: "name" as SortField, label: "Name" },
                  { key: "email" as SortField, label: "Email" },
                  { key: "plan" as SortField, label: "Plan" },
                  { key: "credits" as SortField, label: "Credits" },
                  { key: "generationsCount" as SortField, label: "Generations" },
                  { key: "createdAt" as SortField, label: "Joined" },
                ].map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted cursor-pointer hover:text-text-primary transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <ArrowUpDown
                        className={cn(
                          "w-3 h-3",
                          sortField === col.key
                            ? "text-gold"
                            : "text-text-muted/40"
                        )}
                      />
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-20 bg-surface-2 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.users.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-text-muted"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                data?.users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-border/50 hover:bg-surface-2/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate max-w-[150px]">
                          {user.name || "—"}
                        </span>
                        {user.role === "ADMIN" && (
                          <Crown className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted truncate max-w-[200px]">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex px-2.5 py-0.5 rounded-md text-xs font-medium",
                          planColors[user.plan] || planColors.FREE
                        )}
                      >
                        {user.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      {user.credits >= 999999 ? "Unlimited" : user.credits}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      {user.generationsCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setCreditsModal(user);
                            setCreditsAmount(10);
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        >
                          <Plus className="w-3 h-3 inline mr-1" />
                          Credits
                        </button>
                        <button
                          onClick={() => {
                            setPlanModal(user);
                            setSelectedPlan(user.plan);
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors"
                        >
                          Plan
                        </button>
                        <button
                          onClick={() => openDetails(user)}
                          className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-surface-2 text-text-muted hover:text-text-primary transition-colors border border-border"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-text-muted">
              Page {page} of {totalPages}
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
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-lg bg-surface-2 border border-border disabled:opacity-30 hover:border-gold/20 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Credits Modal */}
      {creditsModal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setCreditsModal(null)}
        >
          <div
            className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-lg font-bold">Add Credits</h3>
              <button
                onClick={() => setCreditsModal(null)}
                className="p-1 rounded-lg hover:bg-surface-2"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>
            <p className="text-sm text-text-muted mb-4">
              Adding credits to{" "}
              <span className="text-text-primary font-medium">
                {creditsModal.email}
              </span>
            </p>
            <div className="mb-6">
              <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                Credit Amount
              </label>
              <input
                type="number"
                min={1}
                max={99999}
                value={creditsAmount}
                onChange={(e) => setCreditsAmount(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none focus:border-gold/40"
              />
              <div className="flex gap-2 mt-2">
                {[5, 10, 25, 50, 100].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCreditsAmount(n)}
                    className={cn(
                      "px-3 py-1 text-xs rounded-lg border transition-colors",
                      creditsAmount === n
                        ? "border-gold/40 bg-gold/10 text-gold"
                        : "border-border bg-surface-2 text-text-muted hover:text-text-primary"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setCreditsModal(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-surface-2 border border-border text-text-muted hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCredits}
                disabled={saving || creditsAmount <= 0}
                className="flex-1 px-4 py-2.5 text-sm font-heading font-bold rounded-xl bg-gold text-black hover:bg-gold/90 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  `Add ${creditsAmount} Credits`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Plan Modal */}
      {planModal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setPlanModal(null)}
        >
          <div
            className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-lg font-bold">Change Plan</h3>
              <button
                onClick={() => setPlanModal(null)}
                className="p-1 rounded-lg hover:bg-surface-2"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>
            <p className="text-sm text-text-muted mb-4">
              Changing plan for{" "}
              <span className="text-text-primary font-medium">
                {planModal.email}
              </span>
            </p>
            <div className="space-y-2 mb-6">
              {["FREE", "STARTER", "PRO", "UNLIMITED"].map((plan) => (
                <button
                  key={plan}
                  onClick={() => setSelectedPlan(plan)}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl text-sm font-medium text-left border transition-all",
                    selectedPlan === plan
                      ? "border-gold/40 bg-gold/5 text-gold"
                      : "border-border bg-surface-2 text-text-muted hover:text-text-primary hover:border-border"
                  )}
                >
                  <span className="font-heading font-bold">{plan}</span>
                  {planModal.plan === plan && (
                    <span className="ml-2 text-xs text-text-muted">(current)</span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPlanModal(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-surface-2 border border-border text-text-muted hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePlan}
                disabled={saving || selectedPlan === planModal.plan}
                className="flex-1 px-4 py-2.5 text-sm font-heading font-bold rounded-xl bg-gold text-black hover:bg-gold/90 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  "Update Plan"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {detailsModal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setDetailsModal(null)}
        >
          <div
            className="bg-surface border border-border rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-lg font-bold">User Details</h3>
              <button
                onClick={() => setDetailsModal(null)}
                className="p-1 rounded-lg hover:bg-surface-2"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            {detailsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-gold animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Name", value: detailsModal.name || "—" },
                    { label: "Email", value: detailsModal.email },
                    { label: "Plan", value: detailsModal.plan },
                    { label: "Credits", value: detailsModal.credits >= 999999 ? "Unlimited" : String(detailsModal.credits) },
                    { label: "Role", value: detailsModal.role },
                    { label: "Joined", value: formatDate(detailsModal.createdAt) },
                    { label: "Generations", value: String(detailsModal.generationsCount) },
                    { label: "Stripe ID", value: detailsModal.stripeCustomerId || "—" },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">
                        {item.label}
                      </p>
                      <p className="text-sm font-mono truncate">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Recent Credit Logs */}
                {detailsModal.creditLogs && detailsModal.creditLogs.length > 0 && (
                  <div>
                    <h4 className="font-heading font-bold text-sm mb-3">
                      Recent Credit Logs
                    </h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {detailsModal.creditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg text-xs"
                        >
                          <span className="text-text-muted">{log.reason}</span>
                          <span
                            className={cn(
                              "font-mono font-bold",
                              log.amount > 0 ? "text-emerald-400" : "text-red-400"
                            )}
                          >
                            {log.amount > 0 ? "+" : ""}
                            {log.amount}
                          </span>
                          <span className="text-text-muted">
                            {formatDate(log.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Generations */}
                {detailsModal.generations && detailsModal.generations.length > 0 && (
                  <div>
                    <h4 className="font-heading font-bold text-sm mb-3">
                      Recent Generations
                    </h4>
                    <div className="grid grid-cols-4 gap-2">
                      {detailsModal.generations.slice(0, 8).map((gen) => (
                        <div
                          key={gen.id}
                          className="aspect-square rounded-lg bg-bg border border-border overflow-hidden relative"
                        >
                          {gen.imageUrl ? (
                            <img
                              src={gen.imageUrl}
                              alt={gen.category}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">
                              {gen.status}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
