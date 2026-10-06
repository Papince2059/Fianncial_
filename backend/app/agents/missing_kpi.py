# ascend/backend/app/agents/missing_kpi.py
from pydantic import BaseModel
from app.agents.base_agent import load_prompt, call_with_schema
from app.agents.schemas import GapAnalysis, CorrectiveAction, MissingKPI
from app.agents.validators import validate_kpis
from app.providers.base import LLMProvider


class MissingKPIsWrapper(BaseModel):
    missing_kpis: list[MissingKPI] = []


async def run_missing_kpi(
    llm: LLMProvider,
    gap_analysis: GapAnalysis,
    corrective_actions: list[CorrectiveAction],
) -> list[MissingKPI]:
    prompt = load_prompt("missing_kpi_v1")
    all_findings = gap_analysis.missing_steps + gap_analysis.deviations + gap_analysis.risks
    valid_keys = {f.finding_key for f in all_findings}

    gaps_text = "\n".join(f"- {f.finding_key}: {f.text}" for f in all_findings)
    actions_text = "\n".join(f"- {a.action_key} (addresses {a.addresses_finding_key}): {', '.join(a.steps[:2])}" for a in corrective_actions)
    user_content = f"Gaps:\n{gaps_text}\n\nCorrective Actions:\n{actions_text}"

    output: MissingKPIsWrapper = await call_with_schema(llm, prompt, user_content, MissingKPIsWrapper)  # type: ignore[assignment]
    valid, _ = validate_kpis(output.missing_kpis, valid_keys)
    return valid
