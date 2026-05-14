"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Wand2, Download, RotateCcw, Sparkles, UserPlus } from "lucide-react";

const MODES = [
  {
    id: "replace_object",
    emoji: "🔄",
    label: "Remplacer un objet",
    description: "Remplace n'importe quel objet par ce que tu veux",
    placeholder: "Ex : remplace le volant par celui d'une Porsche GT3...",
    showExtra: true,
    showRef: false,
    color: "#F9CA1F",
    badge: null,
  },
  {
    id: "add_person",
    emoji: "👤",
    label: "Ajouter une personne",
    description: "Ajoute quelqu'un sur ta photo — avec sa vraie tête si tu uploades une référence",
    placeholder: "Ex : debout à ma droite, bras croisés, souriant...",
    showExtra: true,
    showRef: true,
    color: "#6C63FF",
    badge: null,
  },
] as const;

type ModeId = typeof MODES[number]["id"];

function UploadZone({
  preview,
  onFile,
  onReset,
  label,
  hint,
  height = "h-56",
}: {
  preview: string | null;
  onFile: (f: File) => void;
  onReset: () => void;
  label: string;
  hint?: string;
  height?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return preview ? (
    <div className={`relative rounded-2xl overflow-hidden ${height} bg-[#111113]`}>
      <img src={preview} alt={label} className="w-full h-full object-cover" />
      <button
        onClick={onReset}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
      <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 bg-black/50 text-xs text-zinc-400 text-center">
        {label}
      </div>
    </div>
  ) : (
    <div
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onClick={() => ref.current?.click()}
      className={`${height} rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
        drag ? "border-[#F9CA1F]/60 bg-[#F9CA1F]/5" : "border-[#2A2A2E] hover:border-[#F9CA1F]/30 bg-[#111113]"
      }`}
    >
      <Upload className="w-6 h-6 text-zinc-600 mb-2" />
      <p className="text-sm text-zinc-400 font-medium">{label}</p>
      {hint && <p className="text-xs text-zinc-600 mt-0.5 text-center px-4">{hint}</p>}
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); }} />
    </div>
  );
}

