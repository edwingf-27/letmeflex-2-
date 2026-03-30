"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CATEGORIES } from "@/types/categories";
import { cn } from "@/lib/utils";
import { Sparkles, Download, ImageIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

interface Generation {
  id: string;
  category: string;
  subcategory: string;
  imageUrl: string;
  createdAt: string;
  faceSwap: boolean;
}

const categoryFilterOptions = [
  { key: "all", label: "All" },
  ...Object.entries(CATEGORIES).map(([key, cat]) => ({
    key,
    label: cat.label,
  })),
];

export default function GalleryPage() {
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: generations = [], isLoading } = useQuery<Generation[]>({
    queryKey: ["gallery-generations"],
    queryFn: async () => {
      const res = await fetch("/api/generate/status/recent?all=true");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const filteredGenerations =
    activeFilter === "all"
      ? generations
      : generations.filter((g) => g.category === activeFilter);

  const handleDownload = async (imageUrl: string, category: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `letmeflex-${category}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download image.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold">
          My <span className="text-gold">Gallery</span>
        </h1>
        <p className="text-text-muted mt-1 text-sm">
          All your generated images in one place.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categoryFilterOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setActiveFilter(opt.key)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0",
              activeFilter === opt.key
                ? "bg-gold text-black"
                : "bg-surface-2 border border-border text-text-muted hover:text-text-primary hover:border-gold/20"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="columns-2 lg:columns-3 gap-4 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl bg-surface border border-border animate-pulse"
              style={{ height: `${200 + Math.random() * 150}px` }}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredGenerations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-gold" />
          </div>
          <h3 className="font-heading font-semibold text-lg">
            {activeFilter === "all"
              ? "No generations yet"
              : "No images in this category"}
          </h3>
          <p className="text-sm text-text-muted mt-2 max-w-sm">
            {activeFilter === "all"
              ? "Create your first flex and it will appear here."
              : "Try generating something in this category."}
          </p>
          <Link
            href="/generate"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gold text-black font-heading font-bold text-sm hover:bg-gold-dark transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Generate your first flex
          </Link>
        </div>
      )}

      {/* Masonry Grid */}
      {!isLoading && filteredGenerations.length > 0 && (
        <div className="columns-2 lg:columns-3 gap-4 space-y-4">
          {filteredGenerations.map((gen, index) => (
            <motion.div
              key={gen.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.3 }}
              className="break-inside-avoid group relative rounded-xl overflow-hidden bg-surface border border-border"
            >
              <div className="relative">
                <Image
                  src={gen.imageUrl}
                  alt={`${gen.category} - ${gen.subcategory}`}
                  width={600}
                  height={600}
                  className="w-full h-auto object-cover"
                  unoptimized
                />

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-medium capitalize">
                      {CATEGORIES[gen.category]?.label || gen.category}
                    </span>
                    <button
                      onClick={() =>
                        handleDownload(gen.imageUrl, gen.category)
                      }
                      className="p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
