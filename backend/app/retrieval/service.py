# ascend/backend/app/retrieval/service.py
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession
from app.providers.base import EmbeddingProvider, RerankProvider
from app.retrieval.hybrid import hybrid_search
from app.retrieval.context_expand import get_article_context


@dataclass
class RetrievedArticle:
    node_id: int
    law_code: str
    article_no: str
    path_text: str
    text: str
    definitions: list[dict]
    score: float


async def retrieve(
    query: str,
    session: AsyncSession,
    embedding_provider: EmbeddingProvider,
    rerank_provider: RerankProvider | None = None,
    top_k: int = 20,
    top_n: int = 10,
) -> list[RetrievedArticle]:
    hits = await hybrid_search(query, session, embedding_provider, rerank_provider, top_k=top_k, top_n=top_n)
    results: list[RetrievedArticle] = []
    for hit in hits:
        ctx = await get_article_context(hit.node_id, session)
        if not ctx:
            continue
        law_code = ctx["path_text"].split(" > ")[0] if ctx.get("path_text") else "UNKNOWN"
        results.append(RetrievedArticle(
            node_id=hit.node_id,
            law_code=law_code,
            article_no=ctx.get("number", "?"),
            path_text=ctx.get("path_text", ""),
            text=ctx.get("text", ""),
            definitions=ctx.get("definitions", []),
            score=hit.rrf_score,
        ))
    return results
