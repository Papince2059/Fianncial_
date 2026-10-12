"""
ascend/backend/app/ingestion/seed_laws_from_docx.py

Parses ASCEND_Dubai_Official_Laws_and_Articles_Reference.docx and seeds
all 8 real Dubai Government laws + articles into the PostgreSQL database,
replacing any existing dummy/seeded data.

Usage (run from project root):
    docker compose exec backend python -m app.ingestion.seed_laws_from_docx
"""
import asyncio
import logging
import re
from pathlib import Path
from docx import Document
from sqlalchemy import delete, text
from app.db.session import AsyncSessionLocal
from app.db.models import Law, LawNode, Chunk, ChunkEmbedding

logger = logging.getLogger("ascend.seeder")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# ──────────────────────────────────────────────────────────────────────────────
# Law metadata — extracted from the DOCX headings (Heading 1 level)
# ──────────────────────────────────────────────────────────────────────────────
LAW_METADATA = {
    "3.":  {
        "code": "LAW_NO_1_2016",
        "title_en": "Law No. (1) of 2016 — Financial Regulations of the Government of Dubai",
        "title_ar": "قانون رقم (1) لسنة 2016 بشأن النظام المالي لحكومة دبي",
        "jurisdiction": "Dubai, UAE",
        "year": 2016,
        "version": "1.0",
    },
    "4.":  {
        "code": "EC_RES_5_2021",
        "title_en": "Executive Council Resolution No. (5) of 2021 — Implementing Bylaw of Law No. (1) of 2016",
        "title_ar": "قرار المجلس التنفيذي رقم (5) لسنة 2021 بشأن اللائحة التنفيذية لقانون رقم (1) لسنة 2016",
        "jurisdiction": "Dubai, UAE",
        "year": 2021,
        "version": "1.0",
    },
    "6.":  {
        "code": "LAW_NO_12_2020",
        "title_en": "Law No. (12) of 2020 — Contracts and Warehouse Management",
        "title_ar": "قانون رقم (12) لسنة 2020 بشأن إدارة العقود والمستودعات",
        "jurisdiction": "Dubai, UAE",
        "year": 2020,
        "version": "1.0",
    },
    "7.":  {
        "code": "LAW_NO_4_2018",
        "title_en": "Law No. (4) of 2018 — Financial Audit Authority",
        "title_ar": "قانون رقم (4) لسنة 2018 بشأن هيئة المحاسبة",
        "jurisdiction": "Dubai, UAE",
        "year": 2018,
        "version": "1.0",
    },
    "8.":  {
        "code": "LAW_NO_8_2022",
        "title_en": "Law No. (8) of 2022 — Public Debt",
        "title_ar": "قانون رقم (8) لسنة 2022 بشأن الدين العام",
        "jurisdiction": "Dubai, UAE",
        "year": 2022,
        "version": "1.0",
    },
    "9.":  {
        "code": "LAW_NO_5_1995",
        "title_en": "Law No. (5) of 1995 — Establishing the Department of Finance",
        "title_ar": "قانون رقم (5) لسنة 1995 بإنشاء دائرة المالية",
        "jurisdiction": "Dubai, UAE",
        "year": 1995,
        "version": "1.0",
    },
    "10.": {
        "code": "LAW_NO_15_2025",
        "title_en": "Law No. (15) of 2025 — General Budget Cycle 2026–2028 and General Budget 2026",
        "title_ar": "قانون رقم (15) لسنة 2025 بشأن دورة الميزانية العامة 2026-2028 والميزانية العامة 2026",
        "jurisdiction": "Dubai, UAE",
        "year": 2025,
        "version": "1.0",
    },
}

# Section numbers we skip (metadata/config sections, not laws)
SKIP_SECTIONS = {"1.", "2.", "5.", "11.", "12.", "13."}


def _get_section_prefix(heading_text: str) -> str | None:
    """Return the numeric prefix like '3.' from a Heading 1 line."""
    m = re.match(r"^(\d+\.)\s+", heading_text.strip())
    return m.group(1) if m else None


def parse_docx_into_laws(docx_path: Path) -> list[dict]:
    """
    Parse the DOCX into a list of law dicts:
    [
      {
        "meta": { code, title_en, ... },
        "articles": [
            { "number": "1", "title": "Definitions", "source": "...", "text": "..." },
            ...
        ]
      }
    ]
    """
    doc = Document(str(docx_path))
    paragraphs = [(p.style.name, p.text.strip()) for p in doc.paragraphs if p.text.strip()]

    laws: list[dict] = []
    current_law: dict | None = None
    current_article: dict | None = None
    current_section_prefix: str | None = None
    capture = False
    source_line = ""

    for style, text in paragraphs:
        if style == "Heading 1":
            # Flush current article
            if current_article and current_law is not None:
                current_law["articles"].append(current_article)
                current_article = None

            prefix = _get_section_prefix(text)
            current_section_prefix = prefix

            if prefix in SKIP_SECTIONS or prefix is None:
                capture = False
                current_law = None
                continue

            meta = LAW_METADATA.get(prefix)
            if meta:
                capture = True
                current_law = {"meta": meta, "articles": []}
                laws.append(current_law)
            else:
                capture = False
                current_law = None

        elif style == "Heading 2" and capture and current_law is not None:
            # Flush previous article
            if current_article:
                current_law["articles"].append(current_article)

            # e.g. "Law No. (1) of 2016 — Article (11)"
            art_match = re.search(r"Article\s*\((\d+[A-Za-z]*)\)", text, re.IGNORECASE)
            art_num = art_match.group(1) if art_match else text
            current_article = {
                "number": art_num,
                "title": "",
                "source": "",
                "text": "",
            }
            source_line = ""

        elif style == "Heading 3" and capture and current_article is not None:
            current_article["title"] = text

        elif style == "Normal" and capture and current_article is not None:
            # First Normal after an article heading is the source URL
            if not source_line and text.lower().startswith("official source"):
                current_article["source"] = text
                source_line = text
            else:
                # Accumulate article body text
                if current_article["text"]:
                    current_article["text"] += "\n" + text
                else:
                    current_article["text"] = text

    # Flush last article
    if current_article and current_law is not None:
        current_law["articles"].append(current_article)

    return laws


