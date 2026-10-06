# ascend/backend/app/tests/test_provider_factory.py
import pytest
from app.settings import Settings
from app.providers.factory import build_llm_provider, build_embedding_provider, build_rerank_provider


def make_settings(**overrides) -> Settings:
    base = dict(
        llm_provider="vertex",
        embedding_provider="vertex",
        rerank_provider="none",
        vertex_llm_model="gemini-pro",
        vertex_llm_fast_model="gemini-flash",
        vertex_embedding_model="textembedding-gecko",
        vertex_embedding_dim=768,
        vertex_rerank_model="semantic-ranker-512",
        google_cloud_project="proj",
        google_cloud_location="us-central1",
    )
    base.update(overrides)
    return Settings.model_construct(**base)


def test_factory_raises_on_unknown_llm_provider():
    s = make_settings(llm_provider="unknown_xyz")
    with pytest.raises(ValueError, match="Unknown LLM_PROVIDER"):
        build_llm_provider(s)


def test_factory_raises_on_unknown_embedding_provider():
    s = make_settings(embedding_provider="unknown_xyz")
    with pytest.raises(ValueError, match="Unknown EMBEDDING_PROVIDER"):
        build_embedding_provider(s)


def test_factory_returns_none_for_rerank_none():
    s = make_settings(rerank_provider="none")
    result = build_rerank_provider(s)
    assert result is None


def test_factory_raises_on_unknown_rerank_provider():
    s = make_settings(rerank_provider="unknown_xyz")
    with pytest.raises(ValueError, match="Unknown RERANK_PROVIDER"):
        build_rerank_provider(s)
