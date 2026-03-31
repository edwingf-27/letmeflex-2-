"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical,
  Play,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Trophy,
  Clock,
  ImageIcon,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Zap,
  Check,
} from "lucide-react";
import { SCENE_CATEGORIES, ALL_SCENES } from "@/types/scenes";
import { cn } from "@/lib/utils";

interface ModelOption {
  id: string;
  modelId: string;
  provider: string;
  name: string;
  isActive: boolean;
}

interface TestResult {
  id: string;
  modelId: string;
  modelName: string;
  provider: string;
  prompt: string;
  promptIndex: number;
  imageUrl: string;
  durationMs: number;
  variationIndex: number;
  rating?: "up" | "down" | null;
  error?: string;
}

interface TestRun {
  testRunId: string;
  sceneId: string;
  sceneLabel?: string;
  models: string[];
  totalImages: number;
  results: TestResult[];
  createdAt?: string;
}

// ─── Fetch helpers ───────────────────────────────────────────────

function fetchModels(): Promise<ModelOption[]> {
  return fetch("/api/admin/models")
    .then((r) => r.json())
    .then((d) => d.models || []);
}

function fetchTestHistory(): Promise<TestRun[]> {
  return fetch("/api/admin/ab-test?limit=100")
    .then((r) => r.json())
    .then((d) => d.testRuns || []);
}

// ─── Page ────────────────────────────────────────────────────────

