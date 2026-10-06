# ascend/backend/app/api/processes.py
from pathlib import Path
import yaml
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_session
from app.db.models import Process, ProcessActivity

router = APIRouter(prefix="/processes", tags=["processes"])


async def _ensure_seeded() -> None:
    from app.db.session import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        count = await session.scalar(select(Process.id).limit(1))
        if count is not None:
            return

        # Look for processes.yaml
        yaml_candidates = [
            Path(__file__).parents[3] / "data/processes/processes.yaml",
            Path(__file__).parents[4] / "ascend/data/processes/processes.yaml",
        ]
        yaml_path = next((p for p in yaml_candidates if p.exists()), None)
        if not yaml_path:
            return

        with yaml_path.open(encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}

        for item in data.get("processes", []):
            proc = Process(
                level=item.get("level", 3),
                code=item.get("code"),
                name_en=item["name_en"],
                name_ar=item.get("name_ar"),
                description=item.get("description"),
            )
            session.add(proc)
            await session.flush()
            for act in item.get("activities", []):
                session.add(
                    ProcessActivity(
                        process_id=proc.id,
                        ordinal=act["ordinal"],
                        text=act["text"],
                    )
                )
        await session.commit()


@router.get("")
async def list_processes(session: AsyncSession = Depends(get_session)) -> list[dict]:
    await _ensure_seeded()
    procs = (await session.scalars(select(Process).order_by(Process.id))).all()
    return [
        {
            "id": p.id,
            "code": p.code,
            "name_en": p.name_en,
            "name_ar": p.name_ar,
            "level": p.level,
            "description": p.description,
        }
        for p in procs
    ]


@router.get("/{process_id}")
async def get_process(process_id: int, session: AsyncSession = Depends(get_session)) -> dict:
    await _ensure_seeded()
    proc = await session.get(Process, process_id)
    if not proc:
        raise HTTPException(404, "Process not found")
    acts = (
        await session.scalars(
            select(ProcessActivity)
            .where(ProcessActivity.process_id == process_id)
            .order_by(ProcessActivity.ordinal)
        )
    ).all()
    return {
        "id": proc.id,
        "code": proc.code,
        "name_en": proc.name_en,
        "name_ar": proc.name_ar,
        "description": proc.description,
        "level": proc.level,
        "activities": [{"ordinal": a.ordinal, "text": a.text} for a in acts],
    }
