# ascend/backend/app/retrieval/context_expand.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import LawNode, Definition


async def get_article_context(
    node_id: int,
    session: AsyncSession,
) -> dict:
    """Return article text + parent path + any definitions for terms in the text."""
    node = await session.get(LawNode, node_id)
    if not node:
        return {}

    parent = await session.get(LawNode, node.parent_id) if node.parent_id else None
    grandparent = await session.get(LawNode, parent.parent_id) if parent and parent.parent_id else None

    # Find definitions whose terms appear in the node text
    law_id_result = await session.scalar(select(LawNode.law_id).where(LawNode.id == node_id))
    all_defs = (await session.scalars(select(Definition).where(Definition.law_id == law_id_result))).all()
    relevant_defs = [
        {"term": d.term, "definition": d.definition_text}
        for d in all_defs
        if node.text and d.term.lower() in node.text.lower()
    ]

    return {
        "node_id": node_id,
        "node_type": node.node_type,
        "number": node.number,
        "title": node.title,
        "text": node.text,
        "path_text": node.path_text,
        "parent_title": parent.title if parent else None,
        "chapter_title": grandparent.title if grandparent else (parent.title if parent else None),
        "definitions": relevant_defs,
    }
