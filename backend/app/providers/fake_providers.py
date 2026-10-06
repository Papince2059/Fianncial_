# ascend/backend/app/providers/fake_providers.py
import hashlib
from typing import AsyncIterator
from pydantic import BaseModel
from app.providers.base import LLMResult, RerankHit


class FakeLLMProvider:
    """Deterministic fake — returns a valid JSON string matching response_schema if given."""

    async def generate(
        self,
        *,
        system: str,
        messages: list,
        response_schema: type[BaseModel] | None = None,
        temperature: float = 0.0,
        max_tokens: int | None = None,
    ) -> LLMResult:
        if response_schema is not None:
            # Return minimal valid instance as JSON
            result_text = response_schema.model_construct().model_dump_json()
        else:
            result_text = "fake-response"
        return LLMResult(text=result_text, input_tokens=10, output_tokens=5, latency_ms=1.0)

    async def stream(
        self,
        *,
        system: str,
        messages: list,
        temperature: float = 0.0,
    ) -> AsyncIterator[str]:
        yield "fake-stream-chunk"


class FakeEmbeddingProvider:
    dimension: int = 4
    model_id: str = "fake-embed-v1"

    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._hash_vec(t) for t in texts]

    async def embed_query(self, text: str) -> list[float]:
        return self._hash_vec(text)

    def _hash_vec(self, text: str) -> list[float]:
        h = int(hashlib.md5(text.encode()).hexdigest(), 16)
        return [(h >> (i * 8) & 0xFF) / 255.0 for i in range(self.dimension)]


class FakeRerankProvider:
    async def rerank(self, query: str, passages: list[str], top_n: int) -> list[RerankHit]:
        # Reverse order as a "reranked" result
        hits = [RerankHit(index=i, score=1.0 - i * 0.1) for i in range(len(passages))]
        return hits[:top_n]
