# ascend/backend/app/api/processes.py
from pathlib import Path
import yaml
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_session
from app.db.models import Process, ProcessActivity, Law

router = APIRouter(prefix="/processes", tags=["processes"])


async def _ensure_seeded() -> None:
    from app.db.session import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        count = await session.scalar(select(Process.id).limit(1))
        if count is not None:
            return

        # Look for processes.yaml safely across multiple possible mount locations
        yaml_candidates = [
            Path("/app/data/processes/processes.yaml"),
            Path("data/processes/processes.yaml"),
            Path("../data/processes/processes.yaml"),
            Path("ascend/data/processes/processes.yaml"),
        ]
        # Also check parents safely without indexing beyond len(parents)
        current = Path(__file__).resolve()
        for parent in current.parents:
            yaml_candidates.append(parent / "data/processes/processes.yaml")
            yaml_candidates.append(parent / "ascend/data/processes/processes.yaml")

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
                        ordinal=act.get("ordinal", 1),
                        text=act.get("text", ""),
                    )
                )
        await session.commit()


@router.get("")
async def list_processes(session: AsyncSession = Depends(get_session)) -> list[dict]:
    await _ensure_seeded()
    procs = (await session.scalars(select(Process).order_by(Process.id))).all()
    result = []
    for p in procs:
        acts_count = await session.scalar(
            select(func.count(ProcessActivity.id)).where(ProcessActivity.process_id == p.id)
        ) or 0
        result.append({
            "id": str(p.id),
            "code": p.code or f"PROC-{p.id:03d}",
            "name": p.name_en,
            "name_en": p.name_en,
            "name_ar": p.name_ar,
            "level": p.level,
            "description": p.description or "",
            "department": "Department of Finance",
            "category": "Public Financial Management",
            "step_count": acts_count,
            "version": "1.0",
        })
    return result


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
    laws = (await session.scalars(select(Law.title_en))).all()
    applicable_laws = [l for l in laws if l] or ["All Enacted Laws (7 Statutes, 93 Articles)"]
    return {
        "id": str(proc.id),
        "code": proc.code or f"PROC-{proc.id:03d}",
        "name": proc.name_en,
        "name_en": proc.name_en,
        "name_ar": proc.name_ar,
        "description": proc.description or "",
        "department": "Department of Finance",
        "category": "Public Financial Management",
        "step_count": len(acts),
        "version": "1.0",
        "level": proc.level,
        "applicable_laws": applicable_laws,
        "steps": [
            {
                "step_num": a.ordinal,
                "name": f"Activity {a.ordinal}",
                "description": a.text,
                "responsible_role": "Department of Finance Officer",
                "controls": ["Statutory Verification", "Segregation of Duties"],
            }
            for a in acts
        ],
        "activities": [{"ordinal": a.ordinal, "text": a.text} for a in acts],
    }

