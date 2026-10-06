# ascend/backend/app/api/dashboard.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_session
from app.db.models import Analysis, Finding, ReportSection

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def dashboard_summary(session: AsyncSession = Depends(get_session)) -> dict:
    total = await session.scalar(select(func.count()).select_from(Analysis)) or 0
    done = await session.scalar(
        select(func.count()).select_from(Analysis).where(Analysis.status == "done")
    ) or 0
    total_gaps = await session.scalar(select(func.count()).select_from(Finding)) or 0

    status_counts: dict[str, int] = {"COMPLIANT": 0, "PARTIALLY_COMPLIANT": 0, "NON_COMPLIANT": 0}

    # Query status part from report sections (part_no=3)
    status_sections = (
        await session.scalars(select(ReportSection).where(ReportSection.part_no == 3))
    ).all()
    for s in status_sections:
        if isinstance(s.content, dict) and "status" in s.content:
            st = s.content["status"]
            if st in status_counts:
                status_counts[st] += 1

    # Query recent analyses
    recent_analyses = (
        await session.scalars(select(Analysis).order_by(Analysis.id.desc()).limit(5))
    ).all()

    return {
        "total_analyses": total,
        "processes_analyzed": done,
        "total_gaps": total_gaps,
        "corrective_actions": 0,
        "compliance_ratio": status_counts,
        "gaps_over_time": [],
        "recent_reports": [
            {
                "id": a.id,
                "status": a.status,
                "started_at": a.started_at.isoformat() if a.started_at else None,
                "finished_at": a.finished_at.isoformat() if a.finished_at else None,
                "llm_provider": a.llm_provider,
            }
            for a in recent_analyses
        ],
    }
