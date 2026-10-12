# ascend/backend/app/api/feedback.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.db.session import get_session
from app.db.models import Feedback, Finding, Analysis

router = APIRouter(tags=["feedback"])


class FindingFeedbackRequest(BaseModel):
    rating: int   # -1 | 0 | 1
    note: str | None = None


class GeneralFeedbackRequest(BaseModel):
    analysis_id: str | int
    target_type: str = "report"
    target_id: str | None = None
    helpful: bool = True
    comment: str | None = None
    corrected_citation: str | None = None


@router.post("/findings/{finding_id}/feedback")
async def submit_finding_feedback(
    finding_id: int,
    body: FindingFeedbackRequest,
    session: AsyncSession = Depends(get_session),
) -> dict:
    if body.rating not in (-1, 0, 1):
        raise HTTPException(400, "rating must be -1, 0, or 1")
    finding = await session.get(Finding, finding_id)
    if not finding:
        raise HTTPException(404, f"Finding {finding_id} not found")
    fb = Feedback(finding_id=finding_id, rating=body.rating, note=body.note)
    session.add(fb)
    await session.commit()
    await session.refresh(fb)
    return {"feedback_id": fb.id, "status": "recorded"}


@router.post("/feedback")
async def submit_general_feedback(
    body: GeneralFeedbackRequest,
    session: AsyncSession = Depends(get_session),
) -> dict:
    analysis_int_id = int(body.analysis_id)
    # Check if analysis exists
    analysis = await session.get(Analysis, analysis_int_id)
    if not analysis:
        raise HTTPException(404, f"Analysis {body.analysis_id} not found")

    # Find or create a top-level finding for this analysis to anchor the feedback
    q = select(Finding).where(Finding.analysis_id == analysis_int_id).limit(1)
    res = await session.execute(q)
    finding = res.scalar_one_or_none()

    if not finding:
        finding = Finding(
            analysis_id=analysis_int_id,
            part_no=0,
            finding_key="AUDIT_REVIEW",
            kind="review",
            text="General auditor review feedback",
        )
        session.add(finding)
        await session.flush()

    rating = 1 if body.helpful else -1
    full_note = body.comment or ""
    if body.corrected_citation:
        full_note = f"{full_note} | Citation: {body.corrected_citation}".strip(" |")

    fb = Feedback(
        finding_id=finding.id,
        rating=rating,
        note=full_note,
        resolution=f"target_type={body.target_type}"
    )
    session.add(fb)
    await session.commit()
    await session.refresh(fb)

    return {
        "status": "success",
        "feedback_id": fb.id,
        "helpful": body.helpful,
        "message": "Auditor feedback successfully recorded"
    }


@router.get("/feedback/analysis/{analysis_id}")
@router.get("/analyses/{analysis_id}/feedback")
async def get_analysis_feedback(
    analysis_id: int,
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    q = (
        select(Feedback, Finding)
        .join(Finding, Feedback.finding_id == Finding.id)
        .where(Finding.analysis_id == analysis_id)
        .order_by(Feedback.created_at.desc())
    )
    res = await session.execute(q)
    rows = res.all()
    results = []
    for fb, finding in rows:
        results.append({
            "id": fb.id,
            "finding_key": finding.finding_key,
            "rating": fb.rating,
            "helpful": True if fb.rating == 1 else False,
            "note": fb.note or "",
            "resolution": fb.resolution or "",
            "created_at": fb.created_at.isoformat() if fb.created_at else "",
        })
    return results

