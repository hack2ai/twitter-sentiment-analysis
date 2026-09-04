"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { saveSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); setError(""); setLoading(true);
    try { const session = await login(email, password); saveSession(session.access_token, session.user); router.push("/dashboard"); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to sign in."); }
    finally { setLoading(false); }
  }

  return <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
    <section className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl">
      <p className="text-sm font-semibold tracking-widest text-cyan-400 uppercase">Social Sentiment Intelligence</p>
      <h1 className="mt-4 text-3xl font-bold">Welcome back</h1>
      <p className="mt-2 text-slate-400">Sign in to access your private sentiment analytics dashboard.</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" required className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400" />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400" />
        {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        <button disabled={loading} className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">{loading ? "Signing in..." : "Sign in"}</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">New here? <Link href="/register" className="text-cyan-400 hover:underline">Create an account</Link></p>
      <Link href="/" className="mt-5 block text-center text-sm text-slate-500 hover:text-white">← Back to analyzer</Link>
    </section>
  </main>;
}
