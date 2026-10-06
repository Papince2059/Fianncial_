# ascend/backend/app/providers/fake_providers.py
import hashlib
from typing import AsyncIterator
from pydantic import BaseModel
from app.providers.base import LLMResult, RerankHit


from typing import get_args, get_origin, Literal
from pydantic_core import PydanticUndefined


def _mock_value(ann: type) -> object:
    origin = get_origin(ann)
    if origin is Literal:
        args = get_args(ann)
        return args[0] if args else "mock"
    if origin is list:
        return []
    if origin is dict:
        return {}
    if origin is None and isinstance(ann, type) and issubclass(ann, BaseModel):
        return _mock_model(ann)
    if ann is str or ann is Optional[str]:
        return "mock"
    if ann is int or ann is Optional[int]:
        return 0
    if ann is float or ann is Optional[float]:
        return 0.0
    if ann is bool or ann is Optional[bool]:
        return True
    return None


def _mock_model(model_cls: type[BaseModel]) -> BaseModel:
    values = {}
    for name, field_info in model_cls.model_fields.items():
        if field_info.default is not PydanticUndefined:
            values[name] = field_info.default
        elif field_info.default_factory is not None:
            values[name] = field_info.default_factory()
        else:
            values[name] = _mock_value(field_info.annotation)
    return model_cls.model_validate(values)


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
            # Return valid instance as JSON
            try:
                result_text = _mock_model(response_schema).model_dump_json()
            except Exception:
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
