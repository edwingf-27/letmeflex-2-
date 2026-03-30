export default function GenerateLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="text-center">
        <div className="h-9 w-80 bg-surface-2 rounded-lg mx-auto" />
        <div className="h-5 w-64 bg-surface-2 rounded-lg mx-auto mt-2" />
      </div>

      {/* Category grid skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-surface border border-border p-6 flex flex-col items-center gap-3"
          >
            <div className="w-12 h-12 rounded-full bg-surface-2" />
            <div className="h-4 w-28 bg-surface-2 rounded" />
            <div className="h-3 w-36 bg-surface-2 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
