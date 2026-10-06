# ascend/backend/app/tests/test_workflow.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.agents.schemas import (
    ResearchOutput, GapAnalysis, ComplianceStatus,
    CorrectiveAction, MissingKPI, ReviewDecision,
    Finding, Citation, RelevantSection,
)


def make_citation(node_id=1):
    return Citation(law_code="SYNTH", article_no="5", node_id=node_id)


def make_research_output():
    return ResearchOutput(relevant_sections=[
        RelevantSection(
            node_id=1, law_code="SYNTH", article_no="5",
            path_text="SYNTH > Ch.2 > Art.5", text="SFC must endorse circular.",
            why_relevant="Process issues a circular.", key_obligation="SFC endorsement required.",
            citations=[make_citation(1)]
        )
    ])


def make_gap_analysis():
    return GapAnalysis(
        missing_steps=[Finding(
            finding_key="MISS_001", text="No SFC step.", severity="high",
            citations=[make_citation(1)], kind="missing_step"
        )]
    )


@pytest.mark.asyncio
async def test_workflow_produces_all_5_parts():
    """Run the workflow with mocked agents and verify all 5 report parts are produced."""
    from app.providers.fake_providers import FakeLLMProvider, FakeEmbeddingProvider, FakeRerankProvider
    from app.workflow.graph import run_analysis
    import app.agents.research as research_mod
    import app.agents.gap_analysis as gap_mod
    import app.agents.compliance_status as status_mod
    import app.agents.corrective_action as action_mod
    import app.agents.missing_kpi as kpi_mod
    import app.agents.review as review_mod

    research_mod.run_research = AsyncMock(return_value=make_research_output())
    gap_mod.run_gap_analysis = AsyncMock(return_value=make_gap_analysis())
    status_mod.run_compliance_status = AsyncMock(return_value=ComplianceStatus(
        status="NON_COMPLIANT", justification="High severity gap.", high_severity_count=1
    ))
    action_mod.run_corrective_action = AsyncMock(return_value=[CorrectiveAction(
        action_key="ACT_001", addresses_finding_key="MISS_001",
        citation=make_citation(1), steps=["Step 1", "Step 2"],
        owner_suggestion="Finance Dept", priority="immediate"
    )])
    kpi_mod.run_missing_kpi = AsyncMock(return_value=[MissingKPI(
        name="SFC Endorsement Rate", definition="% circulars with SFC endorsement.",
        formula="endorsed / total * 100", target="100%", frequency="annual",
        data_source="Circular register", rationale="Tracks compliance with Art.5",
        linked_finding_keys=["MISS_001"]
    )])
    review_mod.run_review = AsyncMock(return_value=ReviewDecision(decision="approve"))

    mock_session = MagicMock()
    mock_session.add = MagicMock()
    mock_session.flush = AsyncMock(return_value=None)
    mock_session.commit = AsyncMock(return_value=None)
    mock_session.execute = AsyncMock(return_value=MagicMock())
    mock_session.scalars = AsyncMock(return_value=MagicMock(all=lambda: []))

    report = await run_analysis(
        analysis_id=1,
        process_name="Design Budgetary Guidelines",
        activities=["Issue budget circular."],
        session=mock_session,
        llm=FakeLLMProvider(),
        fast_llm=FakeLLMProvider(),
        embedding=FakeEmbeddingProvider(),
        reranker=FakeRerankProvider(),
    )

    assert report.compliance_status is not None
    assert report.compliance_status.status == "NON_COMPLIANT"
    assert len(report.relevant_sections) == 1
    assert len(report.gap_analysis.missing_steps) == 1
    assert len(report.corrective_actions) == 1
    assert len(report.missing_kpis) == 1
