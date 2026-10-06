# ascend/backend/app/api/laws.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_session
from app.db.models import Law, LawNode

router = APIRouter(prefix="/laws", tags=["laws"])


@router.get("")
async def list_laws(session: AsyncSession = Depends(get_session)) -> list[dict]:
    laws = (await session.scalars(select(Law))).all()
    return [{"id": l.id, "code": l.code, "title_en": l.title_en, "year": l.year} for l in laws]


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
