"""
pdf_generator.py
------------------
Builds a formatted PDF report from the structured metadata dict returned by
/api/extract. Uses reportlab's platypus layer for tables + styled text.
"""

from io import BytesIO
from datetime import datetime
from typing import Any, Dict

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
)

BRAND_TEAL = colors.HexColor("#0F766E")
DARK = colors.HexColor("#111827")
GREY = colors.HexColor("#6B7280")


def _kv_table(data: Dict[str, Any]) -> Table:
    rows = [[str(k), "-" if v in (None, "", []) else str(v)] for k, v in data.items()]
    table = Table(rows, colWidths=[55 * mm, 110 * mm])
    table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (0, -1), GREY),
        ("TEXTCOLOR", (1, 0), (1, -1), DARK),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, colors.HexColor("#E5E7EB")),
    ]))
    return table


def generate_metadata_pdf(metadata: Dict[str, Any], file_name: str = "image") -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=20 * mm, bottomMargin=20 * mm,
        leftMargin=20 * mm, rightMargin=20 * mm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleStyle", parent=styles["Heading1"], textColor=BRAND_TEAL, fontSize=20
    )
    section_style = ParagraphStyle(
        "SectionStyle", parent=styles["Heading2"], textColor=DARK, fontSize=13,
        spaceBefore=14, spaceAfter=6,
    )
    meta_style = ParagraphStyle(
        "MetaStyle", parent=styles["Normal"], textColor=GREY, fontSize=9
    )

    story = [
        Paragraph("MetaPix — Metadata Report", title_style),
        Paragraph(f"File: {file_name}", meta_style),
        Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", meta_style),
        Spacer(1, 6 * mm),
        HRFlowable(width="100%", color=colors.HexColor("#E5E7EB")),
    ]

    general = metadata.get("general", {})
    camera = metadata.get("camera", {})
    gps = metadata.get("gps", {})
    ai = metadata.get("aiDetection", {})

    story.append(Paragraph("General Information", section_style))
    story.append(_kv_table(general))

    story.append(Paragraph("Camera & Capture Settings", section_style))
    story.append(_kv_table(camera))

    story.append(Paragraph("Location (GPS)", section_style))
    if gps.get("hasGps"):
        story.append(_kv_table({
            "Latitude": gps.get("latitude"),
            "Longitude": gps.get("longitude"),
            "Altitude": gps.get("altitude"),
            "GPS Timestamp": gps.get("timestamp"),
        }))
    else:
        story.append(Paragraph("No GPS coordinates found in this file.", styles["Normal"]))

    story.append(Paragraph("AI / Editing Detection", section_style))
    if ai:
        findings = ai.get("findings", [])
        if findings:
            rows = [["Tool", "Category", "Matched Tag"]] + [
                [f["label"], f["category"], f["matchedTag"]] for f in findings
            ]
            t = Table(rows, colWidths=[55 * mm, 45 * mm, 65 * mm])
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), BRAND_TEAL),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E5E7EB")),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
            ]))
            story.append(t)
        else:
            story.append(Paragraph("No editing or AI-generation traces found in metadata.", styles["Normal"]))
        story.append(Spacer(1, 3 * mm))
        story.append(Paragraph(f"<i>{ai.get('disclaimer', '')}</i>", meta_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()
