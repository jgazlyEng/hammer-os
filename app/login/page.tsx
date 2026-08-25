"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Clapperboard, LockKeyhole } from "lucide-react";

const authErrorMessages: Record<string, string> = {
  google_oauth_not_configured: "Google sign-in is not configured yet. Add the Google OAuth env vars on the server and restart the app.",
  missing_code: "Google did not return an authorization code. Please try signing in again.",
  invalid_google_state: "Google sign-in expired or failed validation. Please try again.",
  google_signin_failed: "Google sign-in failed. Check the OAuth client settings and try again."
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");
  const [email, setEmail] = useState("admin@hammer.local");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(authError ? authErrorMessages[authError] ?? "Sign-in failed. Please try again." : "Sign in with Google or your GreenLight account.");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("Checking credentials...");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: password || "demo" })
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Could not sign in.");
        return;
      }

      setMessage(`Signed in as ${data.user.name}.`);
      router.push("/");
      router.refresh();
    } catch {
      setMessage("Sign-in service is unavailable.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto grid min-h-[80vh] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <div className="inline-flex items-center gap-3 rounded-full border border-amberline/25 bg-amberline/10 px-4 py-2 font-display text-xs uppercase tracking-[0.2em] text-amberline">
            <Clapperboard className="h-4 w-4" />
            Script Map
          </div>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-tight text-studio-100 md:text-7xl">GreenLight</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-studio-300">
            Sign in to manage project slates, upload scripts and treatments, review diffs, approve assets, and keep studio development work in one place.
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-studio-900/80 p-6 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg border border-amberline/25 bg-amberline/10 p-3 text-amberline">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-xs uppercase tracking-[0.2em] text-amberline">Secure Slate</p>
              <h2 className="mt-1 text-2xl font-semibold text-studio-100">Sign In</h2>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Link href="/api/auth/google" className="flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 font-semibold text-studio-100 transition hover:border-amberline/35 hover:bg-white/[0.07] hover:text-amberline">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-[13px] font-black text-studio-950">G</span>
              Continue with Google
            </Link>
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-studio-500">
              <span className="h-px flex-1 bg-white/10" />
              Password
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <label className="block">
              <span className="mb-2 block font-display text-xs uppercase tracking-[0.16em] text-studio-300">Email</span>
              <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="block">
              <span className="mb-2 block font-display text-xs uppercase tracking-[0.16em] text-studio-300">Password</span>
              <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Production password" />
            </label>
            <button type="submit" disabled={submitting} className="w-full rounded-md bg-amberline px-4 py-3 font-semibold text-studio-950 transition hover:bg-[#f1c974] disabled:cursor-wait disabled:opacity-70">
              {submitting ? "Signing In..." : "Enter Command Center"}
            </button>
            <p className="text-sm leading-6 text-studio-300">{message}</p>
          </form>
        </section>
      </div>
    </main>
  );
}
