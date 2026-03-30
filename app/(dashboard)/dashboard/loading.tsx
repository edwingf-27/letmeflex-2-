export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      {/* Greeting skeleton */}
      <div>
        <div className="h-9 w-72 bg-surface-2 rounded-lg" />
        <div className="h-5 w-56 bg-surface-2 rounded-lg mt-2" />
      </div>

      {/* Credits card skeleton */}
      <div className="rounded-2xl bg-surface border border-border p-6 h-36" />

      {/* Quick Start skeleton */}
      <div>
        <div className="h-6 w-28 bg-surface-2 rounded-lg mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-surface border border-border p-6 flex flex-col items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-surface-2" />
              <div className="h-4 w-24 bg-surface-2 rounded" />
              <div className="h-3 w-32 bg-surface-2 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent generations skeleton */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-44 bg-surface-2 rounded-lg" />
          <div className="h-4 w-16 bg-surface-2 rounded" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-video rounded-xl bg-surface border border-border"
            />
          ))}
        </div>
      </div>

      {/* Referral skeleton */}
      <div className="rounded-2xl bg-surface border border-border p-6 h-32" />
    </div>
  );
}
