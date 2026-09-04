"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck, UserPlus } from "lucide-react";
import { register } from "@/lib/api";
import { saveSession } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordHint = useMemo(() => {
    if (!password) return "Use at least 8 characters.";
    if (password.length < 8) return `${8 - password.length} more character${8 - password.length === 1 ? "" : "s"} needed.`;
    return "Password length is valid.";
  }, [password]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedName.length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const session = await register(normalizedName, normalizedEmail, password);
      saveSession(session.access_token, session.user);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/30 lg:grid-cols-[1.05fr_.95fr]">
          <div className="hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 p-10 lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                  <ShieldCheck className="h-6 w-6" />
                </span>
                <span className="font-black tracking-tight">Twitter Sentiment AI</span>
              </div>
              <div className="mt-20">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/70">Get started</p>
                <h1 className="mt-4 text-5xl font-black leading-tight">Build your personal intelligence history.</h1>
                <p className="mt-5 max-w-md text-base leading-7 text-white/75">Create your workspace and keep every sentiment analysis connected to your account.</p>
              </div>
            </div>
            <p className="text-sm text-white/60">Private workspace • Secure authentication • Persistent analysis history</p>
          </div>

          <div className="p-7 sm:p-10">
            <div className="mx-auto max-w-md">
              <div className="mb-8 lg:hidden">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600">
                    <ShieldCheck className="h-6 w-6" />
                  </span>
                  <span className="text-xl font-black">Twitter Sentiment AI</span>
                </div>
              </div>

              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-400">Create account</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">Start your workspace</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">Your account keeps your sentiment history and dashboard statistics private to you.</p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label htmlFor="name" className="mb-2 block text-sm font-bold text-slate-200">Full name</label>
                  <input id="name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Your name" minLength={2} required className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10" />
                </div>

                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-bold text-slate-200">Email address</label>
                  <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10" />
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-bold text-slate-200">Password</label>
                  <div className="relative">
                    <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="Minimum 8 characters" minLength={8} required className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3.5 pr-12 text-sm outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10" />
                    <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:bg-slate-800 hover:text-white">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className={`mt-2 text-xs ${password.length >= 8 ? "text-emerald-400" : "text-slate-500"}`}>{passwordHint}</p>
                </div>

                {error && <div role="alert" className="rounded-2xl border border-red-400/20 bg-red-400/10 p-3.5 text-sm text-red-200">{error}</div>}

                <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3.5 text-sm font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">
                  {loading ? <span className="animate-pulse">Creating account...</span> : <><UserPlus className="h-4 w-4" /> Create account</>}
                </button>
              </form>

              <p className="mt-7 text-center text-sm text-slate-400">Already have an account? <Link href="/login" className="font-bold text-cyan-400 hover:text-cyan-300">Sign in</Link></p>
              <Link href="/" className="mt-4 block text-center text-sm text-slate-500 transition hover:text-white">Back to analyzer</Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
