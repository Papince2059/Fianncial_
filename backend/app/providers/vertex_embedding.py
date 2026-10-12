# ascend/backend/app/providers/vertex_embedding.py
from tenacity import retry, stop_after_attempt, wait_exponential
from google import genai
from app.settings import Settings


class VertexEmbeddingProvider:
    def __init__(self, settings: Settings) -> None:
        import os
        from pathlib import Path
        candidates = []
        if settings.google_application_credentials:
            candidates.append(Path(settings.google_application_credentials))
        candidates.extend([
            Path("/app/vertex_credentials.json"),
            Path("vertex_credentials.json"),
            Path("../vertex_credentials.json"),
        ])
        for c in candidates:
            if c.exists():
                os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(c.resolve())
                break

        self._client = genai.Client(
            vertexai=True,
            project=settings.google_cloud_project,
            location=settings.google_cloud_location,
        )
        self.dimension: int = settings.vertex_embedding_dim
        self.model_id: str = settings.vertex_embedding_model

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        resp = await self._client.aio.models.embed_content(
            model=self.model_id,
            contents=texts,
        )
        return [e.values for e in resp.embeddings]

    async def embed_query(self, text: str) -> list[float]:
        result = await self.embed_documents([text])
        return result[0]

