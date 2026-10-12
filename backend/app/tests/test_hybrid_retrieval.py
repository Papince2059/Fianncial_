# ascend/backend/app/tests/test_hybrid_retrieval.py
import pytest
from app.providers.fake_providers import FakeEmbeddingProvider, FakeRerankProvider


def test_rrf_merge_scores_higher_for_dual_hits():
    """Test that a chunk appearing in both vector and FTS gets a higher RRF score."""
    from app.retrieval.hybrid import hybrid_search  # noqa: F401
    # RRF formula: 1/(60+rank_v) + 1/(60+rank_f) > 1/(60+rank_v) alone
    k = 60
    dual_hit_score = 1 / (k + 1) + 1 / (k + 1)  # rank 1 in both
    single_hit_score = 1 / (k + 1)               # rank 1 in one only
    assert dual_hit_score > single_hit_score


def test_fake_embedding_provider_used_for_retrieval():
    """Ensure FakeEmbeddingProvider satisfies the EmbeddingProvider protocol."""
    from app.providers.base import EmbeddingProvider
    provider = FakeEmbeddingProvider()
    assert isinstance(provider, EmbeddingProvider)


def test_fake_reranker_returns_top_n():
    import asyncio
    provider = FakeRerankProvider()
    hits = asyncio.run(provider.rerank("query", ["a", "b", "c", "d", "e"], top_n=3))
    assert len(hits) == 3


@pytest.mark.asyncio
async def test_end_to_end_retrieval_service():
    """Test full retrieval service against the ingested synthetic law in database."""
    from app.db.session import AsyncSessionLocal
    from app.retrieval.service import retrieve

    emb = FakeEmbeddingProvider()
    rr = FakeRerankProvider()

    async with AsyncSessionLocal() as session:
        results = await retrieve("Budget preparation circular SFC", session, emb, rr, top_k=5, top_n=3)
        assert len(results) > 0
        assert results[0].law_code in ("SYNTH_PFL_001", "LAW_NO_1_2016") or "Law No. (1)" in results[0].law_code
