# ascend/backend/app/workflow/graph.py
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update as sql_update
from app.db.models import Analysis, ReportSection, Finding as FindingModel
from app.workflow.state import WorkflowState
from app.workflow.events import emit_event
from app.agents.schemas import WorkflowReport
from app.agents import research, gap_analysis, compliance_status, corrective_action, missing_kpi, review
from app.providers.base import LLMProvider, EmbeddingProvider, RerankProvider
from app.retrieval.service import retrieve


async def run_analysis(
    analysis_id: int,
    process_name: str,
    activities: list[str],
    session: AsyncSession,
    llm: LLMProvider,
    fast_llm: LLMProvider,
    embedding: EmbeddingProvider,
    reranker: RerankProvider | None,
) -> WorkflowReport:
    state = WorkflowState(analysis_id=analysis_id, process_name=process_name, activities=activities)
    seq = 0

    async def emit(event_type, agent=None, payload=None):
        nonlocal seq
        seq = await emit_event(analysis_id, seq, event_type, session, agent=agent, payload=payload)

    await emit("agent_state", agent="research", payload={"state": "running"})

    # 1. Retrieve articles for all activities
    all_articles: dict[int, object] = {}
    for act in activities:
        await emit("tool_call", agent="research", payload={"tool": "search_documents", "query": act})
        hits = await retrieve(act, session, embedding, reranker)
        for h in hits:
            all_articles[h.node_id] = h
    state.retrieved_articles = list(all_articles.values())  # type: ignore[arg-type]
    await emit("tool_call", agent="research", payload={"tool": "record_notes", "count": len(state.retrieved_articles)})

    # 2. Research agent
    state.research_output = await research.run_research(llm, process_name, activities, state.retrieved_articles)
    await emit("agent_state", agent="research", payload={"state": "done"})

    # Review
    review_result = await review.run_review(fast_llm, state.research_output.model_dump_json())
    if review_result.decision == "revise":
        state.research_output = await research.run_research(llm, process_name, activities, state.retrieved_articles)

    await emit("agent_switch", payload={"from": "research", "to": "gap_analysis"})
    await emit("agent_state", agent="gap_analysis", payload={"state": "running"})

    # 3. Gap analysis
    state.gap_analysis = await gap_analysis.run_gap_analysis(llm, process_name, activities, state.research_output)
    await emit("agent_state", agent="gap_analysis", payload={"state": "done"})

    review_result = await review.run_review(fast_llm, state.gap_analysis.model_dump_json())
    if review_result.decision == "revise":
        state.gap_analysis = await gap_analysis.run_gap_analysis(llm, process_name, activities, state.research_output)

    await emit("agent_switch", payload={"from": "gap_analysis", "to": "compliance_status"})
    await emit("agent_state", agent="compliance_status", payload={"state": "running"})

    # 4. Compliance status
    state.compliance_status = await compliance_status.run_compliance_status(llm, state.gap_analysis)
    await emit("agent_state", agent="compliance_status", payload={"state": "done"})
    await emit("section_complete", payload={"part": 3, "status": state.compliance_status.status})

    await emit("agent_switch", payload={"from": "compliance_status", "to": "corrective_action"})
    await emit("agent_state", agent="corrective_action", payload={"state": "running"})

    # 5. Corrective actions
    state.corrective_actions = await corrective_action.run_corrective_action(llm, state.gap_analysis)
    await emit("agent_state", agent="corrective_action", payload={"state": "done"})

    await emit("agent_switch", payload={"from": "corrective_action", "to": "missing_kpi"})
    await emit("agent_state", agent="missing_kpi", payload={"state": "running"})

    # 6. Missing KPIs
    state.missing_kpis = await missing_kpi.run_missing_kpi(llm, state.gap_analysis, state.corrective_actions)
    await emit("agent_state", agent="missing_kpi", payload={"state": "done"})

    # 7. Assemble report & persist
    report = WorkflowReport(
        relevant_sections=state.research_output.relevant_sections,
        gap_analysis=state.gap_analysis,
        compliance_status=state.compliance_status,
        corrective_actions=state.corrective_actions,
        missing_kpis=state.missing_kpis,
    )

    await _persist_report(analysis_id, report, session)
    await emit("done", payload={"analysis_id": analysis_id})

    await session.execute(
        sql_update(Analysis).where(Analysis.id == analysis_id).values(
            status="done", finished_at=datetime.now(timezone.utc)
        )
    )
    await session.commit()
    return report


async def _persist_report(analysis_id: int, report: WorkflowReport, session: AsyncSession):
    """Write the 5 report sections to DB."""
    parts = [
        (1, {"relevant_sections": [s.model_dump() for s in report.relevant_sections]}),
        (2, report.gap_analysis.model_dump() if report.gap_analysis else {}),
        (3, report.compliance_status.model_dump() if report.compliance_status else {}),
        (4, {"corrective_actions": [a.model_dump() for a in report.corrective_actions]}),
        (5, {"missing_kpis": [k.model_dump() for k in report.missing_kpis]}),
    ]
    for part_no, content in parts:
        session.add(ReportSection(analysis_id=analysis_id, part_no=part_no, content=content))

    # Persist individual findings for feedback
    all_findings = (
        report.gap_analysis.missing_steps + report.gap_analysis.deviations + report.gap_analysis.risks
        if report.gap_analysis else []
    )
    for f in all_findings:
        session.add(FindingModel(
            analysis_id=analysis_id,
            part_no=2,
            finding_key=f.finding_key,
            kind=f.kind,
            text=f.text,
            citations=[c.model_dump() for c in f.citations],
        ))
    await session.flush()
