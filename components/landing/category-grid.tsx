"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/types/categories";

const categoryEntries = Object.entries(CATEGORIES);

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export function CategoryGrid() {
  return (
    <section
      id="categories"
      className="w-full bg-bg px-4 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        {/* Section heading */}
        <div className="mb-12 text-center md:mb-16">
          <h2 className="font-heading text-display-2 text-text-primary">
            What will you flex today?
          </h2>
          <p className="mt-4 font-body text-text-muted">
            Choose a category and start generating in seconds.
          </p>
        </div>

        {/* Desktop grid / Mobile horizontal scroll */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className={cn(
            "flex gap-4 overflow-x-auto pb-4 md:pb-0",
            "md:grid md:grid-cols-4 md:grid-rows-2 md:overflow-x-visible",
            "scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          )}
        >
          {categoryEntries.map(([key, category]) => (
            <motion.div
              key={key}
              variants={cardVariants}
              className={cn(
                "group relative flex-shrink-0 cursor-pointer overflow-hidden rounded-card",
                "w-[200px] md:w-auto",
                "border border-border bg-surface transition-all duration-300",
                "hover:border-gold/50 hover:shadow-[0_0_24px_rgba(249,202,31,0.12)]"
              )}
            >
              <div className="flex flex-col items-center justify-center px-4 py-10 md:py-14">
                <span className="mb-4 text-4xl" role="img" aria-label={category.label}>
                  {category.icon}
                </span>
                <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-text-primary">
                  {category.label}
                </h3>
                <p className="mt-2 text-center font-body text-xs text-text-subtle">
                  {category.description}
                </p>
              </div>

              {/* Hover gold glow overlay */}
              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background:
                    "radial-gradient(circle at 50% 100%, rgba(249,202,31,0.08) 0%, transparent 70%)",
                }}
                aria-hidden="true"
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
