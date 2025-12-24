from pathlib import Path

from pdfminer.high_level import extract_text
from PIL import Image
import pytesseract

from app.core.config import settings


def extract_text_from_pdf(file_path: str) -> str:
    return extract_text(file_path) or ""


def extract_text_from_image(file_path: str) -> str:
    if not settings.enable_ocr:
        return ""
    image = Image.open(file_path)
    return pytesseract.image_to_string(image) or ""


def detect_file_type(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext in [".pdf"]:
        return "pdf"
    if ext in [".png", ".jpg", ".jpeg"]:
        return "image"
    return "unknown"
