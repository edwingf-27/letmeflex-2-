"use client";

import { motion } from "framer-motion";
import { Upload, Sparkles, Download } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

export function HowItWorks() {
  const { t } = useLanguage();

  const steps = [
    {
      number: "01",
      icon: Upload,
      title: t("hiw_step1_title"),
      description: t("hiw_step1_desc"),
    },
    {
      number: "02",
      icon: Sparkles,
      title: t("hiw_step2_title"),
      description: t("hiw_step2_desc"),
    },
    {
      number: "03",
      icon: Download,
      title: t("hiw_step3_title"),
      description: t("hiw_step3_desc"),
    },
  ];

  return (
    <section id="how" className="w-full bg-[#111113] px-4 py-24 md:py-28">
      <div className="mx-auto max-w-4xl">

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-white">
            {t("hiw_title")}
          </h2>
          <p className="mt-3 text-zinc-500">
            {t("hiw_subtitle")}
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="relative rounded-2xl bg-[#0C0C0E] border border-[#1E1E22] p-6 flex flex-col gap-4"
            >
              <span className="text-5xl font-heading font-bold text-[#F9CA1F]/10 leading-none select-none">
                {step.number}
              </span>
              <div className="w-11 h-11 rounded-xl bg-[#F9CA1F]/10 flex items-center justify-center">
                <step.icon className="w-5 h-5 text-[#F9CA1F]" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-white text-base">{step.title}</h3>
                <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed">{step.description}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 -right-4 w-8 border-t border-dashed border-[#2A2A2E] z-10" />
              )}
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <a
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#F9CA1F] text-black font-heading font-bold text-base hover:bg-[#F9CA1F]/90 transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            {t("hiw_cta")}
          </a>
          <p className="mt-3 text-xs text-zinc-600">{t("hiw_cta_sub")}</p>
        </motion.div>
      </div>
    </section>
  );
}
