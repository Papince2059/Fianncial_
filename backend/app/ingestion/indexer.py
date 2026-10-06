# ascend/backend/app/ingestion/indexer.py
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models import Law, LawNode, Chunk, ChunkEmbedding, Definition
from app.ingestion.parsers import parse_file
from app.ingestion.hierarchy import build_hierarchy, extract_definitions
from app.ingestion.chunker import chunk_law, ChunkRecord
from app.providers.base import EmbeddingProvider
from app.settings import settings as app_settings


async def ingest_law_file(
    path: Path,
    session: AsyncSession,
    embedding_provider: EmbeddingProvider,
    law_code: str | None = None,
    dry_run: bool = False,
) -> dict:
    """Parse, build tree, chunk, embed, and write to DB. Returns summary stats."""
    if law_code is None:
        law_code = path.stem.upper().replace(" ", "_")

    raw_text = parse_file(path)
    tree = build_hierarchy(raw_text, law_code, title=path.stem)
    chunks = chunk_law(tree)
    definitions = extract_definitions(tree)

    if dry_run:
        return {"law_code": law_code, "chunks": len(chunks), "definitions": len(definitions), "dry_run": True}

    # Upsert Law row
    existing_law = await session.scalar(select(Law).where(Law.code == law_code))
    if existing_law is None:
        law_row = Law(code=law_code, title_en=tree.title, source_file=str(path))
        session.add(law_row)
        await session.flush()
        law_id = law_row.id
    else:
        law_id = existing_law.id

    # Upsert nodes and chunks (idempotent via node_path uniqueness)
    node_map: dict[str, int] = {}  # path_text → node_id
    chunk_records: list[tuple[int, ChunkRecord]] = []

    for ch in tree.root.children:
        ch_node = await _upsert_node(session, law_id, None, ch)
        node_map[ch.path_text] = ch_node
        for art in ch.children:
            art_node = await _upsert_node(session, law_id, ch_node, art)
            node_map[art.path_text] = art_node

    await session.flush()

    # Write chunks
    for chunk in chunks:
        node_id = node_map.get(chunk.node_path)
        if node_id is None:
            continue
        chunk_row = await _upsert_chunk(session, node_id, chunk)
        chunk_records.append((chunk_row, chunk))

    await session.flush()

    # Embed in batches
    batch_size: int = app_settings.get_yaml("ingestion", "batch_embed_size", default=32)
    for i in range(0, len(chunk_records), batch_size):
        batch = chunk_records[i:i + batch_size]
        texts = [c.content_with_path for _, c in batch]
        vectors = await embedding_provider.embed_documents(texts)
        for (chunk_row, _), vec in zip(batch, vectors):
            existing_emb = await session.scalar(
                select(ChunkEmbedding).where(
                    ChunkEmbedding.chunk_id == chunk_row,
                    ChunkEmbedding.embedding_model == embedding_provider.model_id,
                )
            )
            if existing_emb is None:
                session.add(ChunkEmbedding(
                    chunk_id=chunk_row,
                    embedding_model=embedding_provider.model_id,
                    embedding_dim=embedding_provider.dimension,
                    embedding=vec,
                ))

    # Write definitions
    for d in definitions:
        node_id = node_map.get(f"{law_code} > Ch.1 > Art.{d['article_number']}")
        session.add(Definition(
            law_id=law_id,
            term=d["term"],
            definition_text=d["definition_text"],
            node_id=node_id or (next(iter(node_map.values())) if node_map else 0),
        ))

    await session.commit()
    return {"law_code": law_code, "chunks": len(chunks), "definitions": len(definitions)}


async def _upsert_node(session: AsyncSession, law_id: int, parent_id: int | None, node) -> int:
    existing = await session.scalar(
        select(LawNode).where(LawNode.law_id == law_id, LawNode.path_text == node.path_text)
    )
    if existing:
        return existing.id
    new_node = LawNode(
        law_id=law_id, parent_id=parent_id,
        node_type=node.node_type, number=node.number,
        title=node.title, text=node.text,
        path_text=node.path_text, ordinal=node.ordinal,
    )
    session.add(new_node)
    await session.flush()
    return new_node.id


async def _upsert_chunk(session: AsyncSession, node_id: int, chunk: ChunkRecord) -> int:
    existing = await session.scalar(
        select(Chunk).where(Chunk.node_id == node_id, Chunk.content == chunk.content)
    )
    if existing:
        return existing.id
    new_chunk = Chunk(
        node_id=node_id,
        content=chunk.content,
        content_with_path=chunk.content_with_path,
        token_count=chunk.token_estimate,
    )
    session.add(new_chunk)
    await session.flush()
    return new_chunk.id
