from app.providers.base import RerankHit
from app.settings import Settings


class LocalRerankProvider:
    def __init__(self, settings: Settings) -> None:
        self._model_name = settings.local_rerank_model
        self._model = None

    def _get_model(self):
        if self._model is None:
            try:
                from sentence_transformers import CrossEncoder
                self._model = CrossEncoder(self._model_name)
            except ImportError:
                raise RuntimeError(
                    "sentence-transformers is not installed. Run `pip install sentence-transformers` "
                    "for local cross-encoder reranking."
                )
        return self._model

    async def rerank(self, query: str, passages: list[str], top_n: int) -> list[RerankHit]:
        if not passages:
            return []
        pairs = [[query, p] for p in passages]
        scores = self._get_model().predict(pairs).tolist()
        ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
        return [RerankHit(index=i, score=float(s)) for i, s in ranked[:top_n]]
