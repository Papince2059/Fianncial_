from app.settings import Settings


class LocalEmbeddingProvider:
    def __init__(self, settings: Settings) -> None:
        self.model_id = settings.local_embedding_model
        self.dimension = settings.local_embedding_dim
        self._url = settings.local_embedding_url
        self._model = None  # lazy-loaded

    def _get_model(self):
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(self.model_id)
            except ImportError:
                raise RuntimeError(
                    "sentence-transformers is not installed. Run `pip install sentence-transformers` "
                    "or configure LOCAL_EMBEDDING_URL to use Text Embeddings Inference (TEI)."
                )
        return self._model

    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if self._url:
            return await self._embed_via_tei(texts)
        return self._get_model().encode(texts, normalize_embeddings=True).tolist()

    async def embed_query(self, text: str) -> list[float]:
        result = await self.embed_documents([text])
        return result[0]

    async def _embed_via_tei(self, texts: list[str]) -> list[list[float]]:
        from httpx import AsyncClient

        async with AsyncClient() as client:
            resp = await client.post(
                f"{self._url}/embed",
                json={"inputs": texts},
                timeout=60.0,
            )
            resp.raise_for_status()
            return resp.json()
