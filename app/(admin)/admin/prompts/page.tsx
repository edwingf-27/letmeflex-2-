"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/types/categories";
import {
  Plus,
  Sparkles,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  X,
  Loader2,
  MessageSquare,
  Star,
  TestTube,
  Clock,
  Bot,
  FileText,
  Code,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";

interface PromptTemplate {
  id: string;
  category: string;
  subcategory: string | null;
  shot: string | null;
  promptText: string;
  negativePrompt: string | null;
  source: "manual" | "ai_generated" | "hardcoded";
  status: "draft" | "approved" | "rejected";
  usageCount: number;
  rating: number | null;
  createdBy: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TestResult {
  imageUrl: string;
  latencyMs: number;
}

const categoryOptions = Object.entries(CATEGORIES).map(([key, cat]) => ({
  value: key,
  label: cat.label,
}));

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "All Sources" },
  { value: "manual", label: "Manual" },
  { value: "ai_generated", label: "AI Generated" },
  { value: "hardcoded", label: "Hardcoded" },
];

function sourceBadge(source: string) {
  switch (source) {
    case "ai_generated":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Bot className="w-3 h-3" />
          AI
        </span>
      );
    case "manual":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <FileText className="w-3 h-3" />
          Manual
        </span>
      );
    case "hardcoded":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
          <Code className="w-3 h-3" />
          Hardcoded
        </span>
      );
    default:
      return null;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "approved":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-400">
          <CheckCircle className="w-3 h-3" />
          Approved
        </span>
      );
    case "rejected":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-red-500/10 text-red-400">
          <XCircle className="w-3 h-3" />
          Rejected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-yellow-500/10 text-yellow-400">
          Draft
        </span>
      );
  }
}

function RatingStars({
  rating,
  onChange,
}: {
  rating: number | null;
  onChange?: (val: number) => void;
}) {
  const value = rating ?? 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange?.(star)}
          disabled={!onChange}
          className={cn(
            "p-0 transition-colors",
            onChange
              ? "cursor-pointer hover:text-gold"
              : "cursor-default"
          )}
        >
          <Star
            className={cn(
              "w-3.5 h-3.5",
              star <= value ? "text-gold fill-gold" : "text-text-subtle"
            )}
          />
        </button>
      ))}
    </div>
  );
}

