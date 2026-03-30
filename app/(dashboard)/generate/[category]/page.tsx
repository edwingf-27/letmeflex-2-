"use client";

import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useCallback, useRef, useEffect } from "react";
import { CATEGORIES } from "@/types/categories";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Download,
  Loader2,
  ChevronDown,
  RotateCcw,
  Lock,
  Coins,
  ScanFace,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";

type GenerationStatus = "idle" | "generating" | "completed" | "failed";

export default function CategoryGeneratePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const categoryKey = params.category as string;
  const category = CATEGORIES[categoryKey];

  const [selectedSubcategory, setSelectedSubcategory] = useState(
    category?.subcategories[0]?.id || ""
  );
  const [selectedShot, setSelectedShot] = useState(
    category?.shots?.[0]?.id || ""
  );
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [color, setColor] = useState("");
  const [faceSwap, setFaceSwap] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(
    null
  );
  const [generationId, setGenerationId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const user = session?.user;
  const userPlan = user?.plan ?? "FREE";
  const canFaceSwap = userPlan !== "FREE";
  const creditsCost = faceSwap ? 2 : 1;

  // Find the active subcategory object
  const activeSubcategory = category?.subcategories.find(
    (s) => s.id === selectedSubcategory
  );

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const pollStatus = useCallback(
    (id: string) => {
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/generate/status/${id}`);
          if (!res.ok) throw new Error("Failed to check status");
          const data = await res.json();

          if (data.status === "COMPLETED") {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setGeneratedImageUrl(data.imageUrl);
            setStatus("completed");
          } else if (data.status === "FAILED") {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setStatus("failed");
            toast.error(data.error || "Generation failed. Please try again.");
          }
        } catch {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setStatus("failed");
          toast.error("Something went wrong. Please try again.");
        }
      }, 2000);
    },
    []
  );

  const handleGenerate = async () => {
    if (!user) {
      toast.error("Please sign in to generate images.");
      return;
    }

    if ((user.credits ?? 0) < creditsCost) {
      toast.error("Not enough credits. Purchase more to continue.");
      router.push("/credits");
      return;
    }

    setStatus("generating");
    setGeneratedImageUrl(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: categoryKey,
          subcategory: selectedSubcategory,
          shot: selectedShot || undefined,
          brand: selectedBrand || undefined,
          model: selectedModel || undefined,
          color: color || undefined,
          faceSwap,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to start generation");
      }

      const data = await res.json();
      setGenerationId(data.id);
      pollStatus(data.id);
    } catch (err: any) {
      setStatus("failed");
      toast.error(err.message || "Failed to start generation.");
    }
  };

  const handleFaceSwapToggle = () => {
    if (!canFaceSwap) {
      setShowUpgradeModal(true);
      return;
    }
    setFaceSwap((prev) => !prev);
  };

  const handleDownload = async () => {
    if (!generatedImageUrl) return;
    try {
      const response = await fetch(generatedImageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `letmeflex-${categoryKey}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download image.");
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setGeneratedImageUrl(null);
    setGenerationId(null);
  };

  if (!category) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <p className="text-text-muted text-lg">Category not found.</p>
        <Link
          href="/generate"
          className="inline-flex items-center gap-2 mt-4 text-gold hover:text-gold-dark transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to categories
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/generate")}
          className="p-2 rounded-xl bg-surface border border-border hover:border-gold/30 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{category.icon}</span>
            <h1 className="text-2xl font-heading font-bold">{category.label}</h1>
          </div>
          <p className="text-sm text-text-muted mt-0.5">
            {category.description}
          </p>
        </div>
      </div>

      {/* Generation Result */}
      <AnimatePresence mode="wait">
        {status === "generating" && (
          <motion.div
            key="generating"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative aspect-square rounded-2xl bg-surface border border-border flex flex-col items-center justify-center gap-4 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent" />
            <Loader2 className="w-10 h-10 text-gold animate-spin relative z-10" />
            <p className="text-sm text-text-muted font-medium relative z-10">
              Generating your flex...
            </p>
            <div className="w-48 h-1 bg-surface-2 rounded-full overflow-hidden relative z-10">
              <div className="h-full bg-gold/60 rounded-full animate-pulse" />
            </div>
          </motion.div>
        )}

        {status === "completed" && generatedImageUrl && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-surface border border-gold/20">
              <Image
                src={generatedImageUrl}
                alt={`${category.label} generation`}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gold text-black font-heading font-bold text-sm hover:bg-gold-dark transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-surface border border-border hover:border-gold/30 font-heading font-bold text-sm transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Generate Another
              </button>
            </div>
            <p className="text-xs text-text-subtle text-center">
              {creditsCost} credit{creditsCost > 1 ? "s" : ""} deducted
            </p>
          </motion.div>
        )}

        {status === "failed" && (
          <motion.div
            key="failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl bg-red-500/10 border border-red-500/20 p-6 text-center"
          >
            <p className="text-red-400 font-medium">Generation failed</p>
            <p className="text-sm text-text-muted mt-1">
              Something went wrong. Please try again.
            </p>
            <button
              onClick={handleReset}
              className="mt-4 px-6 py-2.5 rounded-xl bg-surface border border-border hover:border-gold/30 text-sm font-medium transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Configuration Panel (shown when idle) */}
      {status === "idle" && (
        <div className="space-y-6">
          {/* Subcategory Pills */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-3">
              Style
            </label>
            <div className="flex flex-wrap gap-2">
              {category.subcategories.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => {
                    setSelectedSubcategory(sub.id);
                    setSelectedBrand("");
                    setSelectedModel("");
                  }}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all",
                    selectedSubcategory === sub.id
                      ? "bg-gold text-black"
                      : "bg-surface-2 border border-border text-text-muted hover:text-text-primary hover:border-gold/20"
                  )}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          </div>

          {/* Shot Type (if category has shots) */}
          {category.shots && category.shots.length > 0 && (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-3">
                Shot Type
              </label>
              <div className="flex flex-wrap gap-2">
                {category.shots.map((shot) => (
                  <button
                    key={shot.id}
                    onClick={() => setSelectedShot(shot.id)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all",
                      selectedShot === shot.id
                        ? "bg-gold text-black"
                        : "bg-surface-2 border border-border text-text-muted hover:text-text-primary hover:border-gold/20"
                    )}
                  >
                    {shot.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Brand Dropdown */}
          {activeSubcategory?.brands && activeSubcategory.brands.length > 0 && (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-3">
                Brand / Variant
              </label>
              <div className="relative">
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full appearance-none bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-gold/40 transition-colors"
                >
                  <option value="">Any</option>
                  {activeSubcategory.brands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle pointer-events-none" />
              </div>
            </div>
          )}

          {/* Model Dropdown */}
          {activeSubcategory?.models && activeSubcategory.models.length > 0 && (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-3">
                Model
              </label>
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full appearance-none bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-gold/40 transition-colors"
                >
                  <option value="">Any</option>
                  {activeSubcategory.models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle pointer-events-none" />
              </div>
            </div>
          )}

          {/* Color Input */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-3">
              Color preference{" "}
              <span className="text-text-subtle">(optional)</span>
            </label>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="e.g. Midnight Blue, Rose Gold, Matte Black"
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-subtle focus:outline-none focus:border-gold/40 transition-colors"
            />
          </div>

          {/* Face Swap Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-2 border border-border">
            <div className="flex items-center gap-3">
              <ScanFace className="w-5 h-5 text-gold" />
              <div>
                <p className="text-sm font-medium">Face Swap</p>
                <p className="text-xs text-text-muted">
                  Place your face into the scene (+1 credit)
                </p>
              </div>
            </div>
            <button
              onClick={handleFaceSwapToggle}
              className={cn(
                "relative w-12 h-7 rounded-full transition-colors",
                faceSwap ? "bg-gold" : "bg-surface border border-border"
              )}
            >
              {!canFaceSwap && (
                <Lock className="absolute -top-1 -right-1 w-3.5 h-3.5 text-text-subtle" />
              )}
              <div
                className={cn(
                  "absolute top-1 w-5 h-5 rounded-full transition-all",
                  faceSwap
                    ? "left-6 bg-black"
                    : "left-1 bg-text-subtle"
                )}
              />
            </button>
          </div>

          {/* Credits Cost */}
          <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
            <Coins className="w-4 h-4 text-gold" />
            <span>
              This generation costs{" "}
              <span className="text-gold font-medium">
                {creditsCost} credit{creditsCost > 1 ? "s" : ""}
              </span>
              {faceSwap && (
                <span className="text-text-subtle"> (includes face swap)</span>
              )}
            </span>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gold text-black font-heading font-bold text-base hover:bg-gold-dark hover:shadow-gold transition-all"
          >
            <Sparkles className="w-5 h-5" />
            Generate
          </button>
        </div>
      )}

      {/* Upgrade Modal */}
      <AnimatePresence>
        {showUpgradeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setShowUpgradeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-border rounded-2xl p-6 max-w-sm w-full space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6 text-gold" />
                </div>
                <h3 className="font-heading font-bold text-lg">
                  Upgrade to Unlock Face Swap
                </h3>
                <p className="text-sm text-text-muted mt-2">
                  Face swap is available on Starter plan and above. Upgrade now
                  to place yourself in any scene.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 py-3 rounded-xl bg-surface-2 border border-border text-sm font-medium hover:border-gold/20 transition-colors"
                >
                  Maybe later
                </button>
                <Link
                  href="/credits"
                  className="flex-1 py-3 rounded-xl bg-gold text-black text-center text-sm font-heading font-bold hover:bg-gold-dark transition-colors"
                >
                  Upgrade
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
