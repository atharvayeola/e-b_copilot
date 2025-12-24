import hashlib
from io import BytesIO
from typing import Any

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas


def render_summary_pdf(verification_id: str, fields: list[dict[str, Any]]) -> tuple[bytes, str]:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    y = height - 50
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, "Benefits Summary")
    y -= 20
    c.setFont("Helvetica", 10)
    c.drawString(50, y, f"Verification ID: {verification_id}")
    y -= 30

    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "Field")
    c.drawString(250, y, "Value")
    c.drawString(430, y, "Status")
    y -= 15
    c.setFont("Helvetica", 9)

    for field in fields:
        if y < 50:
            c.showPage()
            y = height - 50
            c.setFont("Helvetica", 9)
        c.drawString(50, y, field["field_name"])
        c.drawString(250, y, str(field["value"]))
        c.drawString(430, y, field["status"])
        y -= 12

    c.showPage()
    c.save()
    pdf_bytes = buffer.getvalue()
    buffer.close()

    sha256 = hashlib.sha256(pdf_bytes).hexdigest()
    return pdf_bytes, sha256
