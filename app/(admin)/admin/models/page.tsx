"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Plus,
  Star,
  Power,
  Pencil,
  Trash2,
  TestTube,
  X,
  Loader2,
  CheckCircle,
  XCircle,
  Cpu,
  DollarSign,
  Clock,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";

interface ModelRecord {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  isActive: boolean;
  isDefault: boolean;
  costPerGen: number;
  avgSeconds: number | null;
  notes: string | null;
  createdAt: string;
}

interface TestResult {
  imageUrl: string;
  latencyMs: number;
}

const PROVIDERS = [
  { value: "fal", label: "fal.ai" },
  { value: "replicate", label: "Replicate" },
  { value: "openai", label: "OpenAI" },
  { value: "stability", label: "Stability AI" },
];

function providerLabel(provider: string) {
  return PROVIDERS.find((p) => p.value === provider)?.label || provider;
}

export default function AdminModelsPage() {
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayGens, setTodayGens] = useState(0);

  // Add/Edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelRecord | null>(null);
  const [formData, setFormData] = useState({
    provider: "fal",
    modelId: "",
    name: "",
    costPerGen: 0.01,
    notes: "",
  });
  const [formSaving, setFormSaving] = useState(false);

  // Test modal
  const [testingModel, setTestingModel] = useState<ModelRecord | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/models");
      if (!res.ok) throw new Error("Failed to fetch models");
      const json = await res.json();
      setModels(json.models || []);
      setTodayGens(json.todayGenerations || 0);
    } catch {
      toast.error("Failed to load models");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const openAddForm = () => {
    setEditingModel(null);
    setFormData({ provider: "fal", modelId: "", name: "", costPerGen: 0.01, notes: "" });
    setFormOpen(true);
  };

  const openEditForm = (model: ModelRecord) => {
    setEditingModel(model);
    setFormData({
      provider: model.provider,
      modelId: model.modelId,
      name: model.name,
      costPerGen: model.costPerGen,
      notes: model.notes || "",
    });
    setFormOpen(true);
  };

  const handleSaveModel = async () => {
    if (!formData.name || !formData.modelId) {
      toast.error("Name and Model ID are required");
      return;
    }
    setFormSaving(true);
    try {
      const method = editingModel ? "PATCH" : "POST";
      const body = editingModel
        ? { id: editingModel.id, action: "update", ...formData }
        : formData;

      const res = await fetch("/api/admin/models", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save model");
      toast.success(editingModel ? "Model updated" : "Model added");
      setFormOpen(false);
      fetchModels();
    } catch {
      toast.error("Failed to save model");
    } finally {
      setFormSaving(false);
    }
  };

  const toggleDefault = async (model: ModelRecord) => {
    try {
      const res = await fetch("/api/admin/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: model.id, action: "setDefault" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`${model.name} is now the default model`);
      fetchModels();
    } catch {
      toast.error("Failed to set default model");
    }
  };

  const toggleActive = async (model: ModelRecord) => {
    try {
      const res = await fetch("/api/admin/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: model.id,
          action: "toggleActive",
          isActive: !model.isActive,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(
        `${model.name} ${!model.isActive ? "activated" : "deactivated"}`
      );
      fetchModels();
    } catch {
      toast.error("Failed to toggle model");
    }
  };

  const deleteModel = async (model: ModelRecord) => {
    if (!confirm(`Delete ${model.name}? This cannot be undone.`)) return;
    try {
      const res = await fetch("/api/admin/models", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: model.id }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Deleted ${model.name}`);
      fetchModels();
    } catch {
      toast.error("Failed to delete model");
    }
  };

  const runTest = async (model: ModelRecord) => {
    setTestingModel(model);
    setTestResult(null);
    setTestLoading(true);
    try {
      const res = await fetch("/api/admin/models/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: model.id }),
      });
      if (!res.ok) throw new Error("Test failed");
      const json = await res.json();
      setTestResult(json);
    } catch {
      toast.error("Model test failed");
      setTestingModel(null);
    } finally {
      setTestLoading(false);
    }
  };

  const activeModel = models.find((m) => m.isDefault && m.isActive);
  const estimatedDailyCost = activeModel
    ? todayGens * activeModel.costPerGen
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">AI Models</h1>
          <p className="text-text-muted mt-1">
            Configure, test, and switch between AI image generation models.
          </p>
        </div>
        <button
          onClick={openAddForm}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-black font-heading font-bold rounded-xl hover:bg-gold/90 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Model
        </button>
      </div>

      {/* Cost Tracker */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-gold" />
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Today&apos;s Generations
            </span>
          </div>
          <p className="text-2xl font-heading font-bold">{todayGens}</p>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-gold" />
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Est. Daily Cost
            </span>
          </div>
          <p className="text-2xl font-heading font-bold text-gold">
            ${estimatedDailyCost.toFixed(2)}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-4 h-4 text-gold" />
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Active Model
            </span>
          </div>
          <p className="text-lg font-heading font-bold truncate">
            {activeModel?.name || "None set"}
          </p>
        </div>
      </div>

      {/* Models Table */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Name", "Provider", "Model ID", "Cost/Gen", "Avg Time", "Status", "Default", "Actions"].map(
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
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-20 bg-surface-2 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : models.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-text-muted"
                  >
                    No models configured. Add one to get started.
                  </td>
                </tr>
              ) : (
                models.map((model) => (
                  <tr
                    key={model.id}
                    className="border-b border-border/50 hover:bg-surface-2/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium">
                      {model.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {providerLabel(model.provider)}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted font-mono truncate max-w-[200px]">
                      {model.modelId}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gold">
                      ${model.costPerGen.toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {model.avgSeconds ? `${model.avgSeconds}s` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium",
                          model.isActive
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-zinc-500/10 text-zinc-400"
                        )}
                      >
                        {model.isActive ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {model.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleDefault(model)}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          model.isDefault
                            ? "text-gold bg-gold/10"
                            : "text-text-muted hover:text-gold hover:bg-gold/5"
                        )}
                        title={model.isDefault ? "Default model" : "Set as default"}
                      >
                        <Star
                          className="w-4 h-4"
                          fill={model.isDefault ? "currentColor" : "none"}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditForm(model)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => runTest(model)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                          title="Test"
                        >
                          <TestTube className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleActive(model)}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            model.isActive
                              ? "text-emerald-400 hover:text-yellow-400 hover:bg-yellow-500/10"
                              : "text-text-muted hover:text-emerald-400 hover:bg-emerald-500/10"
                          )}
                          title={model.isActive ? "Deactivate" : "Activate"}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteModel(model)}
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
      </div>

      {/* Cost Comparison */}
      {models.length > 1 && todayGens > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h3 className="font-heading font-bold text-lg mb-4">
            Cost Comparison
          </h3>
          <p className="text-xs text-text-muted mb-4">
            Estimated daily cost if you switched default model (based on{" "}
            {todayGens} generations today)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {models
              .filter((m) => m.isActive)
              .map((model) => {
                const estCost = todayGens * model.costPerGen;
                const isDefault = model.isDefault;
                return (
                  <div
                    key={model.id}
                    className={cn(
                      "p-4 rounded-xl border transition-colors",
                      isDefault
                        ? "border-gold/30 bg-gold/5"
                        : "border-border bg-surface-2"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium truncate">
                        {model.name}
                      </span>
                      {isDefault && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-gold/10 text-gold font-medium">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <p className="text-xl font-heading font-bold text-gold">
                      ${estCost.toFixed(2)}
                      <span className="text-xs text-text-muted font-normal ml-1">
                        /day
                      </span>
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      ${model.costPerGen.toFixed(3)} per gen
                    </p>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Provider Status */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        <h3 className="font-heading font-bold text-lg mb-4">
          Provider Status
        </h3>
        <div className="flex flex-wrap gap-4">
          {PROVIDERS.map((provider) => {
            const hasModels = models.some(
              (m) => m.provider === provider.value && m.isActive
            );
            return (
              <div
                key={provider.value}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-2 border border-border"
              >
                <div
                  className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    hasModels ? "bg-emerald-400" : "bg-zinc-600"
                  )}
                />
                <span className="text-sm font-medium">{provider.label}</span>
                <span className="text-xs text-text-muted">
                  {hasModels ? "configured" : "not configured"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Model Modal */}
      {formOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setFormOpen(false)}
        >
          <div
            className="bg-surface border border-border rounded-2xl p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-lg font-bold">
                {editingModel ? "Edit Model" : "Add Model"}
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
                  Provider
                </label>
                <select
                  value={formData.provider}
                  onChange={(e) =>
                    setFormData({ ...formData, provider: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none focus:border-gold/40"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                  Model ID
                </label>
                <input
                  type="text"
                  value={formData.modelId}
                  onChange={(e) =>
                    setFormData({ ...formData, modelId: e.target.value })
                  }
                  placeholder="e.g. fal-ai/flux/dev"
                  className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm placeholder:text-text-muted focus:outline-none focus:border-gold/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. Flux Dev"
                  className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm placeholder:text-text-muted focus:outline-none focus:border-gold/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                  Cost per Generation ($)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={formData.costPerGen}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      costPerGen: Number(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none focus:border-gold/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                  placeholder="Optional notes about this model..."
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
                onClick={handleSaveModel}
                disabled={formSaving}
                className="flex-1 px-4 py-2.5 text-sm font-heading font-bold rounded-xl bg-gold text-black hover:bg-gold/90 transition-colors disabled:opacity-50"
              >
                {formSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : editingModel ? (
                  "Update Model"
                ) : (
                  "Add Model"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Result Modal */}
      {testingModel && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setTestingModel(null);
            setTestResult(null);
          }}
        >
          <div
            className="bg-surface border border-border rounded-2xl p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-lg font-bold">
                Test: {testingModel.name}
              </h3>
              <button
                onClick={() => {
                  setTestingModel(null);
                  setTestResult(null);
                }}
                className="p-1 rounded-lg hover:bg-surface-2"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            <p className="text-xs text-text-muted mb-4 font-mono">
              Prompt: &quot;A luxury gold watch on a marble surface,
              photorealistic&quot;
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
                <p className="text-sm">Test failed. Check model configuration.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
