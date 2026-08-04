"""
main.py — MetaPix backend
==========================
FastAPI service exposing three endpoints:

  POST /api/extract      -> full metadata extraction + AI/edit detection
  POST /api/strip        -> returns a metadata-scrubbed copy of the image
  POST /api/export-pdf   -> turns a metadata JSON payload into a PDF report

Run locally with:
  uvicorn main:app --reload --port 8000

Requires the `exiftool` binary on PATH (see README.md for install steps).
"""

import csv
import io
import shutil
import subprocess
import tempfile
import uuid
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from PIL import Image
import pillow_heif  # registers HEIC/HEIF opener with Pillow

from utils.metadata_extractor import (
    extract_raw_metadata,
    structure_metadata,
    ExifToolNotFoundError,
)
from utils.ai_detector import detect_ai_and_editing
from utils.pdf_generator import generate_metadata_pdf

pillow_heif.register_heif_opener()

app = FastAPI(
    title="MetaPix API",
    description="AI-powered image metadata viewer, analyzer, and cleaner.",
    version="1.0.0",
)

# CORS: allow the Next.js dev server / your deployed frontend to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your actual frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".tiff", ".tif", ".heic", ".heif"}
MAX_FILE_SIZE_MB = 25
UPLOAD_DIR = Path(tempfile.gettempdir()) / "metapix_uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


def _validate_and_save(upload: UploadFile) -> Path:
    """Validate extension/size and persist the upload to a temp file."""
    suffix = Path(upload.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    dest = UPLOAD_DIR / f"{uuid.uuid4().hex}{suffix}"
    with dest.open("wb") as f:
        shutil.copyfileobj(upload.file, f)

    size_mb = dest.stat().st_size / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"File exceeds {MAX_FILE_SIZE_MB}MB limit.")

    return dest


@app.get("/")
def health_check():
    return {"status": "ok", "service": "MetaPix API"}


@app.post("/api/extract")
async def extract_metadata(file: UploadFile = File(...)):
    """
    Accepts an image, runs ExifTool, structures the output into
    general / camera / gps / iptcXmp buckets, and runs the AI/edit
    fingerprint detector over the raw tags.
    """
    saved_path = _validate_and_save(file)
    try:
        raw = extract_raw_metadata(str(saved_path))
        structured = structure_metadata(raw)
        structured["aiDetection"] = detect_ai_and_editing(raw)
        structured["originalFileName"] = file.filename
        return JSONResponse(content=structured)
    except ExifToolNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {e}")
    finally:
        saved_path.unlink(missing_ok=True)


@app.post("/api/strip")
async def strip_metadata(file: UploadFile = File(...)):
    """
    'Privacy Shield' — returns a copy of the image with ALL metadata
    (EXIF/IPTC/XMP/GPS/thumbnails) removed. Two strategies are combined:

      1. exiftool -all= (authoritative, strips every known + unknown tag)
      2. Pillow re-save without exif data (safety net for formats exiftool
         can't rewrite in place, e.g. some WEBP variants)
    """
    saved_path = _validate_and_save(file)
    cleaned_path = saved_path.with_name(f"clean_{saved_path.name}")

    try:
        shutil.copyfile(saved_path, cleaned_path)

        if shutil.which("exiftool") is None:
            raise HTTPException(
                status_code=500,
                detail="'exiftool' binary not found on server. Install it to enable stripping.",
            )

        result = subprocess.run(
            ["exiftool", "-all=", "-overwrite_original", str(cleaned_path)],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"Strip failed: {result.stderr.strip()}")

        # Safety-net re-save via Pillow to strip any residual container-level
        # metadata (e.g. some PNG text chunks / WEBP EXIF that exiftool skips)
        try:
            img = Image.open(cleaned_path)
            img_format = img.format
            data = list(img.getdata())
            clean_img = Image.new(img.mode, img.size)
            clean_img.putdata(data)
            clean_img.save(cleaned_path, format=img_format)
        except Exception:
            pass  # exiftool pass already succeeded; Pillow step is best-effort

        with cleaned_path.open("rb") as f:
            content = f.read()

        return StreamingResponse(
            io.BytesIO(content),
            media_type=file.content_type or "application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="clean_{file.filename}"'},
        )
    finally:
        saved_path.unlink(missing_ok=True)
        cleaned_path.unlink(missing_ok=True)


@app.post("/api/export-pdf")
async def export_pdf(payload: dict = Body(...)):
    """
    Accepts the JSON metadata object (as returned by /api/extract) and
    returns a formatted PDF report.
    Expected body: { "metadata": {...}, "fileName": "photo.jpg" }
    """
    metadata = payload.get("metadata")
    file_name = payload.get("fileName", "image")

    if not metadata:
        raise HTTPException(status_code=400, detail="Missing 'metadata' in request body.")

    try:
        pdf_bytes = generate_metadata_pdf(metadata, file_name)
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="metapix_report_{file_name}.pdf"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")


@app.post("/api/export-csv")
async def export_csv(payload: dict = Body(...)):
    """
    Bonus helper endpoint: flattens the raw metadata dict into CSV.
    (Frontend export buttons for JSON/CSV/PDF all hit this + /export-pdf;
    JSON export is handled client-side since the data is already JSON.)
    """
    metadata = payload.get("metadata", {})
    raw = metadata.get("raw", metadata)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Tag", "Value"])
    for k, v in raw.items():
        writer.writerow([k, v])

    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="metapix_metadata.csv"'},
    )
