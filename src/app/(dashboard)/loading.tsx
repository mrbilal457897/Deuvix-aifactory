export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-64 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-11 w-36 rounded-lg bg-muted animate-pulse" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="size-9 rounded-lg bg-muted animate-pulse" />
            <div className="mt-4 h-6 w-12 rounded bg-muted animate-pulse" />
            <div className="mt-2 h-3 w-20 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="hidden md:block px-5 py-3 bg-muted">
          <div className="h-3 w-40 rounded bg-muted animate-pulse" />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-4 border-t border-border">
            <div className="size-10 rounded-lg bg-muted animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-3.5 w-1/2 rounded bg-muted animate-pulse" />
              <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
