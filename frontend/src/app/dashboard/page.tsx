"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, CheckCircle2, Clock3, Download, LogOut, MessageSquareText, MinusCircle, Search, ShieldCheck, Sparkles, Trash2, TrendingDown, TrendingUp, UserRound } from "lucide-react";
import { analyzeAndSaveText, deleteAnalysis, getAnalysisHistory, getCurrentUser, getDashboardStats, type AnalysisHistoryItem, type AuthUser, type DashboardStats, type SentimentResult } from "@/lib/api";
import { clearSession, getToken } from "@/lib/auth";

const initialStats: DashboardStats = { total_analyses: 0, positive: 0, negative: 0, neutral: 0, average_confidence: 0 };

function sentimentTone(sentiment: string) {
  if (sentiment === "positive") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (sentiment === "negative") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function csvEscape(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<SentimentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async (sessionToken: string) => {
    const [currentUser, dashboard, analysisHistory] = await Promise.all([
      getCurrentUser(sessionToken),
      getDashboardStats(sessionToken),
      getAnalysisHistory(sessionToken),
    ]);
    setUser(currentUser);
    setStats(dashboard);
    setHistory(analysisHistory.items);
  }, []);

  useEffect(() => {
    const sessionToken = getToken();
    if (!sessionToken) {
      router.replace("/login");
      return;
    }
    setToken(sessionToken);
    loadData(sessionToken)
      .catch(() => {
        clearSession();
        router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [loadData, router]);

  async function analyze() {
    if (!token || !text.trim()) return;
    setAnalyzing(true);
    setError("");
    try {
      const analysis = await analyzeAndSaveText(text.trim(), token);
      setResult(analysis);
      setText("");
      await loadData(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function remove(id: number) {
    if (!token) return;
    setError("");
    try {
      await deleteAnalysis(id, token);
      await loadData(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete analysis.");
    }
  }

  function exportHistory() {
    if (history.length === 0) {
      setError("There is no analysis history to export yet.");
      return;
    }
    const header = ["id", "text", "sentiment", "confidence", "method", "created_at"];
    const rows = history.map((item) => [
      String(item.id),
      item.text,
      item.sentiment,
      String(item.confidence),
      item.method,
      item.created_at,
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sentiment-analysis-history.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function logout() {
    clearSession();
    router.replace("/login");
  }

  const filteredHistory = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return history;
    return history.filter((item) =>
      item.text.toLowerCase().includes(query) || item.sentiment.toLowerCase().includes(query)
    );
  }, [history, search]);

  const positivity = stats.total_analyses ? Math.round((stats.positive / stats.total_analyses) * 100) : 0;
  const negativity = stats.total_analyses ? Math.round((stats.negative / stats.total_analyses) * 100) : 0;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white grid place-items-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-2xl bg-cyan-400/20" />
          <p className="text-sm text-slate-400">Loading your intelligence workspace...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-400">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-[0.22em]">Private workspace</span>
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Welcome, {user?.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
              <span className="inline-flex items-center gap-1.5"><UserRound className="h-4 w-4" />{user?.email}</span>
              <span>Saved sentiment intelligence and personal analytics.</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => router.push("/")} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900">Open analyzer</button>
            <button onClick={logout} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-slate-200"><LogOut className="h-4 w-4" /> Logout</button>
          </div>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><div className="flex items-center justify-between"><span className="text-sm text-slate-400">Total analyses</span><BarChart3 className="h-4 w-4 text-cyan-400" /></div><p className="mt-3 text-3xl font-black">{stats.total_analyses}</p></div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5"><div className="flex items-center justify-between"><span className="text-sm text-emerald-200">Positive</span><TrendingUp className="h-4 w-4 text-emerald-300" /></div><p className="mt-3 text-3xl font-black">{stats.positive}</p><p className="mt-1 text-xs text-emerald-200">{positivity}% of saved analyses</p></div>
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-5"><div className="flex items-center justify-between"><span className="text-sm text-rose-200">Negative</span><TrendingDown className="h-4 w-4 text-rose-300" /></div><p className="mt-3 text-3xl font-black">{stats.negative}</p><p className="mt-1 text-xs text-rose-200">{negativity}% of saved analyses</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><div className="flex items-center justify-between"><span className="text-sm text-slate-400">Neutral</span><MinusCircle className="h-4 w-4 text-slate-400" /></div><p className="mt-3 text-3xl font-black">{stats.neutral}</p></div>
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5"><div className="flex items-center justify-between"><span className="text-sm text-cyan-200">Avg. confidence</span><CheckCircle2 className="h-4 w-4 text-cyan-300" /></div><p className="mt-3 text-3xl font-black">{Math.round(stats.average_confidence * 100)}%</p></div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-900/70 p-6 shadow-2xl shadow-black/20 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div><div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300"><Sparkles className="h-3.5 w-3.5" /> Saved AI analysis</div><h2 className="mt-4 text-2xl font-black">Analyze and save sentiment</h2><p className="mt-2 text-sm text-slate-400">Run the ML pipeline and automatically add the result to your private history.</p></div>
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a tweet, review, support message, or social-media post..." maxLength={5000} className="mt-6 min-h-48 w-full rounded-2xl border border-slate-700 bg-slate-950/80 p-4 text-sm leading-6 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10" />
            {error && <p className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
            <button onClick={analyze} disabled={analyzing || !text.trim()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-6 py-3.5 font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"><MessageSquareText className="h-5 w-5" />{analyzing ? "Running sentiment analysis..." : "Analyze & save"}</button>
            {result && <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Latest result</p><p className="mt-2 text-2xl font-black capitalize">{result.sentiment}</p></div><div className={`rounded-xl border px-3 py-2 text-center ${sentimentTone(result.sentiment)}`}><p className="text-xs font-bold uppercase tracking-wider">Confidence</p><p className="mt-1 text-xl font-black">{Math.round(result.confidence * 100)}%</p></div></div></div>}
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-6 sm:p-8">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-400">History</p><h2 className="mt-2 text-2xl font-black">Recent analyses</h2></div><Clock3 className="mt-1 h-5 w-5 text-slate-500" /></div>
            <div className="mt-5 flex gap-2"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search text or sentiment" className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-cyan-400" /></div><button onClick={exportHistory} title="Export history as CSV" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"><Download className="h-4 w-4" /><span className="hidden sm:inline">Export</span></button></div>
            <div className="mt-5 max-h-[31rem] space-y-3 overflow-y-auto pr-1">
              {filteredHistory.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">No matching saved analyses.</div> : filteredHistory.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 transition hover:border-slate-700">
                  <div className="flex items-start justify-between gap-3"><p className="line-clamp-3 text-sm leading-6 text-slate-300">{item.text}</p><button onClick={() => remove(item.id)} title="Delete analysis" className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button></div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs"><span className={`rounded-full border px-2.5 py-1 font-bold capitalize ${sentimentTone(item.sentiment)}`}>{item.sentiment}</span><span className="text-slate-500">{Math.round(item.confidence * 100)}% confidence</span></div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
