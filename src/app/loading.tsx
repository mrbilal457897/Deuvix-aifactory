/**
 * Shown while a route segment streams in. Reserves the main content area so
 * the navbar/footer never jump; layout is paint-only (pulse opacity only).
 */
export default function Loading() {
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-7xl px-6 pt-16 pb-24" style={{ minHeight: "70vh" }}>
      <div className="h-4 w-40 rounded-none bg-muted animate-pulse" />
      <div className="mt-4 h-10 w-2/3 max-w-xl rounded-none bg-muted animate-pulse" />
      <div className="mt-6 h-4 w-full max-w-2xl rounded-none bg-muted animate-pulse" />
      <div className="mt-2 h-4 w-5/6 max-w-xl rounded-none bg-muted animate-pulse" />
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="aspect-[4/3] rounded-none bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}
