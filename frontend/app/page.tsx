"use client";

import { useState } from "react";
import { ScanEye, Github, AlertCircle } from "lucide-react";
import Uploader from "@/components/Uploader";
import MetadataTabs from "@/components/MetadataTabs";
import PrivacyShield from "@/components/PrivacyShield";
import { ExtractedMetadata, extractMetadata } from "@/lib/api";

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ExtractedMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(selected: File) {
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setMetadata(null);
    setError(null);
    setLoading(true);
    try {
      const result = await extractMetadata(selected);
      setMetadata(result);
    } catch (e: any) {
      setError(e.message || "Something went wrong reading this file.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setPreviewUrl(null);
    setMetadata(null);
    setError(null);
  }

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-base-700">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal/15 text-signal">
              <ScanEye className="h-5 w-5" />
            </div>
            <span className="font-display text-lg text-ink-hi tracking-tight">MetaPix</span>
          </div>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm text-ink-mid hover:text-ink-hi transition"
          >
            <Github className="h-4 w-4" /> Source
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-14">
        {/* Hero */}
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h1 className="font-display text-4xl font-medium text-ink-hi sm:text-5xl">
            See what your photos say <span className="text-signal">about you.</span>
          </h1>
          <p className="mt-4 text-ink-mid">
            Upload an image to read its full EXIF / IPTC / XMP metadata, check where it was
            taken, spot AI or editing fingerprints, and strip it all before you share it.
          </p>
        </div>

        {/* Upload zone */}
        <div className="mx-auto max-w-2xl">
          <Uploader onFileAccepted={handleFile} isProcessing={loading} />
        </div>

        {error && (
          <div className="mx-auto mt-6 flex max-w-2xl items-start gap-2.5 rounded-xl border border-alert/40 bg-alert/5 p-4 text-sm text-alert">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Results */}
        {file && metadata && (
          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
            {/* Left: preview + reset */}
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-base-700 bg-base-900">
                {previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt={file.name} className="w-full object-cover" />
                )}
                <div className="p-4">
                  <p className="truncate text-sm font-medium text-ink-hi">{file.name}</p>
                  <p className="text-xs text-ink-low font-mono mt-0.5">
                    {(file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={reset}
                className="w-full rounded-xl border border-base-700 py-2.5 text-sm text-ink-mid hover:text-ink-hi hover:border-base-600 transition"
              >
                Analyze another image
              </button>
              <PrivacyShield file={file} metadata={metadata} />
            </div>

            {/* Right: tabbed metadata */}
            <MetadataTabs data={metadata} />
          </div>
        )}
      </div>
    </main>
  );
}
