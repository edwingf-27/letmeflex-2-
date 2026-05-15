"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Upload, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/context";

const INSPIRATIONS = [
  { id: "supercar", label: "Supercar", icon: "🚗" },
  { id: "luxe",     label: "Luxury",   icon: "💎" },
  { id: "sport",    label: "Sport",    icon: "🏋️" },
  { id: "voyage",   label: "Travel",   icon: "✈️" },
  { id: "night",    label: "Night",    icon: "🌙" },
];

export function StudioDemo() {
  const router = useRouter();
  const { t } = useLanguage();
  const [selected, setSelected] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [hasPhoto, setHasPhoto] = useState(false);

  const handleGenerate = () => {
    router.push("/register");
  };

  return (
    <section id="studio" className="w-full bg-[#0C0C0E] px-4 py-24">
      <div className="mx-auto max-w-xl">

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-white">
            {t("demo_title")}
          </h2>
          <p className="mt-3 text-zinc-500 text-sm">
            {t("demo_subtitle")}
          </p>
        </motion.div>

        {/* Studio card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="rounded-3xl bg-[#111113] border border-[#1E1E22] p-6 space-y-5 shadow-2xl"
        >
          {/* Upload zone */}
          {hasPhoto ? (
            <div className="relative rounded-2xl bg-[#F9CA1F]/5 border border-[#F9CA1F]/20 h-36 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <span className="text-green-400 text-sm">✓</span>
                </div>
                <span className="text-sm text-zinc-300">{t("demo_photo_added")}</span>
              </div>
              <button
                onClick={() => setHasPhoto(false)}
                className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setHasPhoto(true)}
              className="w-full rounded-2xl border-2 border-dashed border-[#2A2A2E] bg-[#0C0C0E] hover:border-[#F9CA1F]/30 hover:bg-[#F9CA1F]/3 transition-all py-8 flex flex-col items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-[#F9CA1F]/10 flex items-center justify-center">
                <Upload className="w-5 h-5 text-[#F9CA1F]" />
              </div>
              <div className="text-center">
                <p className="text-sm text-zinc-300 font-medium">{t("demo_add_photo")}</p>
                <p className="text-xs text-zinc-600 mt-0.5">{t("demo_add_photo_hint")}</p>
              </div>
            </button>
          )}

          {/* Prompt */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t("demo_placeholder")}
            rows={2}
            className="w-full rounded-xl border border-[#2A2A2E] bg-[#0C0C0E] px-4 py-3 text-sm text-white placeholder:text-zinc-600 resize-none focus:outline-none focus:border-[#F9CA1F]/40 transition-colors"
          />

          {/* Inspirations */}
          <div className="space-y-2">
            <p className="text-xs text-zinc-600 uppercase tracking-wider font-medium">{t("demo_inspirations")}</p>
            <div className="flex gap-2 flex-wrap">
              {INSPIRATIONS.map((insp) => (
                <button
                  key={insp.id}
                  onClick={() => setSelected(selected === insp.id ? null : insp.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all",
                    selected === insp.id
                      ? "bg-[#F9CA1F] text-black border-[#F9CA1F]"
                      : "bg-[#0C0C0E] text-zinc-400 border-[#2A2A2E] hover:border-[#F9CA1F]/30 hover:text-white"
                  )}
                >
                  <span>{insp.icon}</span>
                  {insp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate */}
          <button
            onClick={handleGenerate}
            className="w-full py-4 rounded-2xl bg-[#F9CA1F] text-black font-heading font-bold text-base flex items-center justify-center gap-2.5 hover:bg-[#F9CA1F]/90 active:scale-[0.98] transition-all"
          >
            <Sparkles className="w-5 h-5" />
            {t("demo_generate_btn")}
          </button>

          <p className="text-center text-xs text-zinc-600">
            {t("demo_free_note")}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