export default function TransformPage() {
  const { data: session, update } = useSession();

  const [selectedMode, setSelectedMode] = useState<ModeId>("replace_object");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [refFile, setRefFile] = useState<File | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [extraInstructions, setExtraInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const currentMode = MODES.find((m) => m.id === selectedMode)!;
  const credits = session?.user?.credits ?? 0;

  function handleSourceFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setSourceFile(file);
    setSourcePreview(URL.createObjectURL(file));
    setResultUrl(null);
    setError("");
  }

  function handleRefFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setRefFile(file);
    setRefPreview(URL.createObjectURL(file));
  }

  function reset() {
    setSourceFile(null); setSourcePreview(null);
    setRefFile(null); setRefPreview(null);
    setResultUrl(null); setError("");
    setExtraInstructions("");
  }

  async function uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload/source-image", { method: "POST", body: formData });
    if (!res.ok) throw new Error("Échec de l'upload");
    const { url } = await res.json();
    return url;
  }

  async function handleTransform() {
    if (!sourceFile) return;
    if (credits < 1) { setError("Tu n'as plus de crédits."); return; }

    setLoading(true); setError(""); setResultUrl(null);

    try {
      // Upload image(s) en parallèle
      const uploads: Promise<string>[] = [uploadFile(sourceFile)];
      if (refFile && selectedMode === "add_person") uploads.push(uploadFile(refFile));
      const [imageUrl, refImageUrl] = await Promise.all(uploads);

      const res = await fetch("/api/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          mode: selectedMode,
          extraInstructions: extraInstructions.trim() || undefined,
          refImageUrl: refImageUrl || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erreur lors de la transformation"); return; }

      setResultUrl(data.imageUrl);
      await update();
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `letmeflex-${selectedMode}-${Date.now()}.jpg`;
    a.click();
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-white flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-[#F9CA1F]" />
          Transformer une photo
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Modifie une de tes photos existantes avec l&apos;IA — 1 crédit par transformation
        </p>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => { setSelectedMode(mode.id); setError(""); setResultUrl(null); }}
            className={`relative p-4 rounded-2xl border text-left transition-all ${
              selectedMode === mode.id
                ? "border-[#F9CA1F]/40 bg-[#F9CA1F]/5"
                : "border-[#2A2A2E] bg-[#111113] hover:border-[#3A3A3E]"
            }`}
          >
            {mode.badge && (
              <span className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30">
                {mode.badge}
              </span>
            )}
            <div className="text-2xl mb-2">{mode.emoji}</div>
            <p className={`font-semibold text-sm mb-1 ${selectedMode === mode.id ? "text-[#F9CA1F]" : "text-white"}`}>
              {mode.label}
            </p>
            <p className="text-xs text-zinc-500 leading-relaxed">{mode.description}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — Inputs */}
        <div className="space-y-4">

          {/* Photo principale */}
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">
            1. Ta photo originale
          </h2>
          <UploadZone
            preview={sourcePreview}
            onFile={handleSourceFile}
            onReset={reset}
            label="Glisse ta photo ici"
            hint="ou clique pour choisir"
            height="h-56"
          />

          {/* Photo de référence (mode add_person uniquement) */}
          <AnimatePresence>
            {currentMode.showRef && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#6C63FF]" />
                  <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">
                    2. Photo de référence
                    <span className="ml-2 text-xs text-zinc-600 normal-case font-normal tracking-normal">
                      (optionnel)
                    </span>
                  </h2>
                </div>
                <UploadZone
                  preview={refPreview}
                  onFile={handleRefFile}
                  onReset={() => { setRefFile(null); setRefPreview(null); }}
                  label="Photo de la personne à ajouter"
                  hint="Upload une photo pour que l'IA reproduise son visage et son style"
                  height="h-40"
                />
                {refPreview && (
                  <p className="text-xs text-[#6C63FF] flex items-center gap-1">
                    <span>✓</span> L&apos;IA va reproduire cette personne dans ta photo
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Instructions texte */}
          <AnimatePresence>
            {currentMode.showExtra && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">
                    {currentMode.showRef ? "3." : "2."} Instructions
                    <span className="ml-2 text-xs text-zinc-600 normal-case font-normal tracking-normal">
                      (optionnel)
                    </span>
                  </h2>
                </div>
                <textarea
                  value={extraInstructions}
                  onChange={(e) => setExtraInstructions(e.target.value)}
                  placeholder={currentMode.placeholder}
                  rows={2}
                  className="w-full rounded-xl border border-[#2A2A2E] bg-[#111113] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#F9CA1F]/30 resize-none"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA */}
          <button
            onClick={handleTransform}
            disabled={!sourceFile || loading}
            className="w-full py-3.5 rounded-2xl bg-[#F9CA1F] text-black font-heading font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F9CA1F]/90 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Transformation en cours...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Transformer — 1 crédit
              </>
            )}
          </button>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        </div>

        {/* Right — Result */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">
            Résultat
          </h2>

          <div className="relative rounded-2xl overflow-hidden h-72 bg-[#111113] border border-[#1E1E22] flex items-center justify-center">
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-[#F9CA1F]/20 border-t-[#F9CA1F] animate-spin" />
                <p className="text-zinc-500 text-sm">L&apos;IA transforme ta photo...</p>
                <p className="text-zinc-600 text-xs">~20-40 secondes</p>
              </div>
            ) : resultUrl ? (
              <>
                <img src={resultUrl} alt="Résultat" className="w-full h-full object-cover" />
                <div className="absolute bottom-3 right-3">
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/70 hover:bg-black/90 text-white text-xs font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Télécharger
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center px-8">
                <div className="text-4xl">✨</div>
                <p className="text-zinc-500 text-sm">Le résultat apparaîtra ici</p>
              </div>
            )}
          </div>

          {resultUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-[#43D9AD]/10 border border-[#43D9AD]/20 text-center"
            >
              <p className="text-[#43D9AD] text-sm font-medium">Transformation réussie ✅</p>
              <button
                onClick={reset}
                className="mt-3 px-4 py-2 rounded-xl border border-[#2A2A2E] text-zinc-400 text-xs hover:text-white hover:border-zinc-500 transition-all"
              >
                Nouvelle transformation
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
