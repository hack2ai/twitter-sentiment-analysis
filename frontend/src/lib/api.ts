const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface SentimentResult {
  sentiment: "positive" | "negative" | "neutral";
  confidence: number;
  method: string;
  cleaned_text: string;
  original_text?: string;
  text?: string;
}

export interface BatchSentimentResult {
  results: SentimentResult[];
  summary: { positive: number; negative: number; neutral: number; total: number };
  metadata: { file_name: string; text_column: string; rows_received: number; rows_analyzed: number; rows_skipped: number; percentages: Record<string, number> };
}

export interface WordCloudItem {
  text: string;
  value: number;
}

export interface Metrics extends Record<string, unknown> {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  confusion_matrix: number[][];
  classes: string[];
}

export interface AuthUser { id: number; name: string; email: string; created_at?: string }
export interface AuthResponse { user: AuthUser; access_token: string; token_type: string }
export interface AnalysisHistoryItem extends SentimentResult { id: number; text: string; created_at: string }
export interface DashboardStats { total_analyses: number; positive: number; negative: number; neutral: number; average_confidence: number }

async function getError(response: Response) {
  try { const payload = await response.json(); return payload.detail || payload.message || "Request failed"; }
  catch { return "Request failed"; }
}

function authHeaders(token: string) { return { Authorization: `Bearer ${token}` }; }

export async function register(name: string, email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
  if (!response.ok) throw new Error(await getError(response));
  return response.json();
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  if (!response.ok) throw new Error(await getError(response));
  return response.json();
}

export async function getCurrentUser(token: string): Promise<AuthUser> {
  const response = await fetch(`${API_URL}/auth/me`, { headers: authHeaders(token), cache: "no-store" });
  if (!response.ok) throw new Error(await getError(response));
  return response.json();
}

export async function analyzeText(text: string): Promise<SentimentResult> {
  const response = await fetch(`${API_URL}/analyze/text`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
  if (!response.ok) throw new Error(await getError(response));
  return response.json();
}

export async function analyzeAndSaveText(text: string, token: string): Promise<SentimentResult> {
  const response = await fetch(`${API_URL}/analyses/text`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders(token) }, body: JSON.stringify({ text }) });
  if (!response.ok) throw new Error(await getError(response));
  return response.json();
}

export async function getDashboardStats(token: string): Promise<DashboardStats> {
  const response = await fetch(`${API_URL}/analyses/dashboard`, { headers: authHeaders(token), cache: "no-store" });
  if (!response.ok) throw new Error(await getError(response));
  return response.json();
}

export async function getAnalysisHistory(token: string): Promise<{ items: AnalysisHistoryItem[]; count: number }> {
  const response = await fetch(`${API_URL}/analyses/history`, { headers: authHeaders(token), cache: "no-store" });
  if (!response.ok) throw new Error(await getError(response));
  return response.json();
}

export async function deleteAnalysis(id: number, token: string): Promise<void> {
  const response = await fetch(`${API_URL}/analyses/${id}`, { method: "DELETE", headers: authHeaders(token) });
  if (!response.ok) throw new Error(await getError(response));
}

export async function analyzeBatch(file: File): Promise<BatchSentimentResult> {
  const formData = new FormData(); formData.append("file", file);
  const response = await fetch(`${API_URL}/analyze/batch`, { method: "POST", body: formData });
  if (!response.ok) throw new Error(await getError(response));
  return response.json();
}

export async function fetchMetrics(): Promise<Metrics> {
  const response = await fetch(`${API_URL}/metrics`, { cache: "no-store" });
  if (!response.ok) throw new Error(await getError(response));
  return response.json();
}

export async function fetchWordCloud(): Promise<WordCloudItem[]> {
  const response = await fetch(`${API_URL}/wordcloud`, { cache: "no-store" });
  if (!response.ok) throw new Error(await getError(response));
  const payload = await response.json();
  return Array.isArray(payload) ? payload : payload.words ?? [];
}

export function getStreamUrl() { return `${API_URL}/analyze/stream`; }