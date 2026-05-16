const API_URL = "http://localhost:8000";

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
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
}

export async function analyzeText(text: string): Promise<SentimentResult> {
  const response = await fetch(`${API_URL}/analyze/text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error('Failed to analyze text');
  }

  return response.json();
}

export async function analyzeBatch(file: File): Promise<BatchSentimentResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/analyze/batch`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to analyze batch file');
  }

  return response.json();
}

export async function fetchMetrics() {
  const res = await fetch(`${API_URL}/metrics`);
  if (!res.ok) throw new Error('Failed to fetch metrics');
  return res.json();
}

export async function fetchWordCloud() {
  const res = await fetch(`${API_URL}/wordcloud`);
  if (!res.ok) throw new Error('Failed to fetch word cloud data');
  return res.json();
}
