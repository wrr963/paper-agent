import fitz  # PyMuPDF
from typing import Dict, Any

class PDFParser:
    def __init__(self):
        pass

    def extract_text(self, file_path: str) -> str:
        """
        Extracts raw text from a PDF file.
        """
        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text()
        return text

    def extract_metadata(self, file_path: str) -> Dict[str, Any]:
        """
        Extracts basic metadata from the PDF.
        """
        doc = fitz.open(file_path)
        return doc.metadata

def get_pdf_parser():
    return PDFParser()