export default function AdminPromptsPage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [page, setPage] = useState(1);
  const limit = 50;

  // Add/Edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [formData, setFormData] = useState({
    category: "",
    subcategory: "",
    shot: "",
    promptText: "",
    negativePrompt: "",
  });
  const [formSaving, setFormSaving] = useState(false);

  // AI Generate modal
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiCategory, setAiCategory] = useState(categoryOptions[0]?.value || "");
  const [aiSubcategory, setAiSubcategory] = useState("");
  const [aiCount, setAiCount] = useState(3);
  const [aiBasePrompt, setAiBasePrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResults, setAiResults] = useState<PromptTemplate[]>([]);

  // Test modal
  const [testingTemplate, setTestingTemplate] = useState<PromptTemplate | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.set("category", filterCategory);
      if (filterStatus) params.set("status", filterStatus);
      if (filterSource) params.set("source", filterSource);
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const res = await fetch(`/api/admin/prompts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setTemplates(json.templates || []);
      setTotal(json.total || 0);
    } catch {
      toast.error("Failed to load prompt templates");
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterStatus, filterSource, page]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Stats
  const totalCount = total;
  const approvedCount = templates.filter((t) => t.status === "approved").length;
  const aiCount_ = templates.filter((t) => t.source === "ai_generated").length;

  // Add template
  const openAddForm = () => {
    setEditingTemplate(null);
    setFormData({
      category: categoryOptions[0]?.value || "",
      subcategory: "",
      shot: "",
      promptText: "",
      negativePrompt: "",
    });
    setFormOpen(true);
  };

  const openEditForm = (template: PromptTemplate) => {
    setEditingTemplate(template);
    setFormData({
      category: template.category,
      subcategory: template.subcategory || "",
      shot: template.shot || "",
      promptText: template.promptText,
      negativePrompt: template.negativePrompt || "",
    });
    setFormOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!formData.category || !formData.promptText) {
      toast.error("Category and prompt text are required");
      return;
    }
    setFormSaving(true);
    try {
      if (editingTemplate) {
        const res = await fetch("/api/admin/prompts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingTemplate.id,
            action: "update",
            ...formData,
          }),
        });
        if (!res.ok) throw new Error("Failed");
        toast.success("Template updated");
      } else {
        const res = await fetch("/api/admin/prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error("Failed");
        toast.success("Template created");
      }
      setFormOpen(false);
      fetchTemplates();
    } catch {
      toast.error("Failed to save template");
    } finally {
      setFormSaving(false);
    }
  };

  const handleAction = async (
    id: string,
    action: string,
    extra: Record<string, any> = {}
  ) => {
    try {
      const res = await fetch("/api/admin/prompts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, ...extra }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(
        action === "approve"
          ? "Template approved"
          : action === "reject"
          ? "Template rejected"
          : "Updated"
      );
      fetchTemplates();
    } catch {
      toast.error(`Failed to ${action} template`);
    }
  };

  const handleDelete = async (template: PromptTemplate) => {
    if (!confirm("Delete this prompt template? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/admin/prompts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: template.id }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Template deleted");
      fetchTemplates();
    } catch {
      toast.error("Failed to delete template");
    }
  };

  const handleRate = async (id: string, rating: number) => {
    await handleAction(id, "rate", { rating });
  };

  // AI Generate
  const handleAIGenerate = async () => {
    if (!aiCategory) {
      toast.error("Select a category");
      return;
    }
    setAiGenerating(true);
    setAiResults([]);
    try {
      const res = await fetch("/api/admin/prompts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: aiCategory,
          subcategory: aiSubcategory || undefined,
          count: aiCount,
          basePrompt: aiBasePrompt || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Generation failed");
      }
      const json = await res.json();
      setAiResults(json.templates || []);
      toast.success(`Generated ${json.templates?.length || 0} prompts`);
    } catch (err: any) {
      toast.error(err.message || "AI generation failed");
    } finally {
      setAiGenerating(false);
    }
  };

  // Test
  const runTest = async (template: PromptTemplate) => {
    setTestingTemplate(template);
    setTestResult(null);
    setTestLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: template.category,
          subcategory: template.subcategory || undefined,
          shot: template.shot || undefined,
          variationCount: 1,
          mode: "generate",
          _testPrompt: template.promptText,
          _testNegative: template.negativePrompt,
        }),
      });
      if (!res.ok) throw new Error("Test failed");
      const json = await res.json();

      // Poll for result
      const pollForResult = async (genId: string) => {
        const startTime = Date.now();
        const poll = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/generate/status/${genId}`);
            const statusData = await statusRes.json();
            if (statusData.status === "COMPLETED") {
              clearInterval(poll);
              setTestResult({
                imageUrl:
                  statusData.images?.[0]?.url ||
                  statusData.imageUrl ||
                  "",
                latencyMs: Date.now() - startTime,
              });
              setTestLoading(false);
            } else if (statusData.status === "FAILED") {
              clearInterval(poll);
              setTestLoading(false);
              toast.error("Test generation failed");
            }
          } catch {
            clearInterval(poll);
            setTestLoading(false);
            toast.error("Test polling failed");
          }
        }, 2000);
      };

      if (json.id) {
        await pollForResult(json.id);
      } else {
        setTestLoading(false);
        toast.error("No generation ID returned");
      }
    } catch {
      toast.error("Test failed");
      setTestLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Prompt Templates</h1>
          <p className="text-text-muted mt-1">
            Manage, generate, and approve AI image generation prompts.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={openAddForm}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface border border-border text-text-primary font-heading font-bold rounded-xl hover:border-gold/30 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Template
          </button>
          <button
            onClick={() => {
              setAiResults([]);
              setAiModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-black font-heading font-bold rounded-xl hover:bg-gold/90 transition-colors text-sm"
          >
            <Sparkles className="w-4 h-4" />
            Generate AI Prompts
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-gold" />
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Total Templates
            </span>
          </div>
          <p className="text-2xl font-heading font-bold">{totalCount}</p>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Approved
            </span>
          </div>
          <p className="text-2xl font-heading font-bold text-emerald-400">
            {approvedCount}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              AI Generated
            </span>
          </div>
          <p className="text-2xl font-heading font-bold text-purple-400">
            {aiCount_}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Category filter */}
        <div className="relative">
          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setPage(1);
            }}
            className="appearance-none bg-surface-2 border border-border rounded-xl px-4 py-2.5 pr-10 text-sm text-text-primary focus:outline-none focus:border-gold/40 transition-colors"
          >
            <option value="">All Categories</option>
            {categoryOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle pointer-events-none" />
        </div>

        {/* Status tabs */}
        <div className="inline-flex p-1 bg-surface-2 border border-border rounded-full">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setFilterStatus(tab.value);
                setPage(1);
              }}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium transition-all",
                filterStatus === tab.value
                  ? "bg-gold text-black"
                  : "text-text-muted hover:text-text-primary"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Source filter */}
        <div className="relative">
          <select
            value={filterSource}
            onChange={(e) => {
              setFilterSource(e.target.value);
              setPage(1);
            }}
            className="appearance-none bg-surface-2 border border-border rounded-xl px-4 py-2.5 pr-10 text-sm text-text-primary focus:outline-none focus:border-gold/40 transition-colors"
          >
            {SOURCE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle pointer-events-none" />
        </div>
      </div>

      {/* Templates Table */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {[
                  "Category",
                  "Subcategory",
                  "Prompt",
                  "Source",
                  "Status",
                  "Usage",
                  "Rating",
                  "Actions",
                ].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-20 bg-surface-2 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : templates.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-text-muted"
                  >
                    No prompt templates found. Add one or generate with AI.
                  </td>
                </tr>
              ) : (
                templates.map((template) => (
                  <tr
                    key={template.id}
                    className="border-b border-border/50 hover:bg-surface-2/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium capitalize">
                      {template.category}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {template.subcategory || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted max-w-[280px]">
                      <span className="line-clamp-2" title={template.promptText}>
                        {template.promptText.length > 80
                          ? template.promptText.slice(0, 80) + "..."
                          : template.promptText}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {sourceBadge(template.source)}
                    </td>
                    <td className="px-4 py-3">
                      {statusBadge(template.status)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted font-mono">
                      {template.usageCount}
                    </td>
                    <td className="px-4 py-3">
                      <RatingStars
                        rating={template.rating}
                        onChange={(val) => handleRate(template.id, val)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {template.status !== "approved" && (
                          <button
                            onClick={() =>
                              handleAction(template.id, "approve")
                            }
                            className="p-1.5 rounded-lg text-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {template.status !== "rejected" && (
                          <button
                            onClick={() =>
                              handleAction(template.id, "reject")
                            }
                            className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Reject"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditForm(template)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => runTest(template)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                          title="Test"
                        >
                          <TestTube className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(template)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-text-muted">
              Page {page} of {totalPages} ({total} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs rounded-lg bg-surface-2 border border-border text-text-muted hover:text-text-primary disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs rounded-lg bg-surface-2 border border-border text-text-muted hover:text-text-primary disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Template Modal */}
      {formOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setFormOpen(false)}
        >
          <div
            className="bg-surface border border-border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-lg font-bold">
                {editingTemplate ? "Edit Template" : "Add Template"}
              </h3>
              <button
                onClick={() => setFormOpen(false)}
                className="p-1 rounded-lg hover:bg-surface-2"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none focus:border-gold/40"
                >
                  {categoryOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                  Subcategory
                </label>
                <input
                  type="text"
                  value={formData.subcategory}
                  onChange={(e) =>
                    setFormData({ ...formData, subcategory: e.target.value })
                  }
                  placeholder="e.g. rolex, ferrari, deck_front"
                  className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm placeholder:text-text-muted focus:outline-none focus:border-gold/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                  Shot Type
                </label>
                <input
                  type="text"
                  value={formData.shot}
                  onChange={(e) =>
                    setFormData({ ...formData, shot: e.target.value })
                  }
                  placeholder="e.g. exterior, interior_wheel"
                  className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm placeholder:text-text-muted focus:outline-none focus:border-gold/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                  Prompt Text
                </label>
                <textarea
                  value={formData.promptText}
                  onChange={(e) =>
                    setFormData({ ...formData, promptText: e.target.value })
                  }
                  rows={6}
                  placeholder="Ultra-photorealistic photograph of..."
                  className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm placeholder:text-text-muted focus:outline-none focus:border-gold/40 resize-none"
                />
                <p className="text-[10px] text-text-subtle mt-1">
                  Use {"{brand}"}, {"{model}"}, {"{color}"} as placeholders
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                  Negative Prompt
                </label>
                <textarea
                  value={formData.negativePrompt}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      negativePrompt: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="watermark, text, logo, blurry..."
                  className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm placeholder:text-text-muted focus:outline-none focus:border-gold/40 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setFormOpen(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-surface-2 border border-border text-text-muted hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={formSaving}
                className="flex-1 px-4 py-2.5 text-sm font-heading font-bold rounded-xl bg-gold text-black hover:bg-gold/90 transition-colors disabled:opacity-50"
              >
                {formSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : editingTemplate ? (
                  "Update Template"
                ) : (
                  "Save Template"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generate Modal */}
      {aiModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setAiModalOpen(false)}
        >
          <div
            className="bg-surface border border-border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-lg font-bold">
                Generate AI Prompts
              </h3>
              <button
                onClick={() => setAiModalOpen(false)}
                className="p-1 rounded-lg hover:bg-surface-2"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                  Category
                </label>
                <select
                  value={aiCategory}
                  onChange={(e) => setAiCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none focus:border-gold/40"
                >
                  {categoryOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                  Subcategory{" "}
                  <span className="text-text-subtle">(optional)</span>
                </label>
                <input
                  type="text"
                  value={aiSubcategory}
                  onChange={(e) => setAiSubcategory(e.target.value)}
                  placeholder="e.g. rolex, ferrari"
                  className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm placeholder:text-text-muted focus:outline-none focus:border-gold/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                  Number of Prompts (1-10)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={aiCount}
                  onChange={(e) =>
                    setAiCount(
                      Math.min(10, Math.max(1, parseInt(e.target.value) || 1))
                    )
                  }
                  className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none focus:border-gold/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                  Base Prompt{" "}
                  <span className="text-text-subtle">(optional)</span>
                </label>
                <textarea
                  value={aiBasePrompt}
                  onChange={(e) => setAiBasePrompt(e.target.value)}
                  rows={3}
                  placeholder="Optional context or style direction for the AI..."
                  className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm placeholder:text-text-muted focus:outline-none focus:border-gold/40 resize-none"
                />
              </div>

              <button
                onClick={handleAIGenerate}
                disabled={aiGenerating}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gold text-black font-heading font-bold text-sm hover:bg-gold/90 transition-colors disabled:opacity-50"
              >
                {aiGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate
                  </>
                )}
              </button>
            </div>

            {/* AI Results */}
            {aiResults.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="text-sm font-heading font-bold text-text-muted uppercase tracking-wider">
                  Generated Prompts
                </h4>
                {aiResults.map((result) => (
                  <div
                    key={result.id}
                    className="p-4 rounded-xl bg-surface-2 border border-border space-y-2"
                  >
                    <p className="text-xs text-text-primary line-clamp-3">
                      {result.promptText}
                    </p>
                    <div className="flex items-center gap-2">
                      {statusBadge(result.status)}
                      <div className="flex-1" />
                      <button
                        onClick={() =>
                          handleAction(result.id, "approve")
                        }
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          handleAction(result.id, "reject")
                        }
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => {
                    setAiModalOpen(false);
                    fetchTemplates();
                  }}
                  className="w-full py-2.5 rounded-xl bg-surface border border-border text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test Result Modal */}
      {testingTemplate && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setTestingTemplate(null);
            setTestResult(null);
          }}
        >
          <div
            className="bg-surface border border-border rounded-2xl p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold">
                Test Prompt
              </h3>
              <button
                onClick={() => {
                  setTestingTemplate(null);
                  setTestResult(null);
                }}
                className="p-1 rounded-lg hover:bg-surface-2"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            <p className="text-xs text-text-muted mb-4 line-clamp-3 font-mono bg-surface-2 rounded-lg p-3 border border-border">
              {testingTemplate.promptText.slice(0, 200)}
              {testingTemplate.promptText.length > 200 ? "..." : ""}
            </p>

            {testLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-gold animate-spin mb-4" />
                <p className="text-sm text-text-muted">
                  Running test generation...
                </p>
              </div>
            ) : testResult ? (
              <div className="space-y-4">
                <div className="aspect-square rounded-xl bg-bg border border-border overflow-hidden">
                  <img
                    src={testResult.imageUrl}
                    alt="Test generation"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-surface-2 border border-border">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gold" />
                    <span className="text-sm font-medium">Latency</span>
                  </div>
                  <span className="text-lg font-heading font-bold text-gold">
                    {(testResult.latencyMs / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-text-muted">
                <XCircle className="w-8 h-8 mb-4 text-red-400" />
                <p className="text-sm">
                  Test failed. Check prompt or model configuration.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
