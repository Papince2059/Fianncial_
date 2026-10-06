# ascend/backend/app/agents/gap_analysis.py
from app.agents.base_agent import load_prompt, call_with_schema, wrap_process
from app.agents.schemas import GapAnalysis, ResearchOutput
from app.agents.validators import validate_citations
from app.providers.base import LLMProvider


async def run_gap_analysis(
    llm: LLMProvider,
    process_name: str,
    activities: list[str],
    research_output: ResearchOutput,
) -> GapAnalysis:
    prompt = load_prompt("gap_analysis_v1")
    retrieved_node_ids = {c.node_id for s in research_output.relevant_sections for c in s.citations}

    sections_text = "\n\n".join(
        f"[node_id={s.node_id}] [{s.path_text}]\nObligation: {s.key_obligation}\n{s.text}"
        for s in research_output.relevant_sections
    )
    user_content = (
        f"{wrap_process(process_name, activities)}\n\n"
        f"Relevant Law Sections:\n{sections_text}"
    )

    output: GapAnalysis = await call_with_schema(llm, prompt, user_content, GapAnalysis)

    all_findings = output.missing_steps + output.deviations + output.risks
    valid, _ = validate_citations(all_findings, retrieved_node_ids)
    valid_keys = {f.finding_key for f in valid}

    return GapAnalysis(
        missing_steps=[f for f in output.missing_steps if f.finding_key in valid_keys],
        deviations=[f for f in output.deviations if f.finding_key in valid_keys],
        risks=[f for f in output.risks if f.finding_key in valid_keys],
    )
