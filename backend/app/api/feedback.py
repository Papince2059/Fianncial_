# ascend/backend/app/api/feedback.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.db.session import get_session
from app.db.models import Feedback, Finding

router = APIRouter(prefix="/findings", tags=["feedback"])


class FeedbackRequest(BaseModel):
    rating: int   # -1 | 0 | 1
    note: str | None = None


@router.post("/{finding_id}/feedback")
async def submit_feedback(
    finding_id: int,
    body: FeedbackRequest,
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
    return {"feedback_id": fb.id}
