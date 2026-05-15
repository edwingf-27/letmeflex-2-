"use client";

import { useSession } from "next-auth/react";
import { useRef, useState, useCallback } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { Upload, X, Sparkles, Download, RotateCcw, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";

/* ─── Inspirations ──────────────────────────────────────────────── */
const INSPIRATIONS = [
  {
    id: "supercar",
    label: "Supercar",
    icon: "🚗",
    sceneId: "ferrari-rain",
    hint: "in front of a red Ferrari in the rain, cinematic lighting",
    hintFr: "devant une Ferrari rouge sous la pluie, éclairage cinématique",
  },
  {
    id: "luxe",
    label: "Luxury",
    labelFr: "Luxe",
    icon: "💎",
    sceneId: "mansion-pool",
    hint: "by an infinity pool at a luxury villa",
    hintFr: "au bord d'une piscine infinity dans une villa de luxe",
  },
  {
    id: "sport",
    label: "Sport",
    icon: "🏋️",
    sceneId: "gym-mirror",
    hint: "in a premium gym, mirror selfie",
    hintFr: "dans une salle de sport premium, mirror selfie",
  },
  {
    id: "voyage",
    label: "Travel",
    labelFr: "Voyage",
    icon: "✈️",
    sceneId: "private-jet",
    hint: "on a private jet, champagne, clouds through the window",
    hintFr: "dans un jet privé, champagne, nuages par le hublot",
  },
];

/* ─── Page ───────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { data: session, update: updateSession } = useSession();
  const { t, lang } = useLanguage();
  const user = session?.user;
  const firstName = user?.name?.split(" ")[0] || (lang === "fr" ? "toi" : "you");
  const credits = user?.credits ?? 0;

  /* upload */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  /* prompt + inspiration */
  const [prompt, setPrompt] = useState("");
  const [selectedInspiration, setSelectedInspiration] = useState<string | null>(null);

  /* generation */
  const [generating, setGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ── Upload handlers ─────────────────────────────────────────── */
  const uploadFile = useCallback(async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      toast.error(t("dash_max_size"));
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploadedUrl(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload/source-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setUploadedUrl(data.url);
    } catch (e: any) {
      toast.error(t("dash_upload_error") + e.message);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }, [t]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const removePhoto = () => {
    setPreview(null);
    setUploadedUrl(null);
  };

  /* ── Inspiration select ─────────────────────────────────────── */
  const handleInspiration = (insp: (typeof INSPIRATIONS)[0]) => {
    if (selectedInspiration === insp.id) {
      setSelectedInspiration(null);
    } else {
      setSelectedInspiration(insp.id);
      if (!prompt) setPrompt(lang === "fr" ? insp.hintFr : insp.hint);
    }
  };

  /* ── Generate ────────────────────────────────────────────────── */
  const canGenerate =
    !generating &&
    !uploading &&
    (selectedInspiration !== null || prompt.trim().length > 0) &&
    credits > 0;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setGenerating(true);
    setResultUrl(null);
    setError(null);

    const inspiration = INSPIRATIONS.find((i) => i.id === selectedInspiration);

    try {
      const body: Record<string, unknown> = {
        variationCount: 1,
      };

      if (inspiration) {
        body.sceneId = inspiration.sceneId;
        if (prompt.trim()) body.extraInstructions = prompt.trim();
      } else {
        body.category = "lifestyle";
        body.subcategory = "custom";
        body.extraInstructions = prompt.trim();
        body.sceneId = "mansion-pool";
        body.extraInstructions = prompt.trim();
      }

      if (uploadedUrl) {
        body.facePhotos = [uploadedUrl];
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("dash_fail"));
      }

      setResultUrl(data.imageUrl || data.images?.[0]?.url || null);
      await updateSession();
      toast.success(t("dash_success_toast"));
    } catch (e: any) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    setResultUrl(null);
    setError(null);
    setPrompt("");
    setSelectedInspiration(null);
  };

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className="max-w-xl mx-auto py-4 lg:py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-heading font-bold text-white">
            {t("dash_greeting")} {firstName} 👋
          </h1>
          <p className="text-zinc-500 mt-1 text-sm">{t("dash_subtitle")}</p>
        </div>
        <Link
          href="/credits"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F9CA1F]/10 border border-[#F9CA1F]/20 hover:bg-[#F9CA1F]/15 transition-colors"
        >
          <Coins className="w-3.5 h-3.5 text-[#F9CA1F]" />
          <span className="text-sm font-bold text-[#F9CA1F]">
            {credits >= 999999 ? "∞" : credits} {credits > 1 ? t("dash_credits") : t("dash_credit")}
          </span>
        </Link>
      </div>

      {/* ── Result ─────────────────────────────────────────────── */}
      {resultUrl && (
        <div className="rounded-2xl overflow-hidden border border-[#F9CA1F]/20 bg-[#141416]">
          <div className="relative aspect-video">
            <Image src={resultUrl} alt="Result" fill className="object-cover" />
          </div>
          <div className="p-4 flex gap-3">
            <a
              href={resultUrl}
              download="letmeflex.jpg"
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#F9CA1F] text-black font-semibold text-sm hover:bg-[#F9CA1F]/90 transition-colors"
            >
              <Download className="w-4 h-4" />
              {t("dash_download")}
            </a>
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              {t("dash_new")}
            </button>
          </div>
        </div>
      )}

      {/* ── Upload zone ────────────────────────────────────────── */}
      {!resultUrl && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {preview ? (
            /* Photo preview */
            <div className="relative rounded-2xl overflow-hidden border border-[#2A2A2E] bg-[#141416]">
              <div className="relative aspect-[4/3]">
                <Image src={preview} alt="Your photo" fill className="object-cover" />
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-2 border-[#F9CA1F] border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-zinc-300">Upload…</span>
                    </div>
                  </div>
                )}
                {uploadedUrl && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/70 rounded-full backdrop-blur-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-xs text-white">{t("dash_photo_ready")}</span>
                  </div>
                )}
              </div>
              <button
                onClick={removePhoto}
                className="absolute top-3 right-3 w-7 h-7 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Drop zone */
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={cn(
                "w-full rounded-2xl border-2 border-dashed transition-all py-12 flex flex-col items-center gap-3",
                dragOver
                  ? "border-[#F9CA1F] bg-[#F9CA1F]/5"
                  : "border-[#2A2A2E] bg-[#141416] hover:border-[#F9CA1F]/40 hover:bg-[#F9CA1F]/3"
              )}
            >
              <div className="w-12 h-12 rounded-2xl bg-[#F9CA1F]/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-[#F9CA1F]" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium text-sm">
                  {t("dash_drop_title")}
                </p>
                <p className="text-zinc-500 text-xs mt-1">
                  {t("dash_drop_hint")}
                </p>
              </div>
              <span className="text-xs text-zinc-600 mt-1">
                {t("dash_drop_optional")}
              </span>
            </button>
          )}

          {/* ── Prompt ─────────────────────────────────────────── */}
          <div className="space-y-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t("dash_prompt_placeholder")}
              rows={3}
              className="w-full rounded-xl border border-[#2A2A2E] bg-[#141416] px-4 py-3 text-sm text-white placeholder:text-zinc-600 resize-none focus:outline-none focus:border-[#F9CA1F]/40 focus:ring-1 focus:ring-[#F9CA1F]/20 transition-colors"
            />
          </div>

          {/* ── Inspirations ───────────────────────────────────── */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              {t("dash_inspirations")}
            </p>
            <div className="flex gap-2 flex-wrap">
              {INSPIRATIONS.map((insp) => {
                const active = selectedInspiration === insp.id;
                return (
                  <button
                    key={insp.id}
                    type="button"
                    onClick={() => handleInspiration(insp)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all",
                      active
                        ? "bg-[#F9CA1F] text-black border-[#F9CA1F]"
                        : "bg-[#141416] text-zinc-300 border-[#2A2A2E] hover:border-[#F9CA1F]/40 hover:text-white"
                    )}
                  >
                    <span>{insp.icon}</span>
                    {lang === "fr" ? (insp.labelFr ?? insp.label) : insp.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Error ───────────────────────────────────────────── */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* ── Generate button ─────────────────────────────────── */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className={cn(
              "w-full py-4 rounded-2xl font-heading font-bold text-base flex items-center justify-center gap-2.5 transition-all",
              canGenerate
                ? "bg-[#F9CA1F] text-black hover:bg-[#F9CA1F]/90 active:scale-[0.98]"
                : "bg-[#1E1E22] text-zinc-600 cursor-not-allowed"
            )}
          >
            {generating ? (
              <>
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                {t("dash_generating")}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                {t("dash_generate_btn")}
                <span className="ml-1 text-sm font-normal opacity-70">
                  · {uploadedUrl ? "2" : "1"} {uploadedUrl ? t("dash_credits") : t("dash_credit")}
                </span>
              </>
            )}
          </button>

          {credits === 0 && (
            <p className="text-center text-xs text-zinc-500">
              {t("dash_no_credits")}{" "}
              <Link href="/credits" className="text-[#F9CA1F] hover:underline">
                {t("dash_recharge")}
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}
