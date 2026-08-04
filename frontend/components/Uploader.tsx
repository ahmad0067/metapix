"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, ScanLine, ImageIcon } from "lucide-react";
import clsx from "clsx";

interface UploaderProps {
  onFileAccepted: (file: File) => void;
  isProcessing: boolean;
}

const ACCEPTED_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/tiff": [".tiff", ".tif"],
  "image/heic": [".heic"],
  "image/heif": [".heif"],
};

export default function Uploader({ onFileAccepted, isProcessing }: UploaderProps) {
  const [rejectedMsg, setRejectedMsg] = useState<string | null>(null);

  const onDrop = useCallback(
    (accepted: File[], rejected: any[]) => {
      setRejectedMsg(null);
      if (rejected.length > 0) {
        setRejectedMsg("Unsupported file. Please upload JPG, PNG, WEBP, TIFF or HEIC.");
        return;
      }
      if (accepted[0]) onFileAccepted(accepted[0]);
    },
    [onFileAccepted]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: false,
    maxSize: 25 * 1024 * 1024,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={clsx(
          "relative overflow-hidden rounded-2xl border-2 border-dashed p-12 text-center transition-all cursor-pointer",
          "bg-base-900 bg-grid-pattern bg-grid",
          isDragActive ? "border-signal bg-base-800" : "border-base-700 hover:border-signal/60",
          isProcessing && "pointer-events-none opacity-60"
        )}
      >
        <input {...getInputProps()} />

        {isProcessing && (
          <div className="absolute inset-x-0 top-0 h-1 bg-signal/20 overflow-hidden">
            <div className="h-full w-1/3 bg-signal animate-scan" />
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          <div
            className={clsx(
              "flex h-16 w-16 items-center justify-center rounded-xl border",
              isDragActive ? "border-signal text-signal" : "border-base-600 text-ink-mid"
            )}
          >
            {isProcessing ? <ScanLine className="h-7 w-7" /> : <UploadCloud className="h-7 w-7" />}
          </div>

          <div>
            <p className="font-display text-lg text-ink-hi">
              {isProcessing ? "Reading metadata…" : "Drop an image here, or click to browse"}
            </p>
            <p className="mt-1 text-sm text-ink-low font-mono">
              JPG · PNG · WEBP · TIFF · HEIC — up to 25MB
            </p>
          </div>
        </div>
      </div>

      {rejectedMsg && (
        <p className="mt-3 flex items-center gap-2 text-sm text-alert">
          <ImageIcon className="h-4 w-4" /> {rejectedMsg}
        </p>
      )}
    </div>
  );
}
