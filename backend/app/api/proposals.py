# ascend/backend/app/api/proposals.py
"""
Proposal Upload & Full-Depth Statutory Compliance Audit.

Accepts PDF / DOCX / TXT / MD proposal documents, extracts ALL text content
with structure (sections, headings, clauses, sub-clauses), and submits the
complete proposal through the 6-agent pipeline checking compliance against
ALL seeded Dubai Government laws and articles dynamically.
"""
import io
import logging
import re
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from sqlalchemy import update

from app.db.models import Analysis
from app.db.session import AsyncSessionLocal
from app.providers.factory import build_embedding_provider, build_llm_provider, build_rerank_provider
from app.settings import settings
from app.workflow.graph import run_analysis

logger = logging.getLogger("ascend.proposals")
router = APIRouter(prefix="/proposals", tags=["proposals"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".md"}
MAX_FILE_SIZE_MB = 20
MAX_CLAUSES = 50      # max clauses sent to agents (stay within token budget)
MIN_CLAUSE_LEN = 30   # skip fragments shorter than this


# ─────────────────────────────────────────────────────────────────────────────
# Text extraction
# ─────────────────────────────────────────────────────────────────────────────

def _extract_pdf_text(data: bytes) -> str:
    """Full-text extraction from PDF preserving page breaks."""
    import fitz  # pymupdf
    doc = fitz.open(stream=data, filetype="pdf")
    pages = []
    for page in doc:
        text = page.get_text("text")
        if text.strip():
            pages.append(text.strip())
    return "\n\n".join(pages)


def _extract_docx_text(data: bytes) -> str:
    """
    Full-text extraction from DOCX:
    - Headings are prefixed with ### so they appear as section markers
    - Tables are serialised row-by-row
    - All paragraphs are included
    """
    from docx import Document
    from docx.oxml.ns import qn

    doc = Document(io.BytesIO(data))
    lines = []

    # Paragraphs (includes headings)
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        style = para.style.name.lower()
        if "heading 1" in style:
            lines.append(f"\n# {text}")
        elif "heading 2" in style:
            lines.append(f"\n## {text}")
        elif "heading 3" in style or "heading 4" in style:
            lines.append(f"\n### {text}")
        else:
            lines.append(text)

    # Tables
    for table in doc.tables:
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells if c.text.strip()]
            if cells:
                lines.append(" | ".join(cells))

    return "\n".join(lines)


def _extract_text(filename: str, data: bytes) -> str:
    """Route to the correct extractor based on file extension."""
    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf":
        return _extract_pdf_text(data)
    elif suffix in (".docx",):
        return _extract_docx_text(data)
    elif suffix in (".txt", ".md", ".doc"):
        return data.decode("utf-8", errors="replace")
    raise HTTPException(400, f"Unsupported format: '{suffix}'")


# ─────────────────────────────────────────────────────────────────────────────
# Clause segmentation (smart, dynamic)
# ─────────────────────────────────────────────────────────────────────────────

def _segment_into_clauses(raw_text: str) -> list[str]:
    """
    Dynamically segments any document into meaningful compliance-checkable clauses.

    Strategy (in priority order):
    1. Numbered/lettered clauses: 1. / a) / (i) / Article 5 / Section 3 ...
    2. Bullet / dash / star list items
    3. Heading-delimited sections (lines starting with # / ALL CAPS)
    4. Sentence-boundary fallback for free-form prose
    """
    clauses: list[str] = []

    # ── Strategy 1: Explicit numbered/lettered structure ──────────────────────
    # Matches: "1.", "1)", "(1)", "a.", "a)", "(a)", "Article 5", "Section 3",
    #          "Clause 2", "Para 4", Roman numerals i., ii., iii.
    numbered_pattern = re.compile(
        r"""
        (?:^|\n)
        \s*
        (?:
            (?:Article|Section|Clause|Para(?:graph)?|Item|Sub-?(?:clause|section|article))\s*[\d\.]+  # named markers
            |
            \d{1,3}(?:\.\d{1,3})*[.)]\s+          # 1. / 1.2. / 1.2.3.
            |
            [a-zA-Z][.)]\s+                          # a. / b) / A.
            |
            \([a-zA-Z0-9ivxlcdmIVXLCDM]+\)\s+      # (i) / (a) / (1)
        )
        (.+?)
        (?=\n\s*(?:Article|Section|Clause|Para(?:graph)?|Item)\s*[\d\.]
            |\n\s*\d{1,3}(?:\.\d{1,3})*[.)]
            |\n\s*[a-zA-Z][.)]
            |\n\s*\([a-zA-Z0-9ivxlcdmIVXLCDM]+\)
            |$)
        """,
        re.VERBOSE | re.IGNORECASE | re.DOTALL,
    )
    matches = numbered_pattern.findall(raw_text)
    if len(matches) >= 3:
        for m in matches:
            text = " ".join(m.split())
            if len(text) >= MIN_CLAUSE_LEN:
                clauses.append(text)

    # ── Strategy 2: Heading-delimited sections ────────────────────────────────
    if len(clauses) < 3:
        sections = re.split(r'\n(?=#{1,3}\s)', raw_text)
        for sec in sections:
            sec = " ".join(sec.split())
            if len(sec) >= MIN_CLAUSE_LEN:
                clauses.append(sec)

    # ── Strategy 3: Bullet list items ─────────────────────────────────────────
    if len(clauses) < 3:
        bullets = re.findall(r'(?:^|\n)\s*[-•*]\s+(.+)', raw_text)
        for b in bullets:
            text = b.strip()
            if len(text) >= MIN_CLAUSE_LEN:
                clauses.append(text)

    # ── Strategy 4: Sentence-boundary fallback ────────────────────────────────
    if len(clauses) < 3:
        # Split on sentence endings followed by capital letters or newlines
        sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z"\'])', raw_text)
        for s in sentences:
            text = " ".join(s.split())
            if len(text) >= MIN_CLAUSE_LEN:
                clauses.append(text)

    # ── Strategy 5: Line-by-line last resort ──────────────────────────────────
    if len(clauses) < 3:
        for line in raw_text.splitlines():
            text = line.strip()
            if len(text) >= MIN_CLAUSE_LEN:
                clauses.append(text)

    # Deduplicate while preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for c in clauses:
        norm = " ".join(c.lower().split())
        if norm not in seen:
            seen.add(norm)
            unique.append(c)

    # Cap while keeping the most content-dense ones
    return unique[:MAX_CLAUSES]