async def seed(docx_path: Path) -> None:
    parsed_laws = parse_docx_into_laws(docx_path)
    logger.info(f"Parsed {len(parsed_laws)} laws from DOCX")

    async with AsyncSessionLocal() as session:
        # Clear existing seeded laws (keep structure, wipe data)
        logger.info("Clearing existing law data from database...")
        await session.execute(delete(ChunkEmbedding))
        await session.execute(delete(Chunk))
        await session.execute(delete(LawNode))
        await session.execute(delete(Law))
        await session.commit()
        logger.info("Existing law data cleared.")

        for law_data in parsed_laws:
            meta = law_data["meta"]
            articles = law_data["articles"]

            logger.info(f"Seeding: {meta['code']} — {len(articles)} articles")

            law_row = Law(
                code=meta["code"],
                title_en=meta["title_en"],
                title_ar=meta["title_ar"],
                jurisdiction=meta["jurisdiction"],
                year=meta["year"],
                version=meta["version"],
            )
            session.add(law_row)
            await session.flush()

            # Group articles into a single "chapter" per law for now
            chapter = LawNode(
                law_id=law_row.id,
                node_type="chapter",
                number="1",
                title="Full Text",
                path_text="Full Text",
                ordinal=1,
                language="en",
            )
            session.add(chapter)
            await session.flush()

            for ordinal, article in enumerate(articles, start=1):
                if not article["text"].strip():
                    continue  # skip empty articles

                breadcrumb = f"{meta['title_en']} > Article {article['number']}: {article['title']}"
                art_node = LawNode(
                    law_id=law_row.id,
                    parent_id=chapter.id,
                    node_type="article",
                    number=article["number"],
                    title=article["title"],
                    text=article["text"],
                    path_text=breadcrumb,
                    ordinal=ordinal,
                    language="en",
                )
                session.add(art_node)
                await session.flush()

                # Create chunk for RAG retrieval
                content = article["text"].strip()
                content_with_path = f"[{breadcrumb}]\n\n{content}"

                chunk = Chunk(
                    node_id=art_node.id,
                    content=content,
                    content_with_path=content_with_path,
                    token_count=len(content.split()),
                )
                session.add(chunk)

        await session.commit()
        logger.info("✅ All laws seeded into PostgreSQL! Generating embeddings...")

        # Generate embeddings for all seeded chunks
        try:
            from sqlalchemy import select
            from app.providers.factory import build_embedding_provider
            from app.settings import settings
            emb = build_embedding_provider(settings)
            chunks = (await session.scalars(select(Chunk))).all()
            logger.info(f"Generating embeddings for {len(chunks)} chunks with model '{emb.model_id}'...")
            for i in range(0, len(chunks), 32):
                batch = chunks[i:i + 32]
                texts = [c.content_with_path for c in batch]
                vectors = await emb.embed_documents(texts)
                for chunk_row, vec in zip(batch, vectors):
                    session.add(ChunkEmbedding(
                        chunk_id=chunk_row.id,
                        embedding_model=emb.model_id,
                        embedding_dim=emb.dimension,
                        embedding=vec,
                    ))
            await session.commit()
            logger.info("✅ Embeddings generated and saved successfully!")
        except Exception as e:
            logger.warning(f"Embedding generation skipped or encountered error: {e}")


async def main():
    candidates = [
        Path("/app/data/ASCEND_Dubai_Official_Laws_and_Articles_Reference.docx"),
        Path("/app/ASCEND_Dubai_Official_Laws_and_Articles_Reference.docx"),
        Path("data/ASCEND_Dubai_Official_Laws_and_Articles_Reference.docx"),
        Path("ASCEND_Dubai_Official_Laws_and_Articles_Reference.docx"),
        Path("../data/ASCEND_Dubai_Official_Laws_and_Articles_Reference.docx"),
        Path("../ASCEND_Dubai_Official_Laws_and_Articles_Reference.docx"),
    ]
    # Also try relative to this file
    here = Path(__file__).resolve()
    for n in range(1, 6):
        try:
            candidates.append(here.parents[n] / "ASCEND_Dubai_Official_Laws_and_Articles_Reference.docx")
        except IndexError:
            break

    docx_path = None
    for c in candidates:
        if c.exists():
            docx_path = c
            break

    if docx_path is None:
        logger.error("DOCX not found in any expected location. Tried: " + ", ".join(str(c) for c in candidates))
        return

    logger.info(f"Reading DOCX from: {docx_path}")
    await seed(docx_path)


if __name__ == "__main__":
    asyncio.run(main())
