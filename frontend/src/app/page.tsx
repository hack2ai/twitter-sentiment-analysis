"use client";

import React, { useState, useEffect, useRef } from 'react';
import { analyzeText, analyzeBatch, fetchMetrics, fetchWordCloud, SentimentResult, BatchSentimentResult } from '@/lib/api';
import { SentimentPieChart, ConfidenceChart } from '@/components/SentimentChart';
import { MetricsDashboard } from '@/components/MetricsDashboard';
import dynamic from 'next/dynamic';
const WordCloud = dynamic(() => import('@/components/WordCloud').then(mod => mod.WordCloud), { ssr: false });
import { MessageCircle, Upload, Loader2, AlertCircle, FileText, BarChart3, MessageSquareText, Activity, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Home() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [singleResult, setSingleResult] = useState<SentimentResult | null>(null);
  const [batchResult, setBatchResult] = useState<BatchSentimentResult | null>(null);
  
  // Real-time Stream State
  const [streamData, setStreamData] = useState<SentimentResult[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Global Dashboard State
  const [metrics, setMetrics] = useState<any>(null);
  const [words, setWords] = useState<any[]>([]);

  type TabType = 'single' | 'batch' | 'stream' | 'dashboard';
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  useEffect(() => {
    // Fetch global dashboard data on load
    fetchMetrics().then(setMetrics).catch(console.error);
    fetchWordCloud().then(setWords).catch(console.error);
  }, []);

  const handleAnalyzeText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    setLoading(true);
    setError("");
    try {
      const res = await analyzeText(text);
      setSingleResult(res);
      setBatchResult(null);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    setError("");
    try {
      const res = await analyzeBatch(file);
      setBatchResult(res);
      setSingleResult(null);
    } catch (err: any) {
      setError(err.message || "An error occurred during file upload");
    } finally {
      setLoading(false);
    }
  };

  const toggleStream = () => {
    if (isStreaming) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      setIsStreaming(false);
    } else {
      setIsStreaming(true);
      const source = new EventSource("http://localhost:8000/analyze/stream");
      eventSourceRef.current = source;
      
      source.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setStreamData(prev => [data, ...prev].slice(0, 50)); // Keep last 50
      };
      
      source.onerror = () => {
        source.close();
        setIsStreaming(false);
      };
    }
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const sentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-emerald-500 bg-emerald-50 border-emerald-200';
      case 'negative': return 'text-red-500 bg-red-50 border-red-200';
      default: return 'text-slate-500 bg-slate-50 border-slate-200';
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm backdrop-blur-md bg-white/80">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-md">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              Twitter Sentiment AI
            </h1>
          </div>
          
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            {(['dashboard', 'single', 'batch', 'stream'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-all duration-200",
                  activeTab === tab 
                    ? "bg-white text-indigo-700 shadow-sm" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                )}
              >
                {tab === 'dashboard' ? 'Overview' : tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-3 mb-6">
              <Layers className="w-6 h-6 text-indigo-500" />
              <h2 className="text-2xl font-bold text-slate-800">Model Overview & Insights</h2>
            </div>
            
            {/* Word Cloud */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Trending Sentiment Keywords</h3>
              <WordCloud words={words} />
            </div>

            {/* Metrics */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4">Model Evaluation Metrics</h3>
              <MetricsDashboard metrics={metrics} />
            </div>
          </div>
        )}

        {/* SINGLE & BATCH TABS */}
        {(activeTab === 'single' || activeTab === 'batch') && (
          <div className="grid lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                {activeTab === 'single' ? (
                  <form onSubmit={handleAnalyzeText} className="space-y-4">
                    <div>
                      <label htmlFor="tweet" className="block text-sm font-medium text-slate-700 mb-2">
                        Enter Tweet Text
                      </label>
                      <textarea
                        id="tweet"
                        rows={5}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="E.g., I absolutely love the new features! 🚀"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all resize-none shadow-inner"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading || !text.trim()}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquareText className="w-5 h-5" />}
                      Analyze Sentiment
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors">
                      <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-700 mb-1">Click to upload or drag and drop</p>
                      <p className="text-xs text-slate-500 mb-4">CSV files only. Must contain a 'text' column.</p>
                      
                      <input
                        type="file"
                        id="csv-upload"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <label 
                        htmlFor="csv-upload"
                        className="cursor-pointer bg-white border border-slate-200 text-slate-700 font-medium py-2 px-4 rounded-lg hover:bg-slate-50 transition-colors shadow-sm inline-flex items-center gap-2 text-sm"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Select File"}
                      </label>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 border border-red-100">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              {!singleResult && !batchResult && !loading && (
                <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
                  <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                    <BarChart3 className="w-10 h-10 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Awaiting Data</h3>
                  <p className="text-slate-500 max-w-sm">
                    Enter a tweet or upload a dataset to generate sentiment analysis insights.
                  </p>
                </div>
              )}

              {loading && (
                 <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                    <p className="text-slate-600 font-medium animate-pulse">Analyzing text through NLP models...</p>
                 </div>
              )}

              {singleResult && !loading && activeTab === 'single' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" />
                    Analysis Results
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className={cn("p-6 rounded-xl border text-center", sentimentColor(singleResult.sentiment))}>
                      <p className="text-xs uppercase tracking-wider font-bold mb-1 opacity-80">Sentiment</p>
                      <p className="text-3xl font-black capitalize">{singleResult.sentiment}</p>
                    </div>
                    <div className="p-6 rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-700 text-center">
                      <p className="text-xs uppercase tracking-wider font-bold mb-1 opacity-80">Confidence</p>
                      <p className="text-3xl font-black">{(singleResult.confidence * 100).toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-1">Preprocessed Text (SpaCy/NLTK)</p>
                      <div className="bg-slate-50 p-4 rounded-xl text-slate-700 text-sm font-mono border border-slate-100">
                        {singleResult.cleaned_text || "No actionable text left after cleaning."}
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-400 pt-4 border-t border-slate-100">
                      <span>Model: <span className="font-medium text-slate-600">{singleResult.method === 'custom_ml' ? 'Scikit-Learn Custom' : 'VADER Fallback'}</span></span>
                    </div>
                  </div>
                </div>
              )}

              {batchResult && !loading && activeTab === 'batch' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 text-center">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total</p>
                      <p className="text-2xl font-black text-slate-800">{batchResult.summary.total}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-200 text-center">
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Positive</p>
                      <p className="text-2xl font-black text-emerald-700">{batchResult.summary.positive}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 text-center">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Neutral</p>
                      <p className="text-2xl font-black text-slate-700">{batchResult.summary.neutral}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-red-200 text-center">
                      <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Negative</p>
                      <p className="text-2xl font-black text-red-700">{batchResult.summary.negative}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      <h4 className="text-sm font-bold text-slate-700 mb-4">Sentiment Distribution</h4>
                      <SentimentPieChart summary={batchResult.summary} />
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      <h4 className="text-sm font-bold text-slate-700 mb-4">Confidence Distribution</h4>
                      <ConfidenceChart results={batchResult.results} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STREAMING TAB */}
        {activeTab === 'stream' && (
          <div className="animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <Activity className={cn("w-6 h-6", isStreaming ? "text-red-500 animate-pulse" : "text-slate-400")} />
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Real-Time Twitter Stream</h2>
                  <p className="text-sm text-slate-500">Simulating live tweets analyzing via NLP model</p>
                </div>
              </div>
              <button
                onClick={toggleStream}
                className={cn(
                  "px-6 py-2 rounded-xl font-bold transition-all shadow-md",
                  isStreaming 
                    ? "bg-red-100 text-red-700 hover:bg-red-200" 
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                )}
              >
                {isStreaming ? 'Stop Stream' : 'Start Stream'}
              </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {streamData.length === 0 ? (
                  <div className="text-center p-12 bg-white rounded-2xl border border-slate-200 border-dashed">
                    <p className="text-slate-500">No tweets yet. Start the stream to receive live data.</p>
                  </div>
                ) : (
                  streamData.map((item, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-start gap-4 animate-in slide-in-from-top-2">
                      <div className={cn("p-3 rounded-full mt-1", sentimentColor(item.sentiment))}>
                         <MessageSquareText className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-800 mb-2">{item.text || item.original_text}</p>
                        <div className="flex gap-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          <span className={sentimentColor(item.sentiment).split(' ')[0]}>{item.sentiment}</span>
                          <span>Conf: {(item.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-700 mb-4">Live Sentiment Ratio</h4>
                  <div className="space-y-4">
                    {['positive', 'neutral', 'negative'].map((sent) => {
                      const count = streamData.filter(d => d.sentiment === sent).length;
                      const percent = streamData.length ? (count / streamData.length) * 100 : 0;
                      const colors: Record<string, string> = {
                        positive: 'bg-emerald-500',
                        neutral: 'bg-slate-400',
                        negative: 'bg-red-500'
                      };
                      return (
                        <div key={sent}>
                          <div className="flex justify-between text-xs font-bold mb-1 capitalize text-slate-700">
                            <span>{sent}</span>
                            <span>{count}</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${colors[sent]}`} 
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
