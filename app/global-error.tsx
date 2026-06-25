"use client";

import { AlertTriangle } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#070908] font-sans text-[#eef3ef]">
        <main className="flex min-h-screen items-center justify-center px-6">
          <section className="max-w-xl rounded-lg border border-red-300/30 bg-[#111715] p-6">
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-red-300">
              <AlertTriangle className="h-5 w-5" />
              Global Error
            </div>
            <h1 className="mt-4 text-2xl font-semibold">Hammer could not finish loading.</h1>
            <p className="mt-3 text-sm leading-6 text-[#a5b2aa]">{error.message || "A runtime error interrupted the app shell."}</p>
            <button
              type="button"
              onClick={reset}
              className="mt-5 rounded-md bg-[#e7b65a] px-4 py-2 text-sm font-semibold text-[#070908]"
            >
              Retry
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
