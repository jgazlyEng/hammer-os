from __future__ import annotations

from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "GreenLight_User_Function_Walkthrough.md"
OUTPUT = ROOT / "GreenLight_User_Function_Walkthrough.pdf"


def clean_inline(text: str) -> str:
    return escape(text.strip()).replace("GreenLight", "<b>GreenLight</b>", 1) if text.strip().startswith("GreenLight") else escape(text.strip())


def build_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="CoverTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=32,
        leading=38,
        textColor=colors.HexColor("#101513"),
        alignment=TA_CENTER,
        spaceAfter=12,
    ))
    styles.add(ParagraphStyle(
        name="CoverSubtitle",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=13,
        leading=18,
        textColor=colors.HexColor("#4b5c53"),
        alignment=TA_CENTER,
        spaceAfter=22,
    ))
    styles.add(ParagraphStyle(
        name="H1Custom",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=25,
        textColor=colors.HexColor("#12823a"),
        spaceBefore=18,
        spaceAfter=9,
    ))
    styles.add(ParagraphStyle(
        name="H2Custom",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#18201c"),
        spaceBefore=13,
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name="H3Custom",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=11.5,
        leading=15,
        textColor=colors.HexColor("#2d3d34"),
        spaceBefore=9,
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        name="BodyCustom",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.6,
        leading=14,
        textColor=colors.HexColor("#26332d"),
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name="BulletCustom",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.4,
        leading=13,
        textColor=colors.HexColor("#26332d"),
        leftIndent=4,
    ))
    styles.add(ParagraphStyle(
        name="Footer",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor("#7c8a82"),
        alignment=TA_LEFT,
    ))
    return styles


def flush_list(story, pending, styles, ordered=False):
    if not pending:
        return
    items = [ListItem(Paragraph(clean_inline(item), styles["BulletCustom"]), leftIndent=10) for item in pending]
    story.append(ListFlowable(
        items,
        bulletType="1" if ordered else "bullet",
        start="1",
        leftIndent=18,
        bulletFontName="Helvetica-Bold",
        bulletFontSize=8.5,
        bulletColor=colors.HexColor("#12823a"),
    ))
    story.append(Spacer(1, 4))


def render_markdown(text: str, styles):
    story = []
    pending_bullets: list[str] = []
    pending_numbers: list[str] = []
    cover_done = False

    for raw in text.splitlines():
        line = raw.rstrip()
        stripped = line.strip()

        if not stripped:
            flush_list(story, pending_bullets, styles, ordered=False)
            pending_bullets.clear()
            flush_list(story, pending_numbers, styles, ordered=True)
            pending_numbers.clear()
            continue

        if stripped.startswith("# "):
            flush_list(story, pending_bullets, styles, ordered=False)
            pending_bullets.clear()
            flush_list(story, pending_numbers, styles, ordered=True)
            pending_numbers.clear()
            title = stripped[2:].strip()
            story.append(Spacer(1, 1.2 * inch))
            story.append(Paragraph(title, styles["CoverTitle"]))
            story.append(Paragraph("User-friendly feature guide and step-by-step workflow reference", styles["CoverSubtitle"]))
            story.append(HRFlowable(width="55%", color=colors.HexColor("#12823a"), thickness=1.4, hAlign="CENTER", spaceBefore=8, spaceAfter=18))
            cover_done = True
            continue

        if stripped.startswith("Version:"):
            story.append(Paragraph(escape(stripped), styles["CoverSubtitle"]))
            story.append(PageBreak())
            continue

        if stripped.startswith("## "):
            flush_list(story, pending_bullets, styles, ordered=False)
            pending_bullets.clear()
            flush_list(story, pending_numbers, styles, ordered=True)
            pending_numbers.clear()
            if cover_done and len(story) > 2:
                story.append(Spacer(1, 2))
            story.append(Paragraph(escape(stripped[3:].strip()), styles["H1Custom"]))
            continue

        if stripped.startswith("### "):
            flush_list(story, pending_bullets, styles, ordered=False)
            pending_bullets.clear()
            flush_list(story, pending_numbers, styles, ordered=True)
            pending_numbers.clear()
            story.append(Paragraph(escape(stripped[4:].strip()), styles["H2Custom"]))
            continue

        if stripped.startswith("- "):
            flush_list(story, pending_numbers, styles, ordered=True)
            pending_numbers.clear()
            pending_bullets.append(stripped[2:].strip())
            continue

        if len(stripped) > 3 and stripped[0].isdigit() and ". " in stripped[:4]:
            flush_list(story, pending_bullets, styles, ordered=False)
            pending_bullets.clear()
            pending_numbers.append(stripped.split(". ", 1)[1].strip())
            continue

        flush_list(story, pending_bullets, styles, ordered=False)
        pending_bullets.clear()
        flush_list(story, pending_numbers, styles, ordered=True)
        pending_numbers.clear()

        if stripped.endswith(":") and len(stripped) < 80:
            story.append(Paragraph(escape(stripped), styles["H3Custom"]))
        else:
            story.append(Paragraph(clean_inline(stripped), styles["BodyCustom"]))

    flush_list(story, pending_bullets, styles, ordered=False)
    flush_list(story, pending_numbers, styles, ordered=True)
    return story


def add_page_chrome(canvas, doc):
    canvas.saveState()
    width, height = letter
    canvas.setFillColor(colors.HexColor("#12823a"))
    canvas.rect(0, height - 0.18 * inch, width, 0.18 * inch, fill=True, stroke=False)
    canvas.setFillColor(colors.HexColor("#7c8a82"))
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(doc.leftMargin, 0.38 * inch, "GreenLight MVP User Function Walkthrough")
    canvas.drawRightString(width - doc.rightMargin, 0.38 * inch, f"Page {doc.page}")
    canvas.restoreState()


def main():
    styles = build_styles()
    text = SOURCE.read_text(encoding="utf-8")
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=letter,
        rightMargin=0.65 * inch,
        leftMargin=0.65 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.65 * inch,
        title="GreenLight User Function Walkthrough",
        author="GreenLight",
    )
    story = render_markdown(text, styles)
    doc.build(story, onFirstPage=add_page_chrome, onLaterPages=add_page_chrome)
    print(OUTPUT)


if __name__ == "__main__":
    main()
