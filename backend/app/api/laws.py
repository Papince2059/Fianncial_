# ascend/backend/app/api/laws.py
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_session
from app.db.models import Law, LawNode, Chunk

router = APIRouter(prefix="/laws", tags=["laws"])


async def _ensure_seeded() -> None:
    from app.db.session import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        count = await session.scalar(select(Law.id).limit(1))
        if count is not None:
            return

    from app.ingestion.seed_laws_from_docx import main as seed_docx_main
    try:
        await seed_docx_main()
    except Exception as e:
        import logging
        logging.getLogger("ascend.laws").warning(f"Auto-seed from DOCX encountered error: {e}")


@router.get("")
async def list_laws(session: AsyncSession = Depends(get_session)) -> list[dict]:
    await _ensure_seeded()
    laws = (await session.scalars(select(Law).order_by(Law.id))).all()
    return [
        {
            "id": str(l.id),
            "code": l.code,
            "title": l.title_en or l.code,
            "title_en": l.title_en,
            "title_ar": l.title_ar,
            "jurisdiction": l.jurisdiction,
            "year": l.year,
            "effective_date": l.effective_date.strftime("%Y-%m-%d") if l.effective_date else "2016-01-01",
            "version": l.version or "1.0",
            "created_at": "2024-01-01",
        }
        for l in laws
    ]


@router.get("/{law_id}")
async def get_law(law_id: int, session: AsyncSession = Depends(get_session)) -> dict:
    await _ensure_seeded()
    law = await session.get(Law, law_id)
    if not law:
        raise HTTPException(404, "Law not found")

    nodes = (
        await session.scalars(select(LawNode).where(LawNode.law_id == law_id).order_by(LawNode.ordinal))
    ).all()

    chapter_nodes = [n for n in nodes if n.node_type == "chapter"]
    article_nodes = [n for n in nodes if n.node_type == "article"]

    chapters = []
    for ch in chapter_nodes:
        ch_articles = [
            {
                "id": str(a.id),
                "article_number": a.number or "",
                "title": a.title or f"Article {a.number}",
                "content": a.text or "",
                "breadcrumb_path": a.path_text or f"{ch.title} > Article {a.number}",
            }
            for a in article_nodes
            if a.parent_id == ch.id
        ]
        chapters.append({
            "id": str(ch.id),
            "number": int(ch.number) if ch.number and ch.number.isdigit() else 1,
            "title": ch.title or "",
            "articles": ch_articles,
        })

    # If no chapters were explicitly nested, group all articles under a default chapter
    if not chapters and article_nodes:
        chapters.append({
            "id": "1",
            "number": 1,
            "title": "General Statutory Articles",
            "articles": [
                {
                    "id": str(a.id),
                    "article_number": a.number or "",
                    "title": a.title or f"Article {a.number}",
                    "content": a.text or "",
                    "breadcrumb_path": a.path_text or f"Article {a.number}",
                }
                for a in article_nodes
            ],
        })

    definitions = [
        {
            "term": "Department of Finance (DOF)",
            "definition": "The central government department responsible for public financial management, budgeting, and fiscal regulation across Dubai Government entities.",
            "source_article_num": "2",
        },
        {
            "term": "General Budget",
            "definition": "The comprehensive fiscal instrument approved by the Ruler detailing all anticipated state revenues and expenditure allocations for the fiscal year.",
            "source_article_num": "2",
        },
        {
            "term": "Budget Circular",
            "definition": "Directives issued by the Director General of DOF specifying budget ceilings, preparation deadlines, and macroeconomic parameters.",
            "source_article_num": "5",
        },
    ]

    return {
        "id": str(law.id),
        "code": law.code,
        "title": law.title_en or law.code,
        "title_en": law.title_en,
        "title_ar": law.title_ar,
        "jurisdiction": law.jurisdiction,
        "year": law.year,
        "effective_date": law.effective_date.strftime("%Y-%m-%d") if law.effective_date else "2016-01-01",
        "version": law.version or "1.0",
        "chapters": chapters,
        "definitions": definitions,
    }


@router.get("/{law_id}/tree")
async def law_tree(law_id: int, session: AsyncSession = Depends(get_session)) -> dict:
    law = await session.get(Law, law_id)
    if not law:
        raise HTTPException(404, "Law not found")
    nodes = (await session.scalars(select(LawNode).where(LawNode.law_id == law_id))).all()
    return {
        "law": {"id": law.id, "code": law.code, "title_en": law.title_en},
        "nodes": [
            {
                "id": n.id,
                "parent_id": n.parent_id,
                "node_type": n.node_type,
                "number": n.number,
                "title": n.title,
                "path_text": n.path_text,
            }
            for n in nodes
        ],
    }


@router.get("/nodes/{node_id}")
async def get_node(node_id: int, session: AsyncSession = Depends(get_session)) -> dict:
    node = await session.get(LawNode, node_id)
    if not node:
        raise HTTPException(404, "Node not found")
    return {
        "id": node.id,
        "node_type": node.node_type,
        "number": node.number,
        "title": node.title,
        "text": node.text,
        "path_text": node.path_text,
    }

