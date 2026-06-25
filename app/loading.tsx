export default function Loading() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="rounded-lg border border-white/10 bg-studio-850 p-5 shadow-glow">
        <p className="font-display text-xs uppercase tracking-[0.18em] text-amberline">Loading Production View</p>
        <div className="mt-4 h-2 w-64 overflow-hidden rounded bg-white/10">
          <div className="h-full w-1/2 animate-pulse rounded bg-amberline" />
        </div>
      </div>
    </main>
  );
}
