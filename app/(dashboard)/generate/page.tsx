"use client";

import Link from "next/link";
import { CATEGORIES } from "@/types/categories";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const categoryKeys = Object.keys(CATEGORIES);

export default function GeneratePage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl lg:text-4xl font-heading font-bold">
          What will you <span className="text-gold">flex</span> today?
        </h1>
        <p className="text-text-muted mt-2 text-sm lg:text-base">
          Pick a category and generate stunning AI images in seconds.
        </p>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {categoryKeys.map((key, index) => {
          const cat = CATEGORIES[key];
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <Link
                href={`/generate/${key}`}
                className={cn(
                  "group relative flex flex-col items-center text-center gap-3 p-6 rounded-2xl",
                  "bg-surface border border-border",
                  "hover:border-gold/30 hover:shadow-gold-sm",
                  "transition-all duration-200"
                )}
              >
                <span className="text-4xl lg:text-5xl">{cat.icon}</span>
                <span className="font-heading font-semibold text-sm lg:text-base">
                  {cat.label}
                </span>
                <span className="text-xs text-text-muted leading-relaxed">
                  {cat.description}
                </span>

                {/* Hover glow overlay */}
                <div className="absolute inset-0 rounded-2xl bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
