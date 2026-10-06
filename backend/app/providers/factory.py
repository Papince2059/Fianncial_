# ascend/backend/app/providers/factory.py
from app.settings import Settings
from app.providers.base import LLMProvider, EmbeddingProvider, RerankProvider


def build_llm_provider(settings: Settings, *, fast: bool = False) -> LLMProvider:
    match settings.llm_provider:
        case "vertex":
            from app.providers.vertex_llm import VertexLLMProvider
            return VertexLLMProvider(settings, fast=fast)  # type: ignore[return-value]
        case "openai_compat":
            from app.providers.openai_compat_llm import OpenAICompatLLMProvider
            return OpenAICompatLLMProvider(settings)  # type: ignore[return-value]
        case _:
            raise ValueError(
                f"Unknown LLM_PROVIDER '{settings.llm_provider}'. Valid: vertex, openai_compat"
            )


def build_embedding_provider(settings: Settings) -> EmbeddingProvider:
    match settings.embedding_provider:
        case "vertex":
            from app.providers.vertex_embedding import VertexEmbeddingProvider
            return VertexEmbeddingProvider(settings)  # type: ignore[return-value]
        case "local":
            from app.providers.local_embedding import LocalEmbeddingProvider
            return LocalEmbeddingProvider(settings)  # type: ignore[return-value]
        case _:
            raise ValueError(f"Unknown EMBEDDING_PROVIDER '{settings.embedding_provider}'")


def build_rerank_provider(settings: Settings) -> RerankProvider | None:
    match settings.rerank_provider:
        case "vertex":
            from app.providers.vertex_rerank import VertexRerankProvider
            return VertexRerankProvider(settings)  # type: ignore[return-value]
        case "local":
            from app.providers.local_rerank import LocalRerankProvider
            return LocalRerankProvider(settings)  # type: ignore[return-value]
        case "none":
            return None
        case _:
            raise ValueError(f"Unknown RERANK_PROVIDER '{settings.rerank_provider}'")
