# ascend/backend/app/providers/vertex_embedding.py
from tenacity import retry, stop_after_attempt, wait_exponential
import vertexai
from vertexai.language_models import TextEmbeddingModel
from app.settings import Settings


class VertexEmbeddingProvider:
    def __init__(self, settings: Settings) -> None:
        import os
        from pathlib import Path
        if settings.google_application_credentials and Path(settings.google_application_credentials).exists():
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(Path(settings.google_application_credentials).resolve())

        vertexai.init(project=settings.google_cloud_project, location=settings.google_cloud_location)
        self._model = TextEmbeddingModel.from_pretrained(settings.vertex_embedding_model)
        self.dimension: int = settings.vertex_embedding_dim
        self.model_id: str = settings.vertex_embedding_model

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        embeddings = await self._model.get_embeddings_async(texts)
        return [e.values for e in embeddings]

    async def embed_query(self, text: str) -> list[float]:
        result = await self.embed_documents([text])
        return result[0]
