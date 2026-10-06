# ascend/backend/app/workflow/events.py
from datetime import datetime, timezone
from typing import Literal, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import AnalysisEvent

EventType = Literal[
    "agent_state",      # idle|waiting|running|done|failed
    "tool_call",
    "agent_switch",
    "section_complete",
    "error",
    "done",
]


async def emit_event(
    analysis_id: int,
    seq: int,
    event_type: EventType,
    session: AsyncSession,
    agent: str | None = None,
    payload: dict[str, Any] | None = None,
) -> int:
    """Write event to DB and return next seq number."""
    event = AnalysisEvent(
        analysis_id=analysis_id,
        seq=seq,
        ts=datetime.now(timezone.utc),
        event_type=event_type,
        agent=agent,
        payload=payload or {},
    )
    session.add(event)
    await session.flush()
    return seq + 1
