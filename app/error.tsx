"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-studio-950 px-6 font-sans text-studio-100">
      <section className="max-w-xl rounded-lg border border-ember/30 bg-studio-850 p-6 shadow-glow">
        <div className="flex items-center gap-3 font-display text-xs uppercase tracking-[0.18em] text-ember">
          <AlertTriangle className="h-5 w-5" />
          GreenLight Error
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-studio-100">This view could not be rendered.</h1>
        <p className="mt-3 text-sm leading-6 text-studio-300">
          The app caught a runtime error while loading this screen. Retry the render, or restart the local dev server if the dev cache is stale.
        </p>
        {error.message ? <p className="mt-4 rounded border border-white/10 bg-white/[0.03] p-3 text-sm text-studio-300">{error.message}</p> : null}
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-amberline px-4 py-2 text-sm font-semibold text-studio-950 transition hover:bg-[#f1c974]"
        >
          <RotateCcw className="h-4 w-4" />
          Retry
        </button>
      </section>
    </main>
  );
}
