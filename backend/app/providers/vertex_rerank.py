# ascend/backend/app/providers/vertex_rerank.py
from tenacity import retry, stop_after_attempt, wait_exponential
from google.cloud import discoveryengine_v1alpha as discoveryengine
from app.providers.base import RerankHit
from app.settings import Settings


class VertexRerankProvider:
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

        self._project = settings.google_cloud_project
        self._model = settings.vertex_rerank_model
        self._client = discoveryengine.RankServiceAsyncClient()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def rerank(self, query: str, passages: list[str], top_n: int) -> list[RerankHit]:
        request = discoveryengine.RankRequest(
            ranking_config=f"projects/{self._project}/locations/global/rankingConfigs/default_ranking_config",
            model=self._model,
            query=query,
            records=[discoveryengine.RankingRecord(id=str(i), content=p) for i, p in enumerate(passages)],
            top_n=top_n,
        )
        response = await self._client.rank(request=request)
        return [RerankHit(index=int(r.id), score=r.score) for r in response.records]
