"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowDown, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.7, ease: "easeOut" as const },
  }),
};

export function Hero() {
  const { t } = useLanguage();

  return (
    <section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#0C0C0E] px-4 max-w-[100vw]">

      {/* Grid background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(rgba(42,42,46,0.35) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(42,42,46,0.35) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Gold radial glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: "900px",
          height: "600px",
          background: "radial-gradient(ellipse, rgba(249,202,31,0.07) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-5xl mx-auto">

        {/* Badge */}
        <motion.div
          custom={0} variants={fadeUp} initial="hidden" animate="visible"
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#F9CA1F]/20 bg-[#F9CA1F]/5 px-3 py-1.5 max-w-[90vw]"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#F9CA1F] flex-shrink-0" />
          <span className="text-[10px] sm:text-xs font-medium tracking-wide text-[#F9CA1F] whitespace-nowrap">
            {t("hero_badge")}
          </span>
        </motion.div>

        {/* Main title */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
          <h1 className="font-heading font-extrabold leading-none tracking-tight text-white text-[10vw] sm:text-7xl md:text-8xl lg:text-[9rem]">
            letmeflex
            <span className="text-[#F9CA1F]">.ai</span>
          </h1>
        </motion.div>

        {/* Accroche */}
        <motion.p
          custom={2} variants={fadeUp} initial="hidden" animate="visible"
          className="mt-4 font-heading font-bold text-xl sm:text-2xl md:text-3xl tracking-tight"
          style={{
            background: "linear-gradient(90deg, #F9CA1F 0%, #fff 60%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {t("hero_tagline")}
        </motion.p>

        {/* Sous-tagline */}
        <motion.p
          custom={3} variants={fadeUp} initial="hidden" animate="visible"
          className="mt-4 max-w-xl text-sm text-zinc-400 sm:text-base md:text-xl leading-relaxed text-center px-2"
        >
          {t("hero_subtitle")}
        </motion.p>

        {/* CTAs */}
        <motion.div
          custom={4} variants={fadeUp} initial="hidden" animate="visible"
          className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto px-4 sm:px-0"
        >
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#F9CA1F] text-black font-heading font-bold text-base hover:bg-[#F9CA1F]/90 transition-all active:scale-95 text-center"
          >
            {t("hero_cta_start")}
          </Link>
          <a
            href="#studio"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-[#2A2A2E] text-zinc-300 text-base hover:border-[#F9CA1F]/30 hover:text-white transition-all text-center"
          >
            {t("hero_cta_how")}
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div
          custom={5} variants={fadeUp} initial="hidden" animate="visible"
          className="mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-10 w-full"
        >
          {[
            { value: "10 000+", labelKey: "hero_stat_photos" as const },
            { value: "< 30s", labelKey: "hero_stat_speed" as const },
            { value: "100%", labelKey: "hero_stat_ai" as const },
          ].map((stat) => (
            <div key={stat.labelKey} className="text-center">
              <div className="text-2xl font-heading font-bold text-[#F9CA1F]">{stat.value}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{t(stat.labelKey)}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.a
        href="#studio"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-10 flex flex-col items-center gap-2 text-zinc-600 hover:text-[#F9CA1F] transition-colors"
      >
        <span className="text-xs tracking-widest uppercase">{t("hero_scroll")}</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <ArrowDown className="w-4 h-4" />
        </motion.div>
      </motion.a>
    </section>
  );
}
