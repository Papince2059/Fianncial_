# ascend/backend/app/agents/corrective_action.py
from pydantic import BaseModel
from app.agents.base_agent import load_prompt, call_with_schema
from app.agents.schemas import GapAnalysis, CorrectiveAction
from app.agents.validators import validate_actions
from app.providers.base import LLMProvider


class CorrectiveActionsWrapper(BaseModel):
    corrective_actions: list[CorrectiveAction] = []


async def run_corrective_action(llm: LLMProvider, gap_analysis: GapAnalysis) -> list[CorrectiveAction]:
    prompt = load_prompt("corrective_action_v1")
    all_findings = gap_analysis.missing_steps + gap_analysis.deviations + gap_analysis.risks
    valid_keys = {f.finding_key for f in all_findings}

    gaps_text = "\n".join(f"- {f.finding_key} [{f.severity}]: {f.text} (citations: {[c.article_no for c in f.citations]})" for f in all_findings)
    user_content = f"Gap Analysis Findings:\n{gaps_text}"

    output: CorrectiveActionsWrapper = await call_with_schema(llm, prompt, user_content, CorrectiveActionsWrapper)  # type: ignore[assignment]
    valid, _ = validate_actions(output.corrective_actions, valid_keys)
    return valid
