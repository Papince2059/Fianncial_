# ascend/backend/app/ingestion/parsers.py
from pathlib import Path


def parse_file(path: Path) -> str:
    """Extract plain text from PDF, DOCX, HTML, or Markdown files."""
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return _parse_pdf(path)
    elif suffix == ".docx":
        return _parse_docx(path)
    elif suffix in (".html", ".htm"):
        return _parse_html(path)
    elif suffix in (".md", ".txt"):
        return path.read_text(encoding="utf-8")
    else:
        raise ValueError(f"Unsupported file format: {suffix}")


def _parse_pdf(path: Path) -> str:
    import fitz  # pymupdf
    doc = fitz.open(str(path))
    return "\n".join(page.get_text() for page in doc)


def _parse_docx(path: Path) -> str:
    from docx import Document
    doc = Document(str(path))
    return "\n".join(para.text for para in doc.paragraphs if para.text.strip())


def _parse_html(path: Path) -> str:
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
    return soup.get_text(separator="\n")
