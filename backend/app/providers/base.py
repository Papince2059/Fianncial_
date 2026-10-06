# ascend/backend/app/providers/base.py
from typing import Protocol, AsyncIterator, runtime_checkable
from pydantic import BaseModel
from dataclasses import dataclass


class Message(BaseModel):
    role: str   # "system" | "user" | "assistant"
    content: str


class LLMResult(BaseModel):
    text: str
    input_tokens: int
    output_tokens: int
    latency_ms: float


@dataclass
class RerankHit:
    index: int
    score: float


@runtime_checkable
class LLMProvider(Protocol):
    async def generate(
        self,
        *,
        system: str,
        messages: list[Message],
        response_schema: type[BaseModel] | None = None,
        temperature: float = 0.0,
        max_tokens: int | None = None,
    ) -> LLMResult: ...

    async def stream(
        self,
        *,
        system: str,
        messages: list[Message],
        temperature: float = 0.0,
    ) -> AsyncIterator[str]: ...


@runtime_checkable
class EmbeddingProvider(Protocol):
    dimension: int
    model_id: str

    async def embed_documents(self, texts: list[str]) -> list[list[float]]: ...
    async def embed_query(self, text: str) -> list[float]: ...


@runtime_checkable
class RerankProvider(Protocol):
    async def rerank(self, query: str, passages: list[str], top_n: int) -> list[RerankHit]: ...
