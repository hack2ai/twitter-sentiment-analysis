const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface SentimentResult {
  sentiment: "positive" | "negative" | "neutral";
  confidence: number;
  method: string;
  cleaned_text: string;
  original_text?: string;
}

export interface BatchSentimentResult {
  results: SentimentResult[];
  summary: {
    positive: number;
    negative: number;
    neutral: number;
    total: number;
  };
  metadata: {
    file_name: string;
    text_column: string;
    rows_received: number;
    rows_analyzed: number;
    rows_skipped: number;
    percentages: Record<string, number>;
  };
}

async function getError(response: Response) {
  try {
    const payload = await response.json();
    return payload.detail || payload.message || "Request failed";
  } catch {
    return "Request failed";
  }
}

export async function analyzeText(text: string): Promise<SentimentResult> {
  const response = await fetch(`${API_URL}/analyze/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) throw new Error(await getError(response));
  return response.json();
}

export async function analyzeBatch(file: File): Promise<BatchSentimentResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/analyze/batch`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) throw new Error(await getError(response));
  return response.json();
}

export async function fetchMetrics() {
  const response = await fetch(`${API_URL}/metrics`, { cache: "no-store" });
  if (!response.ok) throw new Error(await getError(response));
  return response.json();
}

export function getStreamUrl() {
  return `${API_URL}/analyze/stream`;
}
