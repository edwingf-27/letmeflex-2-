"use client";

import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useCallback, useRef, useEffect, DragEvent } from "react";
import { CATEGORIES, GenerationMode } from "@/types/categories";
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
  Upload,
  ImageIcon,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";

type GenerationStatus = "idle" | "generating" | "completed" | "failed";

interface GeneratedImage {
  url: string;
  index: number;
}

const MODE_OPTIONS: { value: GenerationMode; label: string }[] = [
  { value: "generate", label: "Generate" },
  { value: "face_swap", label: "Face Swap" },
  { value: "background_swap", label: "Bg Replace" },
];

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

  // New state
  const [mode, setMode] = useState<GenerationMode>("generate");
  const [variationCount, setVariationCount] = useState(1);
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState("");
  const [sourceImagePreview, setSourceImagePreview] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [generationId, setGenerationId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const user = session?.user;
  const userPlan = user?.plan ?? "FREE";
  const canAdvancedMode = userPlan !== "FREE";
  const creditsCost = variationCount;

  const activeSubcategory = category?.subcategories.find(
    (s) => s.id === selectedSubcategory
  );

  // Preview URL for source image
  useEffect(() => {
    if (sourceImage) {
      const url = URL.createObjectURL(sourceImage);
      setSourceImagePreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setSourceImagePreview(null);
    }
  }, [sourceImage]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const pollStatus = useCallback((id: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/generate/status/${id}`);
        if (!res.ok) throw new Error("Failed to check status");
        const data = await res.json();

        if (data.status === "COMPLETED") {
          clearInterval(pollRef.current!);
          pollRef.current = null;

          // Support both single imageUrl and images array
          if (data.images && data.images.length > 0) {
            setGeneratedImages(
              data.images.map((img: any, idx: number) => ({
                url: img.url || img,
                index: idx,
              }))
            );
          } else if (data.imageUrl) {
            setGeneratedImages([{ url: data.imageUrl, index: 0 }]);
          }
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
  }, []);

  const handleModeChange = (newMode: GenerationMode) => {
    if (newMode !== "generate" && !canAdvancedMode) {
      setShowUpgradeModal(true);
      return;
    }
    setMode(newMode);
    // Reset source image when switching modes
    if (newMode === "generate") {
      setSourceImage(null);
      setSourceImageUrl("");
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB.");
      return;
    }
    setSourceImage(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const uploadSourceImage = async (): Promise<string | null> => {
    if (!sourceImage) return null;
    const formData = new FormData();
    formData.append("file", sourceImage);

    try {
      const res = await fetch("/api/upload/source-image", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      return data.url;
    } catch {
      toast.error("Failed to upload image.");
      return null;
    }
  };

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

    // Validate source image for swap modes
    if ((mode === "face_swap" || mode === "background_swap") && !sourceImage) {
      toast.error("Please upload a photo first.");
      return;
    }

    setStatus("generating");
    setGeneratedImages([]);

    try {
      // Upload source image first if needed
      let uploadedUrl = sourceImageUrl;
      if ((mode === "face_swap" || mode === "background_swap") && sourceImage) {
        const url = await uploadSourceImage();
        if (!url) {
          setStatus("failed");
          return;
        }
        uploadedUrl = url;
        setSourceImageUrl(url);
      }

      const body: Record<string, any> = {
        category: categoryKey,
        subcategory: selectedSubcategory,
        shot: selectedShot || undefined,
        brand: selectedBrand || undefined,
        model: selectedModel || undefined,
        color: color || undefined,
        variationCount,
        mode,
      };

      if (mode === "face_swap") {
        body.faceInputUrl = uploadedUrl;
      } else if (mode === "background_swap") {
        body.sourceImageUrl = uploadedUrl;
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to start generation");
      }

      const data = await res.json();
      setGenerationId(data.id);

      // If the response already has completed images, show them immediately
      if (data.status === "COMPLETED" && (data.images?.length > 0 || data.imageUrl)) {
        if (data.images && data.images.length > 0) {
          setGeneratedImages(
            data.images.map((img: any, idx: number) => ({
              url: img.url || img.imageUrl,
              index: idx,
            }))
          );
        } else if (data.imageUrl) {
          setGeneratedImages([{ url: data.imageUrl, index: 0 }]);
        }
        setStatus("completed");
        toast.success("Your flex is ready!");
      } else {
        pollStatus(data.id);
      }
    } catch (err: any) {
      setStatus("failed");
      toast.error(err.message || "Failed to start generation.");
    }
  };

  const handleDownloadSingle = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `letmeflex-${categoryKey}-${index + 1}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error("Failed to download image.");
    }
  };

  const handleDownloadAll = async () => {
    for (let i = 0; i < generatedImages.length; i++) {
      await handleDownloadSingle(generatedImages[i].url, i);
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setGeneratedImages([]);
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

  const renderImageGrid = () => {
    const count = generatedImages.length;

    if (count === 1) {
      return (
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-surface border border-gold/20 group">
          <Image
            src={generatedImages[0].url}
            alt={`${category.label} generation`}
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
            <button
              onClick={() => handleDownloadSingle(generatedImages[0].url, 0)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold text-black text-sm font-heading font-bold hover:bg-gold-dark transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>
      );
    }

    if (count === 3) {
      return (
        <div className="space-y-3">
          {/* First image full width */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-surface border border-gold/20 group">
            <Image
              src={generatedImages[0].url}
              alt={`${category.label} generation 1`}
              fill
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
              <button
                onClick={() => handleDownloadSingle(generatedImages[0].url, 0)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold text-black text-sm font-heading font-bold hover:bg-gold-dark transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
          {/* Two below */}
          <div className="grid grid-cols-2 gap-3">
            {generatedImages.slice(1).map((img) => (
              <div
                key={img.index}
                className="relative aspect-square rounded-2xl overflow-hidden bg-surface border border-gold/20 group"
              >
                <Image
                  src={img.url}
                  alt={`${category.label} generation ${img.index + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => handleDownloadSingle(img.url, img.index)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gold text-black text-xs font-heading font-bold hover:bg-gold-dark transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 2 or 4 variations: grid-cols-2
    return (
      <div className="grid grid-cols-2 gap-3">
        {generatedImages.map((img) => (
          <div
            key={img.index}
            className="relative aspect-square rounded-2xl overflow-hidden bg-surface border border-gold/20 group"
          >
            <Image
              src={img.url}
              alt={`${category.label} generation ${img.index + 1}`}
              fill
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
              <button
                onClick={() => handleDownloadSingle(img.url, img.index)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gold text-black text-xs font-heading font-bold hover:bg-gold-dark transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

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
              Generating {variationCount > 1 ? `${variationCount} variations` : "your flex"}...
            </p>
            <div className="w-48 h-1 bg-surface-2 rounded-full overflow-hidden relative z-10">
              <div className="h-full bg-gold/60 rounded-full animate-pulse" />
            </div>
          </motion.div>
        )}

        {status === "completed" && generatedImages.length > 0 && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            {renderImageGrid()}
            <div className="flex gap-3">
              {generatedImages.length > 1 && (
                <button
                  onClick={handleDownloadAll}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gold text-black font-heading font-bold text-sm hover:bg-gold-dark transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download All
                </button>
              )}
              {generatedImages.length === 1 && (
                <button
                  onClick={() => handleDownloadSingle(generatedImages[0].url, 0)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gold text-black font-heading font-bold text-sm hover:bg-gold-dark transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              )}
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
          {/* 1. Mode Toggle */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-3">
              Mode
            </label>
            <div className="inline-flex p-1 bg-surface-2 border border-border rounded-full">
              {MODE_OPTIONS.map((opt) => {
                const isLocked =
                  opt.value !== "generate" && !canAdvancedMode;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleModeChange(opt.value)}
                    className={cn(
                      "relative px-5 py-2 rounded-full text-sm font-medium transition-all",
                      mode === opt.value
                        ? "bg-gold text-black"
                        : "text-text-muted hover:text-text-primary"
                    )}
                  >
                    {opt.label}
                    {isLocked && (
                      <Lock className="absolute -top-1 -right-1 w-3 h-3 text-text-subtle" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Subcategory Pills */}
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

          {/* 3. Shot Type (hide in bg_replace mode) */}
          {mode !== "background_swap" &&
            category.shots &&
            category.shots.length > 0 && (
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

          {/* 4. Brand Dropdown (hide in bg_replace mode) */}
          {mode !== "background_swap" &&
            activeSubcategory?.brands &&
            activeSubcategory.brands.length > 0 && (
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

          {/* Model Dropdown (hide in bg_replace mode) */}
          {mode !== "background_swap" &&
            activeSubcategory?.models &&
            activeSubcategory.models.length > 0 && (
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

          {/* 5. Upload Area (face_swap or background_swap only) */}
          {(mode === "face_swap" || mode === "background_swap") && (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-3">
                {mode === "face_swap"
                  ? "Upload your photo"
                  : "Upload your item photo"}
              </label>
              {sourceImagePreview ? (
                <div className="relative inline-block">
                  <div className="w-32 h-32 rounded-xl overflow-hidden border border-gold/30">
                    <Image
                      src={sourceImagePreview}
                      alt="Source"
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setSourceImage(null);
                      setSourceImageUrl("");
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-gold/30 transition-colors"
                >
                  <Upload className="w-8 h-8 text-text-subtle mx-auto mb-3" />
                  <p className="text-sm text-text-muted">
                    Drag & drop or click to upload
                  </p>
                  <p className="text-xs text-text-subtle mt-1">
                    PNG, JPG up to 10MB
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* 6. Color Input */}
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

          {/* 7. Variations Selector */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-3">
              Variations
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  onClick={() => setVariationCount(num)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-heading font-bold transition-all",
                    variationCount === num
                      ? "bg-gold text-black"
                      : "bg-surface-2 border border-border text-text-muted hover:text-text-primary hover:border-gold/20"
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-subtle mt-2 text-center">
              {variationCount} credit{variationCount > 1 ? "s" : ""}
            </p>
          </div>

          {/* Credits Cost */}
          <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
            <Coins className="w-4 h-4 text-gold" />
            <span>
              This generation costs{" "}
              <span className="text-gold font-medium">
                {creditsCost} credit{creditsCost > 1 ? "s" : ""}
              </span>
            </span>
          </div>

          {/* 8. Generate Button */}
          <button
            onClick={handleGenerate}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gold text-black font-heading font-bold text-base hover:bg-gold-dark hover:shadow-gold transition-all"
          >
            <Sparkles className="w-5 h-5" />
            Generate ({creditsCost} credit{creditsCost > 1 ? "s" : ""})
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
                  Upgrade to Unlock
                </h3>
                <p className="text-sm text-text-muted mt-2">
                  Face Swap and Background Replace are available on Starter plan
                  and above. Upgrade now to access advanced generation modes.
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
