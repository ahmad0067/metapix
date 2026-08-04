"""
metadata_extractor.py
----------------------
Wraps the system `exiftool` binary to pull EXIF, IPTC, XMP, GPS and file-level
metadata out of an uploaded image. ExifTool is used (instead of pure-Python
libraries) because it is the only tool that reliably reads *every* metadata
namespace across JPG, PNG, WEBP, TIFF and HEIC files in one pass.

Falls back gracefully with a clear error message if the `exiftool` binary is
not installed on the host (see README for install instructions).
"""

import json
import shutil
import subprocess
from pathlib import Path
from typing import Any, Dict


class ExifToolNotFoundError(RuntimeError):
    """Raised when the exiftool binary isn't available on PATH."""
    pass


def _check_exiftool_installed() -> None:
    if shutil.which("exiftool") is None:
        raise ExifToolNotFoundError(
            "The 'exiftool' binary was not found on this system's PATH. "
            "Install it with: sudo apt install libimage-exiftool-perl (Linux) "
            "or `brew install exiftool` (Mac). See README for details."
        )


def extract_raw_metadata(file_path: str) -> Dict[str, Any]:
    """
    Runs `exiftool -json -G -a -u <file>` and returns the parsed dict.
    -G  : group names (EXIF, IPTC, XMP, File, Composite ...) prefixed to each key
    -a  : allow duplicate tag names (keeps every tag instead of collapsing)
    -u  : show unknown/unsupported tags too
    """
    _check_exiftool_installed()

    result = subprocess.run(
        ["exiftool", "-json", "-G", "-a", "-u", file_path],
        capture_output=True,
        text=True,
        timeout=30,
    )

    if result.returncode != 0:
        raise RuntimeError(f"ExifTool failed: {result.stderr.strip()}")

    parsed = json.loads(result.stdout)
    return parsed[0] if parsed else {}


def _to_float_coord(value: Any) -> float | None:
    """ExifTool already returns GPS coords as signed decimal degrees when -n
    is NOT used and the tag is GPSLatitude/GPSLongitude with N/S/E/W applied.
    This helper just guards against missing/garbage values."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def structure_metadata(raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Takes ExifTool's flat, group-prefixed dict (e.g. "EXIF:Make") and buckets
    it into the shape the frontend expects: general / camera / gps / raw.
    """

    def get(*keys: str, default=None):
        """Try several possible group-prefixed key names, return first hit."""
        for k in keys:
            if k in raw:
                return raw[k]
        return default

    general = {
        "fileName": get("File:FileName", "SourceFile"),
        "fileType": get("File:FileType"),
        "mimeType": get("File:MIMEType"),
        "fileSize": get("File:FileSize"),
        "dimensions": f'{get("File:ImageWidth", "EXIF:ExifImageWidth", default="?")}'
        f'x{get("File:ImageHeight", "EXIF:ExifImageHeight", default="?")}',
        "createDate": get("EXIF:CreateDate", "EXIF:DateTimeOriginal", "XMP:CreateDate"),
        "modifyDate": get("EXIF:ModifyDate", "File:FileModifyDate"),
        "colorSpace": get("EXIF:ColorSpace"),
        "software": get("EXIF:Software", "XMP:CreatorTool"),
    }

    camera = {
        "make": get("EXIF:Make"),
        "model": get("EXIF:Model"),
        "lensModel": get("EXIF:LensModel", "Composite:LensID"),
        "focalLength": get("EXIF:FocalLength", "Composite:FocalLength35efl"),
        "aperture": get("EXIF:FNumber", "Composite:Aperture"),
        "shutterSpeed": get("EXIF:ExposureTime", "Composite:ShutterSpeed"),
        "iso": get("EXIF:ISO"),
        "flash": get("EXIF:Flash"),
        "whiteBalance": get("EXIF:WhiteBalance"),
        "orientation": get("EXIF:Orientation"),
    }

    lat = _to_float_coord(get("EXIF:GPSLatitude", "Composite:GPSLatitude"))
    lon = _to_float_coord(get("EXIF:GPSLongitude", "Composite:GPSLongitude"))
    gps = {
        "hasGps": lat is not None and lon is not None,
        "latitude": lat,
        "longitude": lon,
        "altitude": get("EXIF:GPSAltitude", "Composite:GPSAltitude"),
        "timestamp": get("EXIF:GPSDateTime", "Composite:GPSDateTime"),
    }

    iptc_xmp = {
        k: v for k, v in raw.items() if k.startswith("IPTC:") or k.startswith("XMP:")
    }

    return {
        "general": general,
        "camera": camera,
        "gps": gps,
        "iptcXmp": iptc_xmp,
        "raw": raw,  # full, untouched dump for power users / JSON export
    }
