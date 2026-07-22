/** Client for the tactical data-analysis endpoints. */

export interface ColumnInfo {
  name: string;
  dtype: string;
  missing: number;
  unique: number;
  stats?: { min: number; max: number; mean: number; std: number };
}

export interface ChartData {
  type: "histogram" | "bar";
  column: string;
  labels: string[];
  values: number[];
}

export interface DatasetProfile {
  dataset_id: string;
  filename: string;
  rows: number;
  cols: number;
  missing_total: number;
  columns: ColumnInfo[];
  charts: ChartData[];
  correlations: { a: string; b: string; r: number }[];
  sample: Record<string, string>[];
}

import { BACKEND_URL, toBase64 } from "./api";

export async function uploadDataset(file: File): Promise<DatasetProfile> {
  const data_b64 = await toBase64(file);
  const res = await fetch(`${BACKEND_URL}/api/op/brief`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, data_b64 }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.detail ?? `Upload failed (${res.status})`);
  }
  return res.json();
}

/** Stream an answer about the dataset; onToken receives incremental text. */
export async function askDataset(
  datasetId: string,
  question: string,
  onToken: (text: string) => void,
): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/op/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataset_id: datasetId, question }),
  });
  if (!res.ok || !res.body) throw new Error(`Analysis request failed (${res.status})`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith("data: ")) continue;
      const evt = JSON.parse(line.slice(6)) as { type: string; content?: string };
      if ((evt.type === "token" || evt.type === "error") && evt.content) onToken(evt.content);
    }
  }
}
