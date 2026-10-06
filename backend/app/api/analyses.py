# ascend/backend/app/api/analyses.py
import asyncio
from datetime import datetime, timezone
import json
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel
from app.db.session import get_session
from app.db.models import Analysis, AnalysisEvent, ReportSection, Process, ProcessActivity
from app.workflow.graph import run_analysis
from app.providers.factory import build_llm_provider, build_embedding_provider, build_rerank_provider
from app.settings import settings

router = APIRouter(prefix="/analyses", tags=["analyses"])


class CreateAnalysisRequest(BaseModel):
    process_id: int | None = None
    custom_process_text: str | None = None
    custom_activities: list[str] | None = None


@router.post("")
async def create_analysis(
    request: CreateAnalysisRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> dict:
    if not request.process_id and not request.custom_process_text:
        raise HTTPException(400, "Either process_id or custom_process_text required")

    process_name = request.custom_process_text or ""
    activities = request.custom_activities or []

    if request.process_id:
        proc = await session.get(Process, request.process_id)
        if not proc:
            raise HTTPException(404, f"Process {request.process_id} not found")
        process_name = proc.name_en
        acts_result = await session.scalars(
            select(ProcessActivity)
            .where(ProcessActivity.process_id == request.process_id)
            .order_by(ProcessActivity.ordinal)
        )
        activities = [a.text for a in acts_result.all()]

    config_snapshot = {
        "llm_provider": settings.llm_provider,
        "llm_model": settings.vertex_llm_model or settings.openai_compat_model,
        "embedding_model": settings.vertex_embedding_model or settings.local_embedding_model,
    }
    analysis = Analysis(
        process_id=request.process_id,
        status="running",
        started_at=datetime.now(timezone.utc),
        llm_provider=settings.llm_provider,
        llm_model=config_snapshot["llm_model"],
        config_snapshot=config_snapshot,
    )
    session.add(analysis)
    await session.commit()
    await session.refresh(analysis)
    analysis_id = analysis.id

    background_tasks.add_task(
        _run_analysis_background, analysis_id, process_name, activities
    )
    return {"analysis_id": analysis_id}


async def _run_analysis_background(analysis_id: int, process_name: str, activities: list[str]):
    from app.db.session import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        llm = build_llm_provider(settings)
        fast_llm = build_llm_provider(settings, fast=True)
        embedding = build_embedding_provider(settings)
        reranker = build_rerank_provider(settings)
        try:
            await run_analysis(analysis_id, process_name, activities, session, llm, fast_llm, embedding, reranker)
        except Exception:
            await session.execute(
                update(Analysis).where(Analysis.id == analysis_id).values(status="failed")
            )
            await session.commit()


@router.get("/{analysis_id}/stream")
async def stream_analysis(
    analysis_id: int,
    last_event_id: int = 0,
    session: AsyncSession = Depends(get_session),
):
    """SSE stream of analysis events. Supports Last-Event-ID for reconnection."""
    async def event_generator():
        seq = last_event_id
        analysis_done = False
        while not analysis_done:
            events = (await session.scalars(
                select(AnalysisEvent)
                .where(AnalysisEvent.analysis_id == analysis_id, AnalysisEvent.seq > seq)
                .order_by(AnalysisEvent.seq)
            )).all()
            for ev in events:
                seq = ev.seq
                data = {
                    "id": ev.id,
                    "seq": ev.seq,
                    "event_type": ev.event_type,
                    "agent": ev.agent,
                    "payload": ev.payload,
                    "ts": ev.ts.isoformat(),
                }
                yield f"id: {ev.seq}\ndata: {json.dumps(data)}\n\n"
                if ev.event_type in ("done", "error"):
                    analysis_done = True
                    break
            if not analysis_done:
                current_analysis = await session.get(Analysis, analysis_id)
                if current_analysis and current_analysis.status in ("done", "failed"):
                    analysis_done = True
                    break
                await asyncio.sleep(0.5)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/{analysis_id}")
async def get_analysis(analysis_id: int, session: AsyncSession = Depends(get_session)) -> dict:
    analysis = await session.get(Analysis, analysis_id)
    if not analysis:
        raise HTTPException(404, "Analysis not found")
    sections = (await session.scalars(
        select(ReportSection).where(ReportSection.analysis_id == analysis_id).order_by(ReportSection.part_no)
    )).all()
    return {
        "id": analysis.id,
        "status": analysis.status,
        "llm_provider": analysis.llm_provider,
        "sections": [{"part_no": s.part_no, "content": s.content} for s in sections],
    }
