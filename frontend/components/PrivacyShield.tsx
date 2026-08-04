"use client";

import { useState } from "react";
import { ShieldCheck, FileJson, FileText, FileDown, Loader2 } from "lucide-react";
import { ExtractedMetadata, stripMetadata, exportPdf, exportCsv, downloadBlob } from "@/lib/api";

interface Props {
  file: File;
  metadata: ExtractedMetadata;
}

export default function PrivacyShield({ file, metadata }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [stripped, setStripped] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStrip() {
    setBusy("strip");
    setError(null);
    try {
      const blob = await stripMetadata(file);
      downloadBlob(blob, `clean_${file.name}`);
      setStripped(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  function handleJson() {
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" });
    downloadBlob(blob, `metapix_${file.name}.json`);
  }

  async function handleCsv() {
    setBusy("csv");
    setError(null);
    try {
      const blob = await exportCsv(metadata);
      downloadBlob(blob, `metapix_${file.name}.csv`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function handlePdf() {
    setBusy("pdf");
    setError(null);
    try {
      const blob = await exportPdf(metadata, file.name);
      downloadBlob(blob, `metapix_report_${file.name}.pdf`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border border-base-700 bg-base-900 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-alert/40 text-alert">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="font-display text-ink-hi">Privacy Shield</p>
          <p className="text-sm text-ink-mid">
            Strip every EXIF/IPTC/XMP/GPS tag and download a clean copy — original is never modified.
          </p>
        </div>
      </div>

      <button
        onClick={handleStrip}
        disabled={busy !== null}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-alert py-3 font-medium text-base-950 transition hover:brightness-110 disabled:opacity-50"
      >
        {busy === "strip" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        {stripped ? "Download again (clean copy)" : "Strip metadata & download clean image"}
      </button>

      <div className="mt-6 border-t border-base-700 pt-5">
        <p className="mb-3 text-xs font-mono uppercase tracking-wide text-ink-low">Export report</p>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleJson}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-base-700 py-3 text-xs text-ink-mid hover:border-signal hover:text-signal transition"
          >
            <FileJson className="h-4 w-4" /> JSON
          </button>
          <button
            onClick={handleCsv}
            disabled={busy !== null}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-base-700 py-3 text-xs text-ink-mid hover:border-signal hover:text-signal transition disabled:opacity-50"
          >
            {busy === "csv" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} CSV
          </button>
          <button
            onClick={handlePdf}
            disabled={busy !== null}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-base-700 py-3 text-xs text-ink-mid hover:border-signal hover:text-signal transition disabled:opacity-50"
          >
            {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} PDF
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-alert">{error}</p>}
    </div>
  );
}
