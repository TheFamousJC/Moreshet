from __future__ import annotations

import argparse
from html import escape
from pathlib import Path

from docx import Document
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph as PdfParagraph,
    Spacer,
    Table as PdfTable,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "Docs" / "Tudela_Global_User_Manual_and_Technical_Reference.docx"
OUTPUT = ROOT / "Docs" / ".manual_render" / "manual_qa.pdf"

NAVY = colors.HexColor("#17365D")
BLUE = colors.HexColor("#2E74B5")
MID_BLUE = colors.HexColor("#1F4D78")
GOLD = colors.HexColor("#C59A36")
PALE_BLUE = colors.HexColor("#E8EEF5")
LIGHT_GREY = colors.HexColor("#F3F5F7")
DARK = colors.HexColor("#263238")


def block_items(document):
    for child in document.element.body.iterchildren():
        if child.tag == qn("w:p"):
            yield Paragraph(child, document)
        elif child.tag == qn("w:tbl"):
            yield Table(child, document)


def contains_page_break(paragraph: Paragraph) -> bool:
    return bool(paragraph._p.xpath('.//w:br[@w:type="page"]'))


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(0.6)
    canvas.line(inch, 0.58 * inch, 7.5 * inch, 0.58 * inch)
    canvas.setFillColor(MID_BLUE)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawCentredString(4.25 * inch, 0.38 * inch, f"Tudela Global  |  Living development manual  |  Page {doc.page}")
    canvas.restoreState()


def styles():
    base = getSampleStyleSheet()
    return {
        "Normal": ParagraphStyle("Body", parent=base["BodyText"], fontName="Helvetica", fontSize=8.7, leading=11, textColor=DARK, spaceAfter=5),
        "Title": ParagraphStyle("Title", parent=base["Title"], fontName="Helvetica-Bold", fontSize=25, leading=29, textColor=NAVY, alignment=TA_LEFT, spaceAfter=12),
        "Subtitle": ParagraphStyle("Subtitle", parent=base["BodyText"], fontName="Helvetica", fontSize=12.5, leading=16, textColor=MID_BLUE, spaceAfter=14),
        "Heading 1": ParagraphStyle("H1", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=14, leading=17, textColor=BLUE, spaceBefore=10, spaceAfter=6, keepWithNext=True),
        "Heading 2": ParagraphStyle("H2", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=11, leading=13.5, textColor=MID_BLUE, spaceBefore=7, spaceAfter=4, keepWithNext=True),
        "Heading 3": ParagraphStyle("H3", parent=base["Heading3"], fontName="Helvetica-Bold", fontSize=9.5, leading=12, textColor=NAVY, spaceBefore=5, spaceAfter=3, keepWithNext=True),
        "List Bullet": ParagraphStyle("Bullet", parent=base["BodyText"], fontName="Helvetica", fontSize=8.6, leading=10.6, textColor=DARK, leftIndent=18, firstLineIndent=-9, bulletIndent=6, spaceAfter=3),
        "List Number": ParagraphStyle("Number", parent=base["BodyText"], fontName="Helvetica", fontSize=8.6, leading=10.6, textColor=DARK, leftIndent=18, firstLineIndent=-9, bulletIndent=6, spaceAfter=3),
        "Manual Code": ParagraphStyle("Code", parent=base["Code"], fontName="Courier", fontSize=7.2, leading=9, textColor=DARK, backColor=LIGHT_GREY, borderColor=BLUE, borderWidth=0.5, borderPadding=5, leftIndent=8, rightIndent=4, spaceAfter=5),
        "Manual Note": ParagraphStyle("Note", parent=base["BodyText"], fontName="Helvetica-Oblique", fontSize=8.2, leading=10.5, textColor=NAVY, backColor=colors.HexColor("#F7F1E2"), borderColor=GOLD, borderWidth=0.5, borderPadding=5, leftIndent=8, rightIndent=4, spaceAfter=6),
    }


def safe_text(text: str, code=False) -> str:
    escaped = escape(text).replace("\n", "<br/>")
    if code:
        escaped = escaped.replace(" ", "&nbsp;")
    return escaped or "&nbsp;"


def build(input_path: Path = INPUT, output_path: Path = OUTPUT) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    word = Document(input_path)
    st = styles()
    doc = BaseDocTemplate(
        str(output_path), pagesize=letter, leftMargin=inch, rightMargin=inch,
        topMargin=0.72 * inch, bottomMargin=0.72 * inch,
        title="Tudela Global User Manual and Technical Reference",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="body")
    doc.addPageTemplates(PageTemplate(id="manual", frames=[frame], onPage=footer))
    story = []
    list_number = 0
    for item in block_items(word):
        if isinstance(item, Paragraph):
            style_name = item.style.name if item.style else "Normal"
            text = item.text.strip()
            if text:
                style = st.get(style_name, st["Normal"])
                bullet = None
                if style_name == "List Bullet":
                    bullet = "•"
                elif style_name == "List Number":
                    list_number += 1
                    bullet = f"{list_number}."
                else:
                    list_number = 0
                story.append(PdfParagraph(safe_text(text, style_name == "Manual Code"), style, bulletText=bullet))
            if contains_page_break(item):
                story.append(PageBreak())
        else:
            rows = []
            for row in item.rows:
                rows.append([PdfParagraph(safe_text(cell.text.strip()), ParagraphStyle("Cell", parent=st["Normal"], fontSize=7.2, leading=8.7, spaceAfter=0)) for cell in row.cells])
            if not rows:
                continue
            col_count = len(rows[0])
            widths = [doc.width / col_count] * col_count
            table = PdfTable(rows, colWidths=widths, repeatRows=1, hAlign="LEFT")
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), PALE_BLUE),
                ("TEXTCOLOR", (0, 0), (-1, 0), NAVY),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#AEB8C2")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            story.extend([table, Spacer(1, 5)])
    doc.build(story)
    print(output_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a PDF layout check for the Tudela manual.")
    parser.add_argument("--input", type=Path, default=INPUT)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    build(args.input, args.output)
