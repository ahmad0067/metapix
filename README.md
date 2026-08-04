# MetaPix — AI-Powered Image Metadata Viewer, Analyzer & Cleaner

MetaPix lets you drag in a photo and instantly see everything hidden inside it:
EXIF/IPTC/XMP tags, camera settings, GPS location on a live map, and traces of
Photoshop or AI-generator fingerprints — then strip it all in one click.

```
metapix/
├── backend/                 # FastAPI service
│   ├── main.py               # API routes: extract / strip / export-pdf / export-csv
│   ├── requirements.txt
│   └── utils/
│       ├── metadata_extractor.py   # exiftool wrapper + structuring
│       ├── ai_detector.py          # AI/editing fingerprint heuristics
│       └── pdf_generator.py        # reportlab PDF report builder
└── frontend/                 # Next.js 14 App Router + Tailwind
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx           # main orchestrating page
    │   └── globals.css
    ├── components/
    │   ├── Uploader.tsx        # drag-and-drop zone
    │   ├── MetadataTabs.tsx    # General / Camera / Location / Privacy tabs
    │   ├── MapView.tsx         # Leaflet map for GPS coordinates
    │   └── PrivacyShield.tsx   # strip + JSON/CSV/PDF export buttons
    └── lib/
        └── api.ts              # typed fetch client for the backend
```

---

## 1. Backend setup (FastAPI + ExifTool)

MetaPix uses the real **ExifTool** binary (via subprocess) because it's the
only tool that reliably reads EXIF *and* IPTC *and* XMP *and* GPS across
JPG/PNG/WEBP/TIFF/HEIC in one pass. Install it first:

```bash
# macOS
brew install exiftool

# Ubuntu / Debian
sudo apt update && sudo apt install libimage-exiftool-perl

# Windows
# Download the .zip from https://exiftool.org, extract, rename
# "exiftool(-k).exe" to "exiftool.exe" and add its folder to PATH.
```

Then set up the Python environment:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

uvicorn main:app --reload --port 8000
```

The API is now live at `http://localhost:8000`. Interactive docs (Swagger UI)
are automatically available at `http://localhost:8000/docs`.

### Endpoints

| Method | Route              | Description                                      |
|--------|--------------------|---------------------------------------------------|
| POST   | `/api/extract`     | Upload image → full structured metadata JSON      |
| POST   | `/api/strip`       | Upload image → metadata-scrubbed image file        |
| POST   | `/api/export-pdf`  | Metadata JSON → formatted PDF report                |
| POST   | `/api/export-csv`  | Metadata JSON → flat CSV export                    |

---

## 2. Frontend setup (Next.js + Tailwind)

```bash
cd frontend
cp .env.local.example .env.local   # point NEXT_PUBLIC_API_URL at your backend
npm install
npm run dev
```

Open `http://localhost:3000`. Drop in a photo and MetaPix will call the
backend automatically.

---

## 3. Deploying

- **Frontend:** push to GitHub, import into Vercel, set the
  `NEXT_PUBLIC_API_URL` environment variable to your deployed backend URL.
- **Backend:** deploy anywhere that lets you install system packages
  (Railway, Render, Fly.io, a small VPS). ExifTool must be installable on the
  host — Vercel's serverless functions cannot run it, so the backend needs a
  proper container/VM, not a serverless platform.

`backend/Dockerfile` is already included in this repo. On Railway or Render:
1. Set **Root Directory** to `backend`
2. Set **Builder** to **Dockerfile** (the platform will find `backend/Dockerfile`
   automatically once Root Directory is set — no extra path needed)
3. Deploy — the platform gives you a live URL like `https://metapix-backend.up.railway.app`
4. Paste that URL into the frontend's `NEXT_PUBLIC_API_URL` environment variable on Vercel

---

## 4. Notes on the AI/Editing detector

`ai_detector.py` is **metadata-based**, not pixel-based: it scans EXIF/XMP/PNG
tags (Software, CreatorTool, PNG "Parameters" chunk used by Stable Diffusion
WebUI, etc.) for known fingerprints from Photoshop, Lightroom, Midjourney,
DALL·E, Stable Diffusion and Firefly. It's a fast, zero-cost first pass — it
will miss generators that already strip their own metadata, and that
limitation is surfaced to the user in the UI rather than hidden.

## 5. Privacy Shield internals

Stripping runs `exiftool -all= -overwrite_original` (the authoritative pass)
and then a Pillow re-save as a safety net for stray container-level chunks
some tools leave behind. The original upload is never touched — a fresh
temp copy is stripped and streamed back to the browser, then deleted from
the server.
