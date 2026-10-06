from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@router.get("/health/providers")
async def health_providers() -> dict:
    from app.settings import settings
    from app.providers.factory import build_llm_provider, build_embedding_provider, build_rerank_provider

    results: dict[str, str] = {}

    try:
        llm = build_llm_provider(settings)
        await llm.generate(system="ping", messages=[], max_tokens=1)
        results["llm"] = "ok"
    except Exception as e:
        results["llm"] = f"error: {type(e).__name__}"

    try:
        emb = build_embedding_provider(settings)
        await emb.embed_query("ping")
        results["embedding"] = "ok"
    except Exception as e:
        results["embedding"] = f"error: {type(e).__name__}"

    try:
        rr = build_rerank_provider(settings)
        if rr is None:
            results["rerank"] = "disabled"
        else:
            await rr.rerank("ping", ["a", "b"], top_n=1)
            results["rerank"] = "ok"
    except Exception as e:
        results["rerank"] = f"error: {type(e).__name__}"

    return results