export default function ABTestingPage() {
  const queryClient = useQueryClient();

  // State
  const [selectedScene, setSelectedScene] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [variations, setVariations] = useState(3);
  const [promptVariants, setPromptVariants] = useState("");
  const [currentRun, setCurrentRun] = useState<TestRun | null>(null);
  const [generatingProgress, setGeneratingProgress] = useState({ current: 0, total: 0 });
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  // Queries
  const { data: models = [] } = useQuery<ModelOption[]>({
    queryKey: ["admin-models"],
    queryFn: fetchModels,
  });

  const { data: history = [], isLoading: historyLoading } = useQuery<TestRun[]>({
    queryKey: ["ab-test-history"],
    queryFn: fetchTestHistory,
  });

  const activeModels = models.filter((m) => m.isActive);

  // Toggle model selection
  const toggleModel = useCallback(
    (modelId: string) => {
      setSelectedModels((prev) =>
        prev.includes(modelId)
          ? prev.filter((id) => id !== modelId)
          : [...prev, modelId]
      );
    },
    []
  );

  // Run test mutation
  const runTestMutation = useMutation({
    mutationFn: async () => {
      const chosenModels = activeModels.filter((m) => selectedModels.includes(m.id));
      const variants = promptVariants
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const promptCount = variants.length || 1;
      const total = chosenModels.length * promptCount * variations;
      setGeneratingProgress({ current: 0, total });

      const res = await fetch("/api/admin/ab-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneId: selectedScene,
          models: chosenModels.map((m) => ({
            modelId: m.modelId,
            provider: m.provider,
            name: m.name,
          })),
          variationsPerModel: variations,
          promptVariants: variants.length > 0 ? variants : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Test failed");
      }

      return res.json();
    },
    onSuccess: (data) => {
      setCurrentRun(data);
      setGeneratingProgress({ current: data.totalImages, total: data.totalImages });
      toast.success(`Test complete! ${data.totalImages} images generated.`);
      queryClient.invalidateQueries({ queryKey: ["ab-test-history"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setGeneratingProgress({ current: 0, total: 0 });
    },
  });

  // Rate mutation
  const rateMutation = useMutation({
    mutationFn: async ({
      generationId,
      rating,
    }: {
      generationId: string;
      rating: "up" | "down" | null;
    }) => {
      const res = await fetch("/api/admin/ab-test", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId, rating }),
      });
      if (!res.ok) throw new Error("Rating failed");
      return { generationId, rating };
    },
    onSuccess: ({ generationId, rating }) => {
      // Update current run results locally
      if (currentRun) {
        setCurrentRun({
          ...currentRun,
          results: currentRun.results.map((r) =>
            r.id === generationId ? { ...r, rating } : r
          ),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["ab-test-history"] });
    },
  });

  // Derive scene label
  const selectedSceneObj = ALL_SCENES.find((s) => s.id === selectedScene);
  const canRun =
    selectedScene && selectedModels.length > 0 && !runTestMutation.isPending;

  // Group results by model for comparison grid
  const groupResultsByModel = (results: TestResult[]) => {
    const groups: Record<string, TestResult[]> = {};
    for (const r of results) {
      const key = r.modelName || r.modelId;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }
    return groups;
  };

  // Compute stats per model
  const computeModelStats = (results: TestResult[]) => {
    const grouped = groupResultsByModel(results);
    return Object.entries(grouped).map(([name, items]) => {
      const successful = items.filter((i) => i.imageUrl && !i.error);
      const avgLatency =
        successful.length > 0
          ? successful.reduce((sum, i) => sum + i.durationMs, 0) / successful.length
          : 0;
      const upVotes = items.filter((i) => i.rating === "up").length;
      const downVotes = items.filter((i) => i.rating === "down").length;
      return {
        name,
        provider: items[0]?.provider || "",
        totalImages: items.length,
        successfulImages: successful.length,
        avgLatencyMs: Math.round(avgLatency),
        upVotes,
        downVotes,
        score: upVotes - downVotes,
      };
    });
  };

  // Find the best model from current run
  const getBestModel = (results: TestResult[]) => {
    const stats = computeModelStats(results);
    if (stats.length === 0) return null;
    const rated = stats.filter((s) => s.upVotes > 0 || s.downVotes > 0);
    if (rated.length === 0) return null;
    return rated.sort((a, b) => b.score - a.score)[0]?.name || null;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl font-extrabold flex items-center gap-3">
          <FlaskConical className="w-8 h-8 text-gold" />
          A/B Testing
        </h1>
        <p className="text-text-muted mt-1">
          Compare models side-by-side. Generate images with different models and
          rate the results.
        </p>
      </div>

      {/* ─── Run A/B Test Section ─────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-2xl p-6 space-y-6">
        <h2 className="font-heading text-xl font-bold flex items-center gap-2">
          <Play className="w-5 h-5 text-gold" />
          Run A/B Test
        </h2>

        {/* Scene Selector */}
        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Scene
          </label>
          <select
            value={selectedScene}
            onChange={(e) => setSelectedScene(e.target.value)}
            className="w-full bg-[#0C0C0E] border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 appearance-none"
          >
            <option value="">Select a scene...</option>
            {SCENE_CATEGORIES.map((cat) => (
              <optgroup key={cat.id} label={`${cat.icon} ${cat.label}`}>
                {cat.scenes.map((scene) => (
                  <option key={scene.id} value={scene.id}>
                    {scene.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Model Selector */}
        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">
            Models to compare
          </label>
          {activeModels.length === 0 ? (
            <p className="text-text-muted text-sm italic">
              No active models found. Add models in the Models settings first.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeModels.map((model) => {
                const isSelected = selectedModels.includes(model.id);
                return (
                  <button
                    key={model.id}
                    onClick={() => toggleModel(model.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border text-left transition-all text-sm",
                      isSelected
                        ? "border-gold/40 bg-gold/5 text-white"
                        : "border-border bg-[#0C0C0E] text-text-muted hover:border-border hover:bg-surface-2"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                        isSelected
                          ? "border-gold bg-gold"
                          : "border-border"
                      )}
                    >
                      {isSelected && (
                        <Check className="w-3 h-3 text-black" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{model.name}</p>
                      <p className="text-xs text-text-muted truncate">
                        {model.provider} / {model.modelId}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Variations */}
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-text-muted mb-2">
              Variations per model
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={variations}
              onChange={(e) =>
                setVariations(Math.max(1, Math.min(10, Number(e.target.value))))
              }
              className="w-full bg-[#0C0C0E] border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          <div className="flex-[2]">
            <label className="block text-sm font-medium text-text-muted mb-2">
              Prompt variants{" "}
              <span className="text-text-muted/60">(optional, one per line)</span>
            </label>
            <textarea
              value={promptVariants}
              onChange={(e) => setPromptVariants(e.target.value)}
              placeholder="Leave empty to use the scene's default prompt. Or enter custom prompt variations, one per line."
              rows={3}
              className="w-full bg-[#0C0C0E] border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none"
            />
          </div>
        </div>

        {/* Run Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => runTestMutation.mutate()}
            disabled={!canRun}
            className={cn(
              "px-8 py-3 rounded-xl font-heading font-bold text-sm transition-all flex items-center gap-2",
              canRun
                ? "bg-gold text-black hover:bg-gold/90"
                : "bg-gold/20 text-gold/40 cursor-not-allowed"
            )}
          >
            {runTestMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Run Test
              </>
            )}
          </button>

          {runTestMutation.isPending && generatingProgress.total > 0 && (
            <div className="flex items-center gap-3 text-sm text-text-muted">
              <div className="w-48 h-2 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold rounded-full transition-all"
                  style={{ width: "100%" }}
                />
              </div>
              <span>
                Generating {generatingProgress.total} images...
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Test Results Section ─────────────────────────────────── */}
      <AnimatePresence>
        {currentRun && currentRun.results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface border border-border rounded-2xl p-6 space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-gold" />
                Test Results
              </h2>
              <div className="text-sm text-text-muted">
                {currentRun.sceneLabel || currentRun.sceneId} &middot;{" "}
                {currentRun.totalImages} images
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {computeModelStats(currentRun.results).map((stat) => {
                const isBest = getBestModel(currentRun.results) === stat.name;
                return (
                  <div
                    key={stat.name}
                    className={cn(
                      "p-4 rounded-xl border",
                      isBest
                        ? "border-gold/40 bg-gold/5"
                        : "border-border bg-[#0C0C0E]"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-heading font-bold text-sm truncate">
                        {stat.name}
                      </p>
                      {isBest && (
                        <Trophy className="w-4 h-4 text-gold flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-text-muted mb-1">
                      {stat.provider}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-text-muted" />
                        <span>
                          {(stat.avgLatencyMs / 1000).toFixed(1)}s avg
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-text-muted" />
                        <span>{stat.successfulImages}/{stat.totalImages}</span>
                      </div>
                      {(stat.upVotes > 0 || stat.downVotes > 0) && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-green-400">{stat.upVotes}</span>
                          <span className="text-text-muted">/</span>
                          <span className="text-red-400">{stat.downVotes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comparison Grid */}
            <ComparisonGrid
              results={currentRun.results}
              bestModel={getBestModel(currentRun.results)}
              onRate={(id, rating) =>
                rateMutation.mutate({ generationId: id, rating })
              }
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Previous Tests Section ───────────────────────────────── */}
      <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
        <h2 className="font-heading text-xl font-bold flex items-center gap-2">
          <Clock className="w-5 h-5 text-gold" />
          Previous Tests
        </h2>

        {historyLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-gold animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-text-muted text-sm py-8 text-center">
            No previous tests found. Run your first A/B test above.
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((run) => {
              const isExpanded = expandedRun === run.testRunId;
              const scene = ALL_SCENES.find((s) => s.id === run.sceneId);
              const best = getBestModel(run.results);
              return (
                <div key={run.testRunId} className="border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() =>
                      setExpandedRun(isExpanded ? null : run.testRunId)
                    }
                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-surface-2 transition-colors text-left"
                  >
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-text-muted" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-text-muted" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
                      <div>
                        <p className="text-text-muted text-xs">Scene</p>
                        <p className="font-medium truncate">
                          {scene?.label || run.sceneId}
                        </p>
                      </div>
                      <div>
                        <p className="text-text-muted text-xs">Models</p>
                        <p className="truncate">{run.models.join(", ")}</p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-text-muted text-xs">Date</p>
                        <p>
                          {run.createdAt
                            ? new Date(run.createdAt).toLocaleDateString()
                            : "—"}
                        </p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-text-muted text-xs">Images</p>
                        <p>{run.totalImages}</p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-text-muted text-xs">Best</p>
                        <p className={best ? "text-gold font-medium" : "text-text-muted"}>
                          {best || "Not rated"}
                        </p>
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-2 border-t border-border space-y-4">
                          {/* Stats */}
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {computeModelStats(run.results).map((stat) => {
                              const isBest = best === stat.name;
                              return (
                                <div
                                  key={stat.name}
                                  className={cn(
                                    "p-3 rounded-lg border text-xs",
                                    isBest
                                      ? "border-gold/30 bg-gold/5"
                                      : "border-border bg-[#0C0C0E]"
                                  )}
                                >
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="font-bold">{stat.name}</span>
                                    {isBest && <Trophy className="w-3 h-3 text-gold" />}
                                  </div>
                                  <p className="text-text-muted">
                                    {(stat.avgLatencyMs / 1000).toFixed(1)}s avg
                                    &middot; {stat.upVotes} up / {stat.downVotes}{" "}
                                    down
                                  </p>
                                </div>
                              );
                            })}
                          </div>

                          {/* Grid */}
                          <ComparisonGrid
                            results={run.results}
                            bestModel={best}
                            onRate={(id, rating) =>
                              rateMutation.mutate({ generationId: id, rating })
                            }
                            compact
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Comparison Grid Component ───────────────────────────────────

function ComparisonGrid({
  results,
  bestModel,
  onRate,
  compact = false,
}: {
  results: TestResult[];
  bestModel: string | null;
  onRate: (id: string, rating: "up" | "down" | null) => void;
  compact?: boolean;
}) {
  // Group by model
  const grouped: Record<string, TestResult[]> = {};
  for (const r of results) {
    const key = r.modelName || r.modelId;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  }

  const modelNames = Object.keys(grouped);
  const maxRows = Math.max(...Object.values(grouped).map((g) => g.length));

  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${modelNames.length}, minmax(${compact ? "180px" : "240px"}, 1fr))`,
        }}
      >
        {/* Header row */}
        {modelNames.map((name) => {
          const isBest = bestModel === name;
          return (
            <div
              key={name}
              className={cn(
                "px-3 py-2 rounded-lg text-center font-heading font-bold text-sm",
                isBest
                  ? "bg-gold/10 text-gold border border-gold/20"
                  : "bg-[#0C0C0E] text-text-muted border border-border"
              )}
            >
              <div className="flex items-center justify-center gap-1.5">
                {isBest && <Trophy className="w-3.5 h-3.5" />}
                {name}
              </div>
            </div>
          );
        })}

        {/* Image rows */}
        {Array.from({ length: maxRows }).map((_, rowIdx) =>
          modelNames.map((name) => {
            const item = grouped[name][rowIdx];
            if (!item) {
              return <div key={`${name}-${rowIdx}`} />;
            }
            return (
              <div
                key={item.id}
                className="bg-[#0C0C0E] border border-border rounded-xl overflow-hidden"
              >
                {item.imageUrl ? (
                  <div className="aspect-video relative bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={`${name} variation ${rowIdx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="aspect-video flex items-center justify-center bg-red-500/5 text-red-400 text-xs p-2 text-center">
                    {item.error || "Generation failed"}
                  </div>
                )}
                <div className="p-2.5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {(item.durationMs / 1000).toFixed(1)}s
                    </span>
                    <span className="text-text-muted/60">
                      v{item.variationIndex + 1}
                    </span>
                  </div>
                  {/* Rating buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        onRate(item.id, item.rating === "up" ? null : "up")
                      }
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all",
                        item.rating === "up"
                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                          : "bg-surface-2 text-text-muted hover:text-green-400 border border-transparent"
                      )}
                    >
                      <ThumbsUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() =>
                        onRate(item.id, item.rating === "down" ? null : "down")
                      }
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all",
                        item.rating === "down"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-surface-2 text-text-muted hover:text-red-400 border border-transparent"
                      )}
                    >
                      <ThumbsDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
