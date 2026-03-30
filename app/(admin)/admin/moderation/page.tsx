"use client";

import { useEffect, useState, useCallback } from "react";
import { cn, formatDate } from "@/lib/utils";
import {
  Flag,
  Trash2,
  Loader2,
  ImageIcon,
  Save,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

interface ModerationImage {
  id: string;
  userId: string;
  userEmail: string;
  category: string;
  subcategory: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  prompt: string;
  status: string;
  flagged: boolean;
  createdAt: string;
}

interface ModerationResponse {
  images: ModerationImage[];
  total: number;
  page: number;
  pageSize: number;
}

export default function AdminModerationPage() {
  const [data, setData] = useState<ModerationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [flagFilter, setFlagFilter] = useState<"all" | "flagged">("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [flagging, setFlagging] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<ModerationImage | null>(null);

  // Blocked keywords
  const [blockedKeywords, setBlockedKeywords] = useState("");
  const [keywordsLoading, setKeywordsLoading] = useState(true);
  const [keywordsSaving, setKeywordsSaving] = useState(false);

  const pageSize = 24;

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (flagFilter === "flagged") params.set("flagged", "true");

      const res = await fetch(`/api/admin/moderation?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load images");
    } finally {
      setLoading(false);
    }
  }, [page, flagFilter]);

  const fetchKeywords = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/moderation/keywords");
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setBlockedKeywords(json.keywords || "");
    } catch {
      // Keywords endpoint may not exist yet
    } finally {
      setKeywordsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  useEffect(() => {
    fetchKeywords();
  }, [fetchKeywords]);

  const handleFlag = async (image: ModerationImage) => {
    setFlagging(image.id);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationId: image.id,
          action: "flag",
          flagged: !image.flagged,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(image.flagged ? "Flag removed" : "Image flagged");
      // Update locally
      setData((prev) =>
        prev
          ? {
              ...prev,
              images: prev.images.map((img) =>
                img.id === image.id
                  ? { ...img, flagged: !img.flagged }
                  : img
              ),
            }
          : prev
      );
    } catch {
      toast.error("Failed to flag image");
    } finally {
      setFlagging(null);
    }
  };

  const handleDelete = async (image: ModerationImage) => {
    if (!confirm("Delete this generation? The image will be removed and marked as deleted."))
      return;
    setDeleting(image.id);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId: image.id }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Generation deleted");
      setData((prev) =>
        prev
          ? {
              ...prev,
              images: prev.images.filter((img) => img.id !== image.id),
              total: prev.total - 1,
            }
          : prev
      );
    } catch {
      toast.error("Failed to delete generation");
    } finally {
      setDeleting(null);
    }
  };

  const handleSaveKeywords = async () => {
    setKeywordsSaving(true);
    try {
      const res = await fetch("/api/admin/moderation/keywords", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: blockedKeywords }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Blocked keywords updated");
    } catch {
      toast.error("Failed to save keywords");
    } finally {
      setKeywordsSaving(false);
    }
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold">Moderation</h1>
        <p className="text-text-muted mt-1">
          Review generated images, flag inappropriate content, and manage
          blocked keywords.
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            setFlagFilter("all");
            setPage(1);
          }}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-xl border transition-colors",
            flagFilter === "all"
              ? "border-gold/40 bg-gold/10 text-gold"
              : "border-border bg-surface text-text-muted hover:text-text-primary"
          )}
        >
          All Images
        </button>
        <button
          onClick={() => {
            setFlagFilter("flagged");
            setPage(1);
          }}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition-colors",
            flagFilter === "flagged"
              ? "border-red-500/40 bg-red-500/10 text-red-400"
              : "border-border bg-surface text-text-muted hover:text-text-primary"
          )}
        >
          <Flag className="w-3.5 h-3.5" />
          Flagged Only
        </button>
        {data && (
          <span className="text-xs text-text-muted ml-auto">
            {data.total} images
          </span>
        )}
      </div>

      {/* Image Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-surface border border-border rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : data?.images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <ImageIcon className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-sm">No images found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {data?.images.map((image) => (
            <div
              key={image.id}
              className={cn(
                "group relative aspect-square rounded-xl border overflow-hidden bg-surface transition-all",
                image.flagged
                  ? "border-red-500/30 ring-1 ring-red-500/20"
                  : "border-border hover:border-gold/20"
              )}
            >
              {/* Image */}
              {image.thumbnailUrl || image.imageUrl ? (
                <img
                  src={image.thumbnailUrl || image.imageUrl || ""}
                  alt={image.category}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-surface-2">
                  <ImageIcon className="w-8 h-8 text-text-muted/30" />
                </div>
              )}

              {/* Flagged badge */}
              {image.flagged && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-red-500/80 text-white text-[10px] font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Flagged
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                <div className="text-xs space-y-0.5">
                  <p className="text-text-primary font-medium truncate">
                    {image.userEmail}
                  </p>
                  <p className="text-text-muted">{image.category}</p>
                  <p className="text-text-muted text-[10px]">
                    {formatDate(image.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewImage(image);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-surface-2/80 text-text-muted hover:text-text-primary text-xs transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFlag(image);
                    }}
                    disabled={flagging === image.id}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors",
                      image.flagged
                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        : "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                    )}
                  >
                    {flagging === image.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Flag className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(image);
                    }}
                    disabled={deleting === image.id}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs transition-colors"
                  >
                    {deleting === image.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg bg-surface border border-border disabled:opacity-30 hover:border-gold/20 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg bg-surface border border-border disabled:opacity-30 hover:border-gold/20 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Blocked Keywords Config */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <h3 className="font-heading font-bold text-lg">Blocked Keywords</h3>
        </div>
        <p className="text-xs text-text-muted mb-4">
          Enter comma-separated keywords that should be blocked from generation
          prompts. These are checked before image generation begins.
        </p>
        {keywordsLoading ? (
          <div className="h-32 bg-surface-2 rounded-xl animate-pulse" />
        ) : (
          <>
            <textarea
              value={blockedKeywords}
              onChange={(e) => setBlockedKeywords(e.target.value)}
              rows={5}
              placeholder="e.g. explicit, gore, violence, hate, ..."
              className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm placeholder:text-text-muted focus:outline-none focus:border-gold/40 resize-none font-mono"
            />
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-text-muted">
                {blockedKeywords
                  ? blockedKeywords
                      .split(",")
                      .filter((k) => k.trim()).length
                  : 0}{" "}
                keywords configured
              </span>
              <button
                onClick={handleSaveKeywords}
                disabled={keywordsSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-black font-heading font-bold rounded-xl hover:bg-gold/90 transition-colors text-sm disabled:opacity-50"
              >
                {keywordsSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Keywords
              </button>
            </div>
          </>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-surface border border-border rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold">Image Preview</h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg hover:bg-surface-2"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            {/* Full Image */}
            <div className="aspect-square rounded-xl bg-bg border border-border overflow-hidden mb-4">
              {previewImage.imageUrl ? (
                <img
                  src={previewImage.imageUrl}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted">
                  <ImageIcon className="w-16 h-16 opacity-20" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">
                  User
                </p>
                <p>{previewImage.userEmail}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">
                  Category
                </p>
                <p>{previewImage.category}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">
                  Status
                </p>
                <p>{previewImage.status}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">
                  Date
                </p>
                <p>{formatDate(previewImage.createdAt)}</p>
              </div>
            </div>

            {/* Prompt */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                Prompt
              </p>
              <div className="bg-bg border border-border rounded-xl p-4 max-h-32 overflow-y-auto">
                <p className="text-sm text-text-muted whitespace-pre-wrap">
                  {previewImage.prompt}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  handleFlag(previewImage);
                  setPreviewImage({
                    ...previewImage,
                    flagged: !previewImage.flagged,
                  });
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-colors",
                  previewImage.flagged
                    ? "border-red-500/30 bg-red-500/10 text-red-400"
                    : "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                )}
              >
                <Flag className="w-4 h-4" />
                {previewImage.flagged ? "Unflag" : "Flag"}
              </button>
              <button
                onClick={() => {
                  handleDelete(previewImage);
                  setPreviewImage(null);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
