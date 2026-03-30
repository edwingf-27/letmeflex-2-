"use client";

import { useEffect, useState, useCallback } from "react";
import { cn, formatDate } from "@/lib/utils";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Filter,
  Calendar,
  ImageIcon,
} from "lucide-react";
import toast from "react-hot-toast";

interface GenerationRecord {
  id: string;
  userId: string;
  userEmail: string;
  category: string;
  subcategory: string | null;
  prompt: string;
  negativePrompt: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  status: string;
  modelUsed: string | null;
  modelProvider: string | null;
  creditsUsed: number;
  metadata: any;
  createdAt: string;
}

interface GenerationsResponse {
  generations: GenerationRecord[];
  total: number;
  page: number;
  pageSize: number;
}

const statusColors: Record<string, string> = {
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  PROCESSING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  FAILED: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function AdminGenerationsPage() {
  const [data, setData] = useState<GenerationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [previewGen, setPreviewGen] = useState<GenerationRecord | null>(null);

  const pageSize = 20;

  const fetchGenerations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (statusFilter) params.set("status", statusFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const res = await fetch(`/api/admin/generations?${params}`);
      if (!res.ok) throw new Error("Failed to fetch generations");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load generations");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, categoryFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  // Derive unique categories from data
  const categories = data
    ? [...new Set(data.generations.map((g) => g.category))].sort()
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold">Generations</h1>
        <p className="text-text-muted mt-1">
          Browse and inspect all image generations across the platform.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-text-muted">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-medium uppercase tracking-wider">
            Filters
          </span>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-surface border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-gold/40"
        >
          <option value="">All Statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="FAILED">Failed</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-surface border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-gold/40"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-text-muted" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-surface border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-gold/40"
            placeholder="From"
          />
          <span className="text-text-muted text-xs">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-surface border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-gold/40"
            placeholder="To"
          />
        </div>

        {(statusFilter || categoryFilter || dateFrom || dateTo) && (
          <button
            onClick={() => {
              setStatusFilter("");
              setCategoryFilter("");
              setDateFrom("");
              setDateTo("");
              setPage(1);
            }}
            className="px-3 py-2 text-xs font-medium rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["User", "Category", "Subcategory", "Status", "Model", "Created"].map(
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
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-20 bg-surface-2 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.generations.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-text-muted"
                  >
                    No generations found.
                  </td>
                </tr>
              ) : (
                data?.generations.map((gen) => (
                  <tr
                    key={gen.id}
                    onClick={() => setPreviewGen(gen)}
                    className="border-b border-border/50 hover:bg-surface-2/50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm text-text-muted truncate max-w-[180px]">
                      {gen.userEmail}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {gen.category}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {gen.subcategory || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex px-2.5 py-0.5 rounded-md text-xs font-medium border",
                          statusColors[gen.status] || statusColors.PENDING
                        )}
                      >
                        {gen.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted font-mono text-xs">
                      {gen.modelUsed || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {formatDate(gen.createdAt)}
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
              Page {page} of {totalPages} ({data.total} total)
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

      {/* Preview Modal */}
      {previewGen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewGen(null)}
        >
          <div
            className="bg-surface border border-border rounded-2xl p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-lg font-bold">
                Generation Details
              </h3>
              <button
                onClick={() => setPreviewGen(null)}
                className="p-1 rounded-lg hover:bg-surface-2"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Image Preview */}
              <div className="aspect-square rounded-xl bg-bg border border-border overflow-hidden">
                {previewGen.imageUrl ? (
                  <img
                    src={previewGen.imageUrl}
                    alt="Generation preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-text-muted">
                    <ImageIcon className="w-12 h-12 mb-2 opacity-30" />
                    <span className="text-sm">{previewGen.status}</span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">
                    User
                  </p>
                  <p className="text-sm">{previewGen.userEmail}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">
                    Status
                  </p>
                  <span
                    className={cn(
                      "inline-flex px-2.5 py-0.5 rounded-md text-xs font-medium border",
                      statusColors[previewGen.status] || statusColors.PENDING
                    )}
                  >
                    {previewGen.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">
                      Category
                    </p>
                    <p className="text-sm">{previewGen.category}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">
                      Subcategory
                    </p>
                    <p className="text-sm">{previewGen.subcategory || "—"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">
                      Model
                    </p>
                    <p className="text-sm font-mono text-xs">
                      {previewGen.modelUsed || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">
                      Provider
                    </p>
                    <p className="text-sm">{previewGen.modelProvider || "—"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">
                    Created
                  </p>
                  <p className="text-sm">{formatDate(previewGen.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">
                    Credits Used
                  </p>
                  <p className="text-sm">{previewGen.creditsUsed}</p>
                </div>
              </div>
            </div>

            {/* Full Prompt */}
            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                Full Prompt
              </p>
              <div className="bg-bg border border-border rounded-xl p-4 max-h-32 overflow-y-auto">
                <p className="text-sm text-text-muted whitespace-pre-wrap">
                  {previewGen.prompt}
                </p>
              </div>
            </div>

            {previewGen.negativePrompt && (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                  Negative Prompt
                </p>
                <div className="bg-bg border border-border rounded-xl p-4 max-h-24 overflow-y-auto">
                  <p className="text-sm text-text-muted whitespace-pre-wrap">
                    {previewGen.negativePrompt}
                  </p>
                </div>
              </div>
            )}

            {/* Metadata */}
            {previewGen.metadata && (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                  Metadata
                </p>
                <div className="bg-bg border border-border rounded-xl p-4 max-h-40 overflow-y-auto">
                  <pre className="text-xs text-text-muted font-mono whitespace-pre-wrap">
                    {JSON.stringify(previewGen.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
