# ascend/backend/app/tests/test_fake_providers.py
import pytest
from pydantic import BaseModel
from app.providers.fake_providers import FakeLLMProvider, FakeEmbeddingProvider, FakeRerankProvider


class SampleSchema(BaseModel):
    value: str = "default"
    count: int = 0


@pytest.mark.asyncio
async def test_fake_llm_generate_no_schema():
    provider = FakeLLMProvider()
    result = await provider.generate(system="sys", messages=[])
    assert result.text == "fake-response"
    assert result.input_tokens == 10


@pytest.mark.asyncio
async def test_fake_llm_generate_with_schema():
    provider = FakeLLMProvider()
    result = await provider.generate(system="sys", messages=[], response_schema=SampleSchema)
    parsed = SampleSchema.model_validate_json(result.text)
    assert isinstance(parsed, SampleSchema)


@pytest.mark.asyncio
async def test_fake_embedding_dimension():
    provider = FakeEmbeddingProvider()
    vecs = await provider.embed_documents(["hello", "world"])
    assert len(vecs) == 2
    assert all(len(v) == provider.dimension for v in vecs)


@pytest.mark.asyncio
async def test_fake_embedding_deterministic():
    provider = FakeEmbeddingProvider()
    v1 = await provider.embed_query("test")
    v2 = await provider.embed_query("test")
    assert v1 == v2


@pytest.mark.asyncio
async def test_fake_reranker_top_n():
    provider = FakeRerankProvider()
    hits = await provider.rerank("q", ["a", "b", "c", "d"], top_n=2)
    assert len(hits) == 2
    assert hits[0].score >= hits[1].score
