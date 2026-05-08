"use client";

import { useState, useCallback, useRef, useEffect, DragEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { ALL_SCENES, SCENE_CATEGORIES } from "@/types/scenes";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Download,
  Loader2,
  RotateCcw,
  Coins,
  Upload,
  X,
  Check,
  ImageIcon,
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

type GenerationStatus = "idle" | "generating" | "completed" | "failed";

interface GeneratedImage {
  url: string;
  index: number;
}

interface UploadedPhoto {
  file: File;
  previewUrl: string;
  uploadedUrl: string | null;
  uploading: boolean;
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const CATEGORY_FILTERS = [
  { id: "all", label: "All", icon: "🔥" },
  ...SCENE_CATEGORIES.map((c) => ({ id: c.id, label: c.label, icon: c.icon })),
];

const CATEGORY_QUERY_ALIASES: Record<string, string> = {
  cars: "cars",
  car: "cars",
  lifestyle: "lifestyle",
  watches: "watches",
  watch: "watches",
};

export default function GeneratePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = session?.user;

  // Step 1: Scene selection
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  // Step 2: Face photos
  const [facePhotos, setFacePhotos] = useState<UploadedPhoto[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3: Generate
  const [variationCount, setVariationCount] = useState(1);
  const [extraInstructions, setExtraInstructions] = useState("");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [generationId, setGenerationId] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedScene = selectedSceneId
    ? ALL_SCENES.find((s) => s.id === selectedSceneId) ?? null
    : null;

  const filteredScenes =
    activeFilter === "all"
      ? ALL_SCENES
      : ALL_SCENES.filter((s) => s.category === activeFilter);

  const creditsCost = variationCount;

  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (!categoryParam) return;

    const normalized = categoryParam.trim().toLowerCase();
    const mapped =
      CATEGORY_QUERY_ALIASES[normalized] ??
      SCENE_CATEGORIES.find(
        (category) =>
          category.id.toLowerCase() === normalized ||
          category.label.toLowerCase() === normalized
      )?.id;

    if (mapped) {
      setActiveFilter(mapped);
    }
  }, [searchParams]);

  // Clean up polling + preview URLs on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      facePhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Polling ----
  const pollStatus = useCallback((id: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/generate/status/${id}`);
        if (!res.ok) throw new Error("Failed to check status");
        const data = await res.json();

        if (data.status === "COMPLETED") {
          clearInterval(pollRef.current!);
          pollRef.current = null;
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
          toast.success("Your flex is ready!");
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

  // ---- File upload ----
  const handleFileSelect = async (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Allowed formats: JPG, PNG, WEBP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB.");
      return;
    }
    if (facePhotos.length >= 3) {
      toast.error("Maximum 3 photos allowed.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const photo: UploadedPhoto = {
      file,
      previewUrl,
      uploadedUrl: null,
      uploading: true,
    };

    setFacePhotos((prev) => [...prev, photo]);

    // Upload immediately
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload/source-image", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();

      setFacePhotos((prev) =>
        prev.map((p) =>
          p.previewUrl === previewUrl
            ? { ...p, uploadedUrl: data.url, uploading: false }
            : p
        )
      );
    } catch {
      toast.error("Failed to upload photo.");
      setFacePhotos((prev) => prev.filter((p) => p.previewUrl !== previewUrl));
      URL.revokeObjectURL(previewUrl);
    }
  };

  const handleFilesSelect = (files: File[]) => {
    if (files.length === 0) return;

    const remainingSlots = Math.max(0, 3 - facePhotos.length);
    if (remainingSlots === 0) {
      toast.error("Maximum 3 photos allowed.");
      return;
    }

    if (files.length > remainingSlots) {
      toast.error(`You can upload up to ${remainingSlots} more photo${remainingSlots > 1 ? "s" : ""}.`);
    }

    files.slice(0, remainingSlots).forEach((file) => {
      void handleFileSelect(file);
    });
  };

  const removePhoto = (previewUrl: string) => {
    setFacePhotos((prev) => {
      const removed = prev.find((p) => p.previewUrl === previewUrl);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((p) => p.previewUrl !== previewUrl);
    });
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    handleFilesSelect(files);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // ---- Generate ----
  const handleGenerate = async () => {
    if (!user) {
      toast.error("Please sign in to generate images.");
      return;
    }
    if (!selectedSceneId) {
      toast.error("Please select a scene first.");
      return;
    }
    if ((user.credits ?? 0) < creditsCost) {
      toast.error("Not enough credits. Purchase more to continue.");
      router.push("/credits");
      return;
    }

    // Check if any photos are still uploading
    if (facePhotos.some((p) => p.uploading)) {
      toast.error("Please wait for photos to finish uploading.");
      return;
    }

    setStatus("generating");
    setGeneratedImages([]);

    try {
      const uploadedUrls = facePhotos
        .filter((p) => p.uploadedUrl)
        .map((p) => p.uploadedUrl!);

      const body: Record<string, any> = {
        sceneId: selectedSceneId,
        variationCount,
      };

      if (uploadedUrls.length > 0) {
        body.facePhotos = uploadedUrls;
      }
      if (extraInstructions.trim()) {
        body.extraInstructions = extraInstructions.trim();
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

      if (
        data.status === "COMPLETED" &&
        (data.images?.length > 0 || data.imageUrl)
      ) {
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

  // ---- Downloads ----
  const handleDownloadSingle = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `letmeflex-${selectedSceneId || "scene"}-${index + 1}-${Date.now()}.png`;
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

  // ---- Render helpers ----
  const renderImageGrid = () => {
    const count = generatedImages.length;

    if (count === 1) {
      return (
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-surface border border-gold/20 group max-w-lg mx-auto">
          <Image
            src={generatedImages[0].url}
            alt="Generated image"
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

    return (
      <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
        {generatedImages.map((img) => (
          <div
            key={img.index}
            className="relative aspect-square rounded-2xl overflow-hidden bg-surface border border-gold/20 group"
          >
            <Image
              src={img.url}
              alt={`Generated image ${img.index + 1}`}
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

  const getCategoryIcon = (categoryId: string) => {
    const cat = SCENE_CATEGORIES.find((c) => c.id === categoryId);
    return cat?.icon ?? "";
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl lg:text-4xl font-heading font-bold">
          Pick your <span className="text-gold">scene</span>
        </h1>
        <p className="text-text-muted mt-2 text-sm lg:text-base">
          Choose a scene, optionally add your face, and generate.
        </p>
      </div>

      {/* Result Area */}
      <AnimatePresence mode="wait">
        {status === "generating" && (
          <motion.div
            key="generating"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative aspect-video max-w-lg mx-auto rounded-2xl bg-surface border border-border flex flex-col items-center justify-center gap-4 overflow-hidden"
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

        {status === "completed" && generatedImages.length > 0 && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            {renderImageGrid()}
            <div className="flex gap-3 justify-center max-w-lg mx-auto">
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
                  onClick={() =>
                    handleDownloadSingle(generatedImages[0].url, 0)
                  }
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
                New Scene
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
            className="rounded-2xl bg-red-500/10 border border-red-500/20 p-6 text-center max-w-lg mx-auto"
          >
            <p className="text-red-400 font-medium">Generation failed</p>
            <p className="text-sm text-text-muted mt-1">
              Something went wrong. Credits have been refunded.
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

      {/* Main form (hidden during generation/result) */}
      {status === "idle" && (
        <div className="space-y-10">
          {/* ============= STEP 1: Choose Scene ============= */}
          <section className="space-y-4">
            {/* Selected banner */}
            {selectedScene && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gold/10 border border-gold/20"
              >
                <Check className="w-5 h-5 text-gold flex-shrink-0" />
                <span className="text-sm font-medium">
                  Selected:{" "}
                  <span className="text-gold font-heading font-bold">
                    {selectedScene.label}
                  </span>
                </span>
                <button
                  onClick={() => setSelectedSceneId(null)}
                  className="ml-auto text-text-subtle hover:text-text-primary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* Category filter pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {CATEGORY_FILTERS.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveFilter(cat.id)}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                    activeFilter === cat.id
                      ? "bg-gold text-black"
                      : "bg-surface-2 border border-border text-text-muted hover:text-text-primary hover:border-gold/20"
                  )}
                >
                  <span>{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Scene grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredScenes.map((scene, index) => {
                const isSelected = selectedSceneId === scene.id;
                return (
                  <motion.button
                    key={scene.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02, duration: 0.25 }}
                    onClick={() => setSelectedSceneId(scene.id)}
                    className={cn(
                      "relative flex flex-col items-start text-left gap-2 p-4 rounded-xl transition-all duration-200",
                      "bg-surface border",
                      isSelected
                        ? "border-gold shadow-[0_0_16px_rgba(249,202,31,0.15)]"
                        : "border-border hover:border-gold/30 hover:bg-surface-2"
                    )}
                  >
                    {/* Category icon */}
                    <span className="text-xl">
                      {getCategoryIcon(scene.category)}
                    </span>

                    {/* Label */}
                    <span className="font-heading font-semibold text-sm leading-tight">
                      {scene.label}
                    </span>

                    {/* Category tag */}
                    <span className="text-[10px] uppercase tracking-wider text-text-subtle font-medium">
                      {scene.category}
                    </span>

                    {/* Selected check */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-gold flex items-center justify-center">
                        <Check className="w-3 h-3 text-black" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </section>

          {/* ============= STEP 2: Upload Photos (optional) ============= */}
          {selectedScene && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-lg font-heading font-bold">
                  Add yourself to the photo{" "}
                  <span className="text-text-subtle font-normal text-sm">
                    (optional)
                  </span>
                </h2>
                <p className="text-sm text-text-muted mt-1">
                  Upload 1-3 photos of your face for the most realistic result.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 items-start">
                {/* Uploaded thumbnails */}
                {facePhotos.map((photo) => (
                  <div
                    key={photo.previewUrl}
                    className="relative w-24 h-24 rounded-xl overflow-hidden border border-border group"
                  >
                    <Image
                      src={photo.previewUrl}
                      alt="Face photo"
                      fill
                      className="object-cover"
                    />
                    {photo.uploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-gold animate-spin" />
                      </div>
                    )}
                    {!photo.uploading && photo.uploadedUrl && (
                      <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    <button
                      onClick={() => removePhoto(photo.previewUrl)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Upload area */}
                {facePhotos.length < 3 && (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "w-24 h-24 rounded-xl border-2 border-dashed border-border",
                      "flex flex-col items-center justify-center gap-1 cursor-pointer",
                      "hover:border-gold/30 transition-colors"
                    )}
                  >
                    <Upload className="w-5 h-5 text-text-subtle" />
                    <span className="text-[10px] text-text-subtle">Upload</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files
                          ? Array.from(e.target.files)
                          : [];
                        handleFilesSelect(files);
                        // Reset input so same file can be re-selected
                        e.target.value = "";
                      }}
                    />
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {/* ============= STEP 3: Generate ============= */}
          {selectedScene && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-6"
            >
              {/* Variations */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-3">
                  Variations
                </label>
                <div className="flex gap-2 max-w-xs">
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
              </div>

              {/* Extra instructions */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-3">
                  Additional instructions{" "}
                  <span className="text-text-subtle">(optional)</span>
                </label>
                <input
                  type="text"
                  value={extraInstructions}
                  onChange={(e) => setExtraInstructions(e.target.value)}
                  placeholder='e.g. "wearing a blue suit", "holding car keys"'
                  maxLength={500}
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-subtle focus:outline-none focus:border-gold/40 transition-colors"
                />
              </div>

              {/* Credit cost */}
              <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
                <Coins className="w-4 h-4 text-gold" />
                <span>
                  This generation costs{" "}
                  <span className="text-gold font-medium">
                    {creditsCost} credit{creditsCost > 1 ? "s" : ""}
                  </span>
                </span>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gold text-black font-heading font-bold text-base hover:bg-gold-dark hover:shadow-gold transition-all"
              >
                <Sparkles className="w-5 h-5" />
                Generate ({creditsCost} credit{creditsCost > 1 ? "s" : ""})
              </button>
            </motion.section>
          )}
        </div>
      )}
    </div>
  );
}
