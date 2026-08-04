// lib/api.ts
// Thin client around the FastAPI backend. Centralizing fetch calls here
// means the components stay focused on rendering, not networking.

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface GeneralInfo {
  fileName: string | null;
  fileType: string | null;
  mimeType: string | null;
  fileSize: string | number | null;
  dimensions: string | null;
  createDate: string | null;
  modifyDate: string | null;
  colorSpace: string | null;
  software: string | null;
}

export interface CameraInfo {
  make: string | null;
  model: string | null;
  lensModel: string | null;
  focalLength: string | null;
  aperture: string | null;
  shutterSpeed: string | null;
  iso: string | number | null;
  flash: string | null;
  whiteBalance: string | null;
  orientation: string | null;
}

export interface GpsInfo {
  hasGps: boolean;
  latitude: number | null;
  longitude: number | null;
  altitude: string | number | null;
  timestamp: string | null;
}

export interface AiFinding {
  label: string;
  category: "edited" | "ai-generated";
  matchedTag: string;
  evidence: string;
}

export interface AiDetection {
  verdict: "flagged" | "no-traces-found";
  findings: AiFinding[];
  isLikelyEdited: boolean;
  isLikelyAiGenerated: boolean;
  metadataLooksStripped: boolean;
  disclaimer: string;
}

export interface ExtractedMetadata {
  general: GeneralInfo;
  camera: CameraInfo;
  gps: GpsInfo;
  iptcXmp: Record<string, unknown>;
  raw: Record<string, unknown>;
  aiDetection: AiDetection;
  originalFileName: string;
}

export async function extractMetadata(file: File): Promise<ExtractedMetadata> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/extract`, { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to extract metadata");
  }
  return res.json();
}

export async function stripMetadata(file: File): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/strip`, { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to strip metadata");
  }
  return res.blob();
}

export async function exportPdf(metadata: ExtractedMetadata, fileName: string): Promise<Blob> {
  const res = await fetch(`${API_URL}/api/export-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metadata, fileName }),
  });
  if (!res.ok) throw new Error("Failed to generate PDF report");
  return res.blob();
}

export async function exportCsv(metadata: ExtractedMetadata): Promise<Blob> {
  const res = await fetch(`${API_URL}/api/export-csv`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metadata }),
  });
  if (!res.ok) throw new Error("Failed to generate CSV export");
  return res.blob();
}

/** Triggers a browser download for a Blob without a page navigation. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
