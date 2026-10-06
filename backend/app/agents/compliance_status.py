# ascend/backend/app/agents/compliance_status.py
from app.agents.base_agent import load_prompt, call_with_schema
from app.agents.schemas import ComplianceStatus, GapAnalysis
from app.agents.validators import compute_compliance_rubric
from app.providers.base import LLMProvider


async def run_compliance_status(llm: LLMProvider, gap_analysis: GapAnalysis) -> ComplianceStatus:
    prompt = load_prompt("compliance_status_v1")
    forced_status = compute_compliance_rubric(gap_analysis)

    all_findings = gap_analysis.missing_steps + gap_analysis.deviations + gap_analysis.risks
    gap_text = "\n".join(
        f"- [{f.severity.upper()}] {f.finding_key}: {f.text}" for f in all_findings
    ) or "No gaps identified."
    user_content = f"Gap Analysis:\n{gap_text}\n\nNote: The status has been pre-determined as {forced_status} based on severity rubric. Provide justification only."

    output: ComplianceStatus = await call_with_schema(llm, prompt, user_content, ComplianceStatus)

    # Enforce rubric in code
    all_findings_list = gap_analysis.missing_steps + gap_analysis.deviations + gap_analysis.risks
    return ComplianceStatus(
        status=forced_status,  # type: ignore[arg-type]
        justification=output.justification,
        high_severity_count=sum(1 for f in all_findings_list if f.severity == "high"),
        medium_severity_count=sum(1 for f in all_findings_list if f.severity == "medium"),
        low_severity_count=sum(1 for f in all_findings_list if f.severity == "low"),
    )
