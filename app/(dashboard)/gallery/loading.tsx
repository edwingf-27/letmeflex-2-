export default function GalleryLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div>
        <div className="h-9 w-40 bg-surface-2 rounded-lg" />
        <div className="h-5 w-60 bg-surface-2 rounded-lg mt-1" />
      </div>

      {/* Filter tabs skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-9 rounded-full bg-surface-2 border border-border"
            style={{ width: `${60 + i * 16}px` }}
          />
        ))}
      </div>

      {/* Masonry grid skeleton */}
      <div className="columns-2 lg:columns-3 gap-4 space-y-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="break-inside-avoid rounded-xl bg-surface border border-border"
            style={{
              height: `${180 + ((i * 67) % 120)}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
