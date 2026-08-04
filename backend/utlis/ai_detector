"""
ai_detector.py
---------------
Heuristic detector that inspects already-extracted metadata for traces left
behind by editing software (Photoshop, Lightroom, GIMP) or AI image
generators (Midjourney, DALL-E, Stable Diffusion, Adobe Firefly).

This is metadata-based, not pixel-based: it cannot catch a generator that has
stripped its own metadata, but it reliably flags images that still carry
their original signature (which is the common case for un-scrubbed uploads).
"""

from typing import Any, Dict, List

# (label, list of substrings to search for, category)
SIGNATURES = [
    ("Adobe Photoshop", ["photoshop", "adobe photoshop"], "edited"),
    ("Adobe Lightroom", ["lightroom"], "edited"),
    ("GIMP", ["gimp"], "edited"),
    ("Canva", ["canva"], "edited"),
    ("Midjourney", ["midjourney"], "ai-generated"),
    ("DALL-E / OpenAI", ["dall-e", "dalle", "openai"], "ai-generated"),
    ("Stable Diffusion", ["stable diffusion", "stability ai", "automatic1111", "comfyui"], "ai-generated"),
    ("Adobe Firefly", ["firefly"], "ai-generated"),
    ("Google Imagen / Gemini", ["imagen", "gemini"], "ai-generated"),
]

# Tags most likely to carry a software/generator fingerprint
CANDIDATE_KEYS = [
    "EXIF:Software",
    "XMP:CreatorTool",
    "XMP:Software",
    "IPTC:OriginatingProgram",
    "XMP:Description",
    "XMP:UserComment",
    "EXIF:ImageDescription",
    "PNG:Comment",
    "PNG:Parameters",  # common Stable Diffusion WebUI PNG chunk
    "File:Comment",
]


def detect_ai_and_editing(raw_metadata: Dict[str, Any]) -> Dict[str, Any]:
    findings: List[Dict[str, str]] = []
    searched_text = []

    for key in CANDIDATE_KEYS:
        val = raw_metadata.get(key)
        if val:
            searched_text.append((key, str(val)))

    # Also sweep every raw tag value as a last resort (cheap for a small dict)
    for key, val in raw_metadata.items():
        if key not in CANDIDATE_KEYS and isinstance(val, (str, int, float)):
            searched_text.append((key, str(val)))

    lowered_blob = " ".join(v.lower() for _, v in searched_text)

    for label, needles, category in SIGNATURES:
        for needle in needles:
            if needle in lowered_blob:
                # find which specific tag matched, for transparency
                matched_tag = next((k for k, v in searched_text if needle in v.lower()), "unknown")
                findings.append({
                    "label": label,
                    "category": category,
                    "matchedTag": matched_tag,
                    "evidence": needle,
                })
                break  # one hit per signature is enough

    # Stripped-metadata images (very few tags at all) are a soft signal that
    # something was scrubbed intentionally -- worth surfacing, not alarming.
    is_suspiciously_bare = len(raw_metadata) <= 6

    return {
        "verdict": "flagged" if findings else "no-traces-found",
        "findings": findings,
        "isLikelyEdited": any(f["category"] == "edited" for f in findings),
        "isLikelyAiGenerated": any(f["category"] == "ai-generated" for f in findings),
        "metadataLooksStripped": is_suspiciously_bare,
        "disclaimer": (
            "This check is based on metadata fingerprints left by common tools. "
            "It cannot detect AI-generated or edited images whose metadata has "
            "already been removed, and false negatives are expected."
        ),
    }
