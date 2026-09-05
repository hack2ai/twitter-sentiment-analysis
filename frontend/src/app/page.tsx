"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  Layers,
  Loader2,
  LogIn,
  MessageCircle,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Upload,
  UserPlus,
} from "lucide-react";

import {
  analyzeBatch,
  analyzeText,
  fetchMetrics,
  fetchWordCloud,
  getCurrentUser,
  getStreamUrl,
  type BatchSentimentResult,
  type SentimentResult,
  type WordCloudItem,
  type AuthUser,
} from "@/lib/api";
import { MetricsDashboard } from "@/components/MetricsDashboard";
import { getSessionUser, getToken } from "@/lib/auth";
import { cn } from "@/lib/utils";

const WordCloud = dynamic(
  () => import("@/components/WordCloud").then((module) => module.WordCloud),
  { ssr: false }
);

type TabType = "dashboard" | "single" | "batch" | "stream";

function sentimentClasses(sentiment: string) {
  switch (sentiment.toLowerCase()) {
    case "positive":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "negative":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState("");
  const [singleResult, setSingleResult] = useState<SentimentResult | null>(null);
  const [batchResult, setBatchResult] = useState<BatchSentimentResult | null>(null);
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [words, setWords] = useState<WordCloudItem[]>([]);
  const [streamData, setStreamData] = useState<SentimentResult[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let mounted = true;
    const token = getToken();
    const cachedUser = getSessionUser();

    if (!token) {
      setAuthLoading(false);
    } else {
      setCurrentUser(cachedUser);
      getCurrentUser(token)
        .then((user) => {
          if (mounted) setCurrentUser(user);
        })
        .catch(() => {
          if (mounted) setCurrentUser(cachedUser);
        })
        .finally(() => {
          if (mounted) setAuthLoading(false);
        });
    }

    Promise.all([fetchMetrics(), fetchWordCloud()])
      .then(([metricData, wordData]) => {
        if (!mounted) return;
        setMetrics(metricData);
        setWords(wordData);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        if (mounted) setDashboardLoading(false);
      });

    return () => {
      mounted = false;
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, []);

  function switchTab(tab: TabType) {
    setError("");
    setSingleResult(null);
    setBatchResult(null);
    setActiveTab(tab);
  }

  async function handleAnalyzeText(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = text.trim();

    if (!value) {
      setError("Please enter some text to analyze.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await analyzeText(value);
      setSingleResult(result);
    } catch (err) {
      setSingleResult(null);
      setError(err instanceof Error ? err.message : "Unable to analyze the text.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please choose a CSV file.");
      event.target.value = "";
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await analyzeBatch(file);
      setBatchResult(result);
    } catch (err) {
      setBatchResult(null);
      setError(err instanceof Error ? err.message : "Unable to process the CSV file.");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  function toggleStream() {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsStreaming(false);
      return;
    }

    setError("");
    setStreamData([]);

    const source = new EventSource(getStreamUrl());
    eventSourceRef.current = source;
    setIsStreaming(true);

    source.onmessage = (event) => {
      try {
        const item = JSON.parse(event.data) as SentimentResult;
        setStreamData((current) => [item, ...current].slice(0, 50));
      } catch (err) {
        console.error("Invalid stream payload", err);
      }
    };

    source.onerror = () => {
      source.close();
      eventSourceRef.current = null;
      setIsStreaming(false);
    };
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md">
              <MessageCircle className="h-6 w-6 text-white" />
            </span>
            <span>
              <span className="block text-lg font-black tracking-tight text-indigo-700 sm:text-xl">Twitter Sentiment AI</span>
              <span className="hidden text-xs font-medium text-slate-400 sm:block">ML-powered social sentiment intelligence</span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex rounded-xl bg-slate-100 p-1">
              {(["dashboard", "single", "batch", "stream"] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => switchTab(tab)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-semibold capitalize transition sm:px-4",
                    activeTab === tab ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {tab === "dashboard" ? "Overview" : tab}
                </button>
              ))}
            </nav>

            {!authLoading && currentUser ? (
              <Link href="/dashboard" className="inline-flex max-w-[190px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-black text-indigo-700">{currentUser.name.slice(0, 1).toUpperCase()}</span>
                <span className="truncate">{currentUser.name}</span>
              </Link>
            ) : !authLoading ? (
              <>
                <Link href="/login" className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50">
                  <LogIn className="h-4 w-4" /> Login
                </Link>
                <Link href="/register" className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700">
                  <UserPlus className="h-4 w-4" /> Register
                </Link>
              </>
            ) : (
              <div className="h-10 w-24 animate-pulse rounded-xl bg-slate-100" aria-label="Loading account" />
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        {activeTab === "dashboard" && (
          <div className="space-y-8">
            <div className="rounded-3xl bg-gradient-to-br from-indigo-700 via-violet-700 to-slate-900 p-7 text-white shadow-xl sm:p-9">
              <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white/80"><Sparkles className="h-3.5 w-3.5" /> AI sentiment workspace</div>
                  <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">Understand how people feel.</h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-white/75">Analyze individual messages, process CSV datasets, inspect model quality, and visualize live sentiment signals from one place.</p>
                  <div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => switchTab("single")} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-indigo-700 hover:bg-slate-100">Analyze text <ArrowRight className="h-4 w-4" /></button><button type="button" onClick={() => switchTab("batch")} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/15">Upload CSV</button></div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur"><div className="flex items-center gap-3"><ShieldCheck className="h-6 w-6 text-cyan-300" /><span className="text-sm font-bold text-white/80">Current model status</span></div><div className="mt-6 grid grid-cols-2 gap-4"><div className="rounded-2xl bg-black/15 p-4"><p className="text-xs uppercase tracking-wider text-white/60">Accuracy</p><p className="mt-2 text-2xl font-black">{dashboardLoading ? "—" : `${Number(metrics?.accuracy ?? 0) * 100}%`}</p></div><div className="rounded-2xl bg-black/15 p-4"><p className="text-xs uppercase tracking-wider text-white/60">F1 Score</p><p className="mt-2 text-2xl font-black">{dashboardLoading ? "—" : `${Number(metrics?.f1_score ?? 0) * 100}%`}</p></div></div><p className="mt-5 text-xs leading-5 text-white/55">Metrics are loaded directly from the backend model evaluation endpoint.</p></div>
              </div>
            </div>

            <div className="flex items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-indigo-600"><Layers className="h-5 w-5" /><span className="text-xs font-black uppercase tracking-[0.2em]">Analytics</span></div><h2 className="mt-2 text-2xl font-black text-slate-900">Model Overview &amp; Insights</h2></div></div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-black text-slate-800">Trending Sentiment Keywords</h3><p className="mt-1 text-sm text-slate-500">The most frequent sentiment-bearing terms currently exposed by the API.</p></div><BarChart3 className="h-5 w-5 text-indigo-500" /></div><div className="mt-6 min-h-[280px] rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:p-8">{words.length ? <WordCloud words={words} /> : <div className="grid min-h-[230px] place-items-center text-sm font-semibold text-slate-400">No word-cloud data available.</div>}</div></div>
            <div><h3 className="mb-4 text-xl font-black text-slate-800">Model Evaluation Metrics</h3><MetricsDashboard metrics={metrics} /></div>
          </div>
        )}

        {activeTab === "single" && (
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="mb-6"><div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><MessageSquareText className="h-6 w-6" /></div><h2 className="text-2xl font-black">Single Text Analysis</h2><p className="mt-2 text-sm leading-6 text-slate-500">Classify one tweet, review, or message with the configured NLP pipeline.</p></div><form onSubmit={handleAnalyzeText} className="space-y-4"><textarea id="single-text" value={text} onChange={(event) => setText(event.target.value)} rows={9} maxLength={5000} placeholder="Example: I absolutely love the new features!" className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100" /><div className="flex justify-between text-xs text-slate-400"><span>Maximum 5,000 characters</span><span>{text.length}/5000</span></div><button type="submit" disabled={loading || !text.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-black text-white shadow-md hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageSquareText className="h-5 w-5" />}{loading ? "Analyzing..." : "Analyze sentiment"}</button></form></div><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">{!singleResult && !loading && <div className="grid min-h-[410px] place-items-center text-center"><div><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50"><FileText className="h-10 w-10 text-indigo-500" /></div><h3 className="mt-5 text-xl font-black text-slate-800">Your result will appear here</h3><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">You will receive sentiment, confidence, cleaned text, and the model used.</p></div></div>}{loading && <div className="grid min-h-[410px] place-items-center text-center"><Loader2 className="mx-auto h-12 w-12 animate-spin text-indigo-600" /><p className="mt-4 text-sm font-semibold text-slate-600">Running NLP sentiment analysis...</p></div>}{singleResult && !loading && <div><div className="flex items-center gap-3"><CheckCircle2 className="h-6 w-6 text-indigo-600" /><h3 className="text-xl font-black">Analysis Results</h3></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><div className={cn("rounded-2xl border p-6 text-center", sentimentClasses(singleResult.sentiment))}><p className="text-xs font-bold uppercase tracking-wider">Sentiment</p><p className="mt-2 text-3xl font-black capitalize">{singleResult.sentiment}</p></div><div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6 text-center text-indigo-700"><p className="text-xs font-bold uppercase tracking-wider">Confidence</p><p className="mt-2 text-3xl font-black">{(singleResult.confidence * 100).toFixed(1)}%</p></div></div><div className="mt-6 space-y-4"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Cleaned text</p><p className="mt-2 break-words text-sm leading-6 text-slate-700">{singleResult.cleaned_text}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Model method</p><p className="mt-2 text-sm font-semibold text-slate-700">{singleResult.method}</p></div></div></div>}</div></div>
        )}

        {activeTab === "batch" && (
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="mb-6"><div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><Upload className="h-6 w-6" /></div><h2 className="text-2xl font-black">Batch CSV Analysis</h2><p className="mt-2 text-sm leading-6 text-slate-500">Upload a CSV containing a text, tweet, content, or message column.</p></div><label htmlFor="csv-upload" className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center transition hover:border-indigo-400 hover:bg-indigo-50"><Upload className="h-10 w-10 text-slate-400" /><span className="mt-4 text-sm font-black text-slate-700">Choose a CSV file</span><span className="mt-1 text-xs text-slate-400">Maximum 1,000 rows by default</span><input id="csv-upload" type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFileUpload} disabled={loading} /></label></div><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">{!batchResult && !loading && <div className="grid min-h-[360px] place-items-center text-center"><div><BarChart3 className="mx-auto h-12 w-12 text-slate-300" /><h3 className="mt-4 text-xl font-black text-slate-800">Batch results appear here</h3><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Upload your dataset to see sentiment counts, percentages, and row-level predictions.</p></div></div>}{loading && <div className="grid min-h-[360px] place-items-center text-center"><Loader2 className="mx-auto h-12 w-12 animate-spin text-indigo-600" /><p className="mt-4 text-sm font-semibold text-slate-600">Processing your CSV...</p></div>}{batchResult && !loading && <div><h3 className="text-xl font-black">Batch Summary</h3><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{([['positive','Positive'],['negative','Negative'],['neutral','Neutral'],['total','Total']] as const).map(([key,label]) => <div key={key} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-slate-800">{batchResult.summary[key]}</p></div>)}</div><div className="mt-6 overflow-hidden rounded-2xl border border-slate-200"><div className="max-h-[420px] overflow-auto"><table className="min-w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-4 py-3 font-bold">Text</th><th className="px-4 py-3 font-bold">Sentiment</th><th className="px-4 py-3 font-bold">Confidence</th></tr></thead><tbody className="divide-y divide-slate-100">{batchResult.results.map((item,index) => <tr key={`${item.cleaned_text}-${index}`}><td className="max-w-md px-4 py-3 text-slate-700">{item.cleaned_text}</td><td className="px-4 py-3"><span className={cn("rounded-full border px-2.5 py-1 text-xs font-bold capitalize", sentimentClasses(item.sentiment))}>{item.sentiment}</span></td><td className="px-4 py-3 font-semibold text-slate-600">{(item.confidence*100).toFixed(1)}%</td></tr>)}</tbody></table></div></div></div>}</div></div>
        )}

        {activeTab === "stream" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-indigo-600" /><h2 className="text-2xl font-black">Live Sentiment Stream</h2></div><p className="mt-2 text-sm leading-6 text-slate-500">Receive simulated server-sent events from the backend in real time.</p></div><button type="button" onClick={toggleStream} className={cn("inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white", isStreaming ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700")}>{isStreaming ? "Stop stream" : "Start stream"}</button></div><div className="mt-6 overflow-hidden rounded-2xl border border-slate-200"><div className="max-h-[520px] overflow-auto">{streamData.length === 0 ? <div className="grid min-h-[320px] place-items-center text-center"><div><Activity className="mx-auto h-12 w-12 text-slate-300" /><p className="mt-4 text-sm font-semibold text-slate-500">{isStreaming ? "Waiting for the first event..." : "Start the stream to see live predictions."}</p></div></div> : <div className="divide-y divide-slate-100">{streamData.map((item,index)=><div key={`${item.cleaned_text}-${index}`} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-700">{item.cleaned_text}</p><p className="mt-1 text-xs text-slate-400">{item.method}</p></div><div className="flex items-center gap-3"><span className={cn("rounded-full border px-2.5 py-1 text-xs font-bold capitalize", sentimentClasses(item.sentiment))}>{item.sentiment}</span><span className="text-xs font-bold text-slate-500">{(item.confidence*100).toFixed(1)}%</span></div></div>)}</div>}</div></div></div>
        )}
      </section>
    </main>
  );
}