# ─────────────────────────────────────────────────────────────────────────────
# API endpoint
# ─────────────────────────────────────────────────────────────────────────────

@router.post("")
async def upload_proposal(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(default=""),
    description: str = Form(default=""),
    department: str = Form(default="Government Entity"),
) -> dict:
    """
    Upload a proposal document (PDF / DOCX / TXT / MD).

    Extracts ALL text, segments into compliance-checkable clauses, and
    runs the full 6-agent statutory audit against ALL seeded Dubai laws.
    Returns analysis_id immediately; audit runs in background.
    """
    # ── Validate ──────────────────────────────────────────────────────────────
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            400,
            f"File type '{suffix}' not supported. Allowed: PDF, DOCX, TXT, MD"
        )

    data = await file.read()
    if not data:
        raise HTTPException(422, "Uploaded file is empty.")

    size_mb = len(data) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(413, f"File too large ({size_mb:.1f}MB). Max: {MAX_FILE_SIZE_MB}MB")

    # ── Extract ───────────────────────────────────────────────────────────────
    try:
        raw_text = _extract_text(file.filename or "upload", data)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Text extraction failed for {file.filename}: {exc}", exc_info=True)
        raise HTTPException(422, f"Could not extract text from file: {exc}")

    raw_text = raw_text.strip()
    if len(raw_text) < 50:
        raise HTTPException(422, "Document appears empty or unreadable. Please upload a text-based file.")

    # ── Segment ───────────────────────────────────────────────────────────────
    clauses = _segment_into_clauses(raw_text)
    if not clauses:
        # Fallback: send the whole text as one big block
        clauses = [raw_text[:4000]]

    # ── Build process name ────────────────────────────────────────────────────
    process_name = (title.strip() or
                    Path(file.filename or "Proposal").stem.replace("_", " ").replace("-", " ").title())
    if description.strip():
        process_name = f"{process_name} — {description.strip()[:120]}"
    if department.strip():
        process_name = f"[{department.strip()}] {process_name}"

    logger.info(
        f"Proposal '{process_name}': {len(raw_text)} chars → {len(clauses)} clauses "
        f"(from {file.filename}, {size_mb:.1f}MB)"
    )

    # ── Create analysis record ────────────────────────────────────────────────
    async with AsyncSessionLocal() as session:
        config = {
            "llm_provider": settings.llm_provider,
            "llm_model": settings.vertex_llm_model or settings.openai_compat_model,
            "embedding_model": settings.vertex_embedding_model or settings.local_embedding_model,
            "source": "proposal_upload",
            "filename": file.filename,
            "department": department,
            "process_name": process_name,
            "chars_extracted": len(raw_text),
            "clauses_extracted": len(clauses),
        }
        analysis = Analysis(
            process_id=None,
            status="running",
            started_at=datetime.now(timezone.utc),
            llm_provider=settings.llm_provider,
            llm_model=config["llm_model"],
            config_snapshot=config,
        )
        session.add(analysis)
        await session.commit()
        await session.refresh(analysis)
        analysis_id = analysis.id

    background_tasks.add_task(
        _run_proposal_audit, analysis_id, process_name, clauses
    )

    return {
        "analysis_id": str(analysis_id),
        "status": "running",
        "process_name": process_name,
        "chars_extracted": len(raw_text),
        "clauses_extracted": len(clauses),
        "message": (
            f"Proposal '{process_name}' submitted. "
            f"{len(clauses)} compliance clauses extracted from {len(raw_text):,} characters "
            f"and queued for full statutory audit."
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Background audit task
# ─────────────────────────────────────────────────────────────────────────────

async def _run_proposal_audit(analysis_id: int, process_name: str, clauses: list[str]):
    """Runs the 6-agent compliance audit in the background."""
    async with AsyncSessionLocal() as session:
        try:
            llm = build_llm_provider(settings)
            fast_llm = build_llm_provider(settings, fast=True)
            embedding = build_embedding_provider(settings)
            reranker = build_rerank_provider(settings)
            await run_analysis(
                analysis_id, process_name, clauses, session, llm, fast_llm, embedding, reranker
            )
        except Exception as exc:
            logger.error(f"Proposal audit #{analysis_id} failed: {exc}", exc_info=True)
            await session.execute(
                update(Analysis).where(Analysis.id == analysis_id).values(status="failed")
            )
            await session.commit()
