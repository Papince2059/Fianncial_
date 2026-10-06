# ascend/backend/app/retrieval/hybrid.py
from dataclasses import dataclass
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.providers.base import EmbeddingProvider, RerankProvider


@dataclass
class HybridHit:
    chunk_id: int
    node_id: int
    content: str
    content_with_path: str
    rrf_score: float


async def hybrid_search(
    query: str,
    session: AsyncSession,
    embedding_provider: EmbeddingProvider,
    rerank_provider: RerankProvider | None = None,
    top_k: int = 20,
    top_n: int = 10,
) -> list[HybridHit]:
    """Hybrid pgvector + FTS search with RRF merge and optional reranking."""
    query_vec = await embedding_provider.embed_query(query)
    model_id = embedding_provider.model_id

    # Vector search
    vector_sql = text("""
        SELECT c.id AS chunk_id, c.node_id, c.content, c.content_with_path,
               1 - (ce.embedding <=> CAST(:vec AS vector)) AS score
        FROM chunks c
        JOIN chunk_embeddings ce ON ce.chunk_id = c.id
        WHERE ce.embedding_model = :model_id
        ORDER BY ce.embedding <=> CAST(:vec AS vector)
        LIMIT :top_k
    """)
    vec_result = await session.execute(
        vector_sql, {"vec": str(query_vec), "model_id": model_id, "top_k": top_k}
    )
    vector_hits = {row.chunk_id: row for row in vec_result.mappings()}

    # Full-text search
    fts_sql = text("""
        SELECT c.id AS chunk_id, c.node_id, c.content, c.content_with_path,
               ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', :query)) AS score
        FROM chunks c
        WHERE to_tsvector('english', c.content) @@ plainto_tsquery('english', :query)
        ORDER BY score DESC
        LIMIT :top_k
    """)
    fts_result = await session.execute(fts_sql, {"query": query, "top_k": top_k})
    fts_hits = {row.chunk_id: row for row in fts_result.mappings()}

    # Reciprocal Rank Fusion (RRF), k=60
    all_ids = set(vector_hits) | set(fts_hits)
    vec_rank = {cid: i + 1 for i, cid in enumerate(sorted(vector_hits, key=lambda x: vector_hits[x]["score"], reverse=True))}
    fts_rank = {cid: i + 1 for i, cid in enumerate(sorted(fts_hits, key=lambda x: fts_hits[x]["score"], reverse=True))}

    rrf_scores: dict[int, float] = {}
    for cid in all_ids:
        rrf = 0.0
        if cid in vec_rank:
            rrf += 1.0 / (60 + vec_rank[cid])
        if cid in fts_rank:
            rrf += 1.0 / (60 + fts_rank[cid])
        rrf_scores[cid] = rrf

    merged = sorted(rrf_scores, key=lambda x: rrf_scores[x], reverse=True)[:top_k]

    hits: list[HybridHit] = []
    for cid in merged:
        row = vector_hits.get(cid) or fts_hits.get(cid)
        if row:
            hits.append(HybridHit(
                chunk_id=cid,
                node_id=row["node_id"],
                content=row["content"],
                content_with_path=row["content_with_path"],
                rrf_score=rrf_scores[cid],
            ))

    # Optional reranking
    if rerank_provider and hits:
        passages = [h.content_with_path for h in hits]
        rerank_hits = await rerank_provider.rerank(query, passages, top_n=top_n)
        hits = [hits[rh.index] for rh in rerank_hits]
    else:
        hits = hits[:top_n]

    return hits
