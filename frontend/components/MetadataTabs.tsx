"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Info, Camera, MapPin, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react";
import clsx from "clsx";
import { ExtractedMetadata } from "@/lib/api";

// Leaflet touches `window` at import time, so the map must be client-only
// and excluded from server-side rendering entirely.
const MapView = dynamic(() => import("./MapView"), { ssr: false });

type TabKey = "general" | "camera" | "location" | "privacy";

const TABS: { key: TabKey; label: string; icon: typeof Info }[] = [
  { key: "general", label: "General", icon: Info },
  { key: "camera", label: "Camera Settings", icon: Camera },
  { key: "location", label: "Location / Map", icon: MapPin },
  { key: "privacy", label: "Privacy / AI Detection", icon: ShieldAlert },
];

function Row({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-base-700/60 py-2.5 text-sm">
      <span className="text-ink-low">{label}</span>
      <span className="font-mono text-ink-hi text-right break-all">
        {value === null || value === undefined || value === "" ? "—" : String(value)}
      </span>
    </div>
  );
}

export default function MetadataTabs({ data }: { data: ExtractedMetadata }) {
  const [active, setActive] = useState<TabKey>("general");
  const { general, camera, gps, aiDetection } = data;

  return (
    <div className="rounded-2xl border border-base-700 bg-base-900">
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-base-700 scrollbar-thin">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={clsx(
              "flex items-center gap-2 whitespace-nowrap px-5 py-3.5 text-sm font-medium transition-colors border-b-2",
              active === key
                ? "border-signal text-signal"
                : "border-transparent text-ink-mid hover:text-ink-hi"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-6">
        {active === "general" && (
          <div>
            <Row label="File Name" value={general.fileName} />
            <Row label="File Type" value={general.fileType} />
            <Row label="MIME Type" value={general.mimeType} />
            <Row label="Dimensions" value={general.dimensions} />
            <Row label="File Size" value={general.fileSize} />
            <Row label="Created" value={general.createDate} />
            <Row label="Modified" value={general.modifyDate} />
            <Row label="Color Space" value={general.colorSpace} />
            <Row label="Software Tag" value={general.software} />
          </div>
        )}

        {active === "camera" && (
          <div>
            <Row label="Make" value={camera.make} />
            <Row label="Model" value={camera.model} />
            <Row label="Lens" value={camera.lensModel} />
            <Row label="Focal Length" value={camera.focalLength} />
            <Row label="Aperture" value={camera.aperture} />
            <Row label="Shutter Speed" value={camera.shutterSpeed} />
            <Row label="ISO" value={camera.iso} />
            <Row label="Flash" value={camera.flash} />
            <Row label="White Balance" value={camera.whiteBalance} />
            <Row label="Orientation" value={camera.orientation} />
          </div>
        )}

        {active === "location" && (
          <div className="space-y-4">
            <MapView gps={gps} />
            <Row label="Latitude" value={gps.latitude} />
            <Row label="Longitude" value={gps.longitude} />
            <Row label="Altitude" value={gps.altitude} />
            <Row label="GPS Timestamp" value={gps.timestamp} />
          </div>
        )}

        {active === "privacy" && (
          <div className="space-y-5">
            <div
              className={clsx(
                "flex items-start gap-3 rounded-xl border p-4",
                aiDetection.findings.length > 0
                  ? "border-alert/40 bg-alert/5"
                  : "border-signal/30 bg-signal/5"
              )}
            >
              {aiDetection.findings.length > 0 ? (
                <AlertTriangle className="h-5 w-5 shrink-0 text-alert" />
              ) : (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-signal" />
              )}
              <div>
                <p className="font-display text-ink-hi">
                  {aiDetection.findings.length > 0
                    ? "Editing / AI-generation traces found"
                    : "No editing or AI traces found in metadata"}
                </p>
                <p className="mt-1 text-sm text-ink-mid">{aiDetection.disclaimer}</p>
              </div>
            </div>

            {aiDetection.findings.length > 0 && (
              <div className="divide-y divide-base-700/60 rounded-xl border border-base-700">
                {aiDetection.findings.map((f, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div>
                      <p className="text-ink-hi font-medium">{f.label}</p>
                      <p className="text-ink-low font-mono text-xs">tag: {f.matchedTag}</p>
                    </div>
                    <span
                      className={clsx(
                        "rounded-full px-2.5 py-1 text-xs font-mono",
                        f.category === "ai-generated"
                          ? "bg-alert/15 text-alert"
                          : "bg-signal/15 text-signal"
                      )}
                    >
                      {f.category}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {aiDetection.metadataLooksStripped && (
              <p className="text-xs text-ink-low font-mono">
                Note: this file carries unusually little metadata — it may already have been scrubbed.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
