"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { analyzeAndSaveText, deleteAnalysis, getAnalysisHistory, getCurrentUser, getDashboardStats, type AnalysisHistoryItem, type AuthUser, type DashboardStats, type SentimentResult } from "@/lib/api";
import { clearSession, getToken } from "@/lib/auth";

const initialStats: DashboardStats = { total_analyses: 0, positive: 0, negative: 0, neutral: 0, average_confidence: 0 };

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [text, setText] = useState("");
  const [result, setResult] = useState<SentimentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  async function loadData(sessionToken: string) {
    const [currentUser, dashboard, analysisHistory] = await Promise.all([getCurrentUser(sessionToken), getDashboardStats(sessionToken), getAnalysisHistory(sessionToken)]);
    setUser(currentUser); setStats(dashboard); setHistory(analysisHistory.items);
  }

  useEffect(() => {
    const sessionToken = getToken();
    if (!sessionToken) { router.replace("/login"); return; }
    setToken(sessionToken);
    loadData(sessionToken).catch(() => { clearSession(); router.replace("/login"); }).finally(() => setLoading(false));
  }, [router]);

  async function analyze() {
    if (!token || !text.trim()) return;
    setAnalyzing(true); setError("");
    try { setResult(await analyzeAndSaveText(text, token)); setText(""); await loadData(token); }
    catch (err) { setError(err instanceof Error ? err.message : "Analysis failed."); }
    finally { setAnalyzing(false); }
  }

  async function remove(id: number) {
    if (!token) return;
    await deleteAnalysis(id, token); await loadData(token);
  }

  function logout() { clearSession(); router.push("/login"); }

  if (loading) return <main className="min-h-screen bg-slate-950 text-white grid place-items-center">Loading dashboard...</main>;

  return <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
    <header className="mx-auto flex max-w-6xl items-center justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Private workspace</p><h1 className="mt-2 text-3xl font-bold">Welcome, {user?.name}</h1></div>
      <button onClick={logout} className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">Logout</button>
    </header>

    <section className="mx-auto mt-8 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {[['Total', stats.total_analyses], ['Positive', stats.positive], ['Negative', stats.negative], ['Neutral', stats.neutral], ['Avg. confidence', `${Math.round(stats.average_confidence * 100)}%`]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-slate-900 p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}
    </section>

    <section className="mx-auto mt-6 grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_.9fr]">
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h2 className="text-xl font-bold">Analyze and save sentiment</h2>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Paste a tweet, review, or social-media message..." maxLength={5000} className="mt-4 min-h-44 w-full rounded-xl border border-slate-700 bg-slate-950 p-4 outline-none focus:border-cyan-400" />
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        <button onClick={analyze} disabled={analyzing || !text.trim()} className="mt-4 rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 disabled:opacity-50">{analyzing ? "Analyzing..." : "Analyze sentiment"}</button>
        {result && <div className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4"><p className="font-semibold capitalize">{result.sentiment}</p><p className="mt-1 text-sm text-slate-300">Confidence: {Math.round(result.confidence * 100)}% · {result.method}</p></div>}
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h2 className="text-xl font-bold">Recent analyses</h2>
        <div className="mt-4 space-y-3">{history.length === 0 ? <p className="text-sm text-slate-400">Your saved analyses will appear here.</p> : history.slice(0, 8).map(item => <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><div className="flex items-start justify-between gap-3"><p className="line-clamp-2 text-sm text-slate-300">{item.text}</p><button onClick={() => remove(item.id)} className="text-xs text-red-300 hover:text-red-200">Delete</button></div><p className="mt-2 text-xs font-semibold capitalize text-cyan-400">{item.sentiment} · {Math.round(item.confidence * 100)}%</p></div>)}</div>
      </div>
    </section>
  </main>;
}
