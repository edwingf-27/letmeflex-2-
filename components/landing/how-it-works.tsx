"use client";

import { motion } from "framer-motion";
import { Paintbrush, SlidersHorizontal, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    number: "1",
    title: "Choose your flex",
    description:
      "Pick a category — watches, supercars, mansions, yachts, nightlife and more.",
    icon: Paintbrush,
  },
  {
    number: "2",
    title: "Customize the details",
    description:
      "Select the brand, model, setting, and angle. Add your face with face swap.",
    icon: SlidersHorizontal,
  },
  {
    number: "3",
    title: "Download & post",
    description:
      "Get your HD image in seconds. Download and share on social media instantly.",
    icon: Download,
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

export function HowItWorks() {
  return (
    <section className="w-full bg-surface px-4 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        {/* Section heading */}
        <div className="mb-16 text-center">
          <h2 className="font-heading text-display-2 text-text-primary">
            How it works
          </h2>
          <p className="mt-4 font-body text-text-muted">
            Three simple steps to your next flex.
          </p>
        </div>

        {/* Steps */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-8 md:grid-cols-3 md:gap-12"
        >
          {steps.map((step) => (
            <motion.div
              key={step.number}
              variants={itemVariants}
              className="flex flex-col items-center text-center"
            >
              {/* Numbered circle */}
              <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold bg-bg">
                <span className="font-heading text-xl font-bold text-gold">
                  {step.number}
                </span>
                {/* Icon badge */}
                <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-gold">
                  <step.icon className="h-3.5 w-3.5 text-black" />
                </div>
              </div>

              <h3 className="font-heading text-lg font-semibold text-text-primary">
                {step.title}
              </h3>
              <p className="mt-3 max-w-xs font-body text-sm leading-relaxed text-text-muted">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
