import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6">
      <section className="max-w-xl rounded-lg border border-white/10 bg-studio-850 p-6 shadow-glow">
        <div className="flex items-center gap-3 font-display text-xs uppercase tracking-[0.18em] text-amberline">
          <FileQuestion className="h-5 w-5" />
          Missing Page
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-studio-100">That production view does not exist.</h1>
        <p className="mt-3 text-sm leading-6 text-studio-300">The route may have changed, or the sequence you tried to open is not in the local mock dataset.</p>
        <Link className="mt-5 inline-flex rounded-md bg-amberline px-4 py-2 text-sm font-semibold text-studio-950 transition hover:bg-[#f1c974]" href="/">
          Back to Executive Dashboard
        </Link>
      </section>
    </main>
  );
}
