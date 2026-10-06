# ascend/backend/app/tests/test_agents.py
import pytest
from app.providers.fake_providers import FakeLLMProvider
from app.retrieval.service import RetrievedArticle
from app.agents.schemas import ResearchOutput, RelevantSection, Citation, GapAnalysis, Finding, CorrectiveAction
from app.agents.research import run_research
from app.agents.gap_analysis import run_gap_analysis
from app.agents.compliance_status import run_compliance_status
from app.agents.corrective_action import run_corrective_action
from app.agents.missing_kpi import run_missing_kpi
from app.agents.review import run_review


@pytest.mark.asyncio
async def test_run_research_with_fake_llm():
    llm = FakeLLMProvider()
    articles = [
        RetrievedArticle(
            node_id=1,
            law_code="SYNTH_PFL_001",
            article_no="5",
            path_text="SYNTH_PFL_001 > Ch.2 > Art.5",
            text="Article 5 text",
            definitions=[],
            score=0.9,
        )
    ]
    res = await run_research(llm, "Design Budget", ["Develop calendar"], articles)
    assert isinstance(res, ResearchOutput)


@pytest.mark.asyncio
async def test_run_gap_analysis_with_fake_llm():
    llm = FakeLLMProvider()
    research_out = ResearchOutput(
        relevant_sections=[
            RelevantSection(
                node_id=1,
                law_code="SYNTH_PFL_001",
                article_no="5",
                path_text="SYNTH_PFL_001 > Ch.2 > Art.5",
                text="Text",
                why_relevant="Relevant",
                key_obligation="Obligation",
                citations=[Citation(law_code="SYNTH_PFL_001", article_no="5", node_id=1)],
            )
        ]
    )
    res = await run_gap_analysis(llm, "Design Budget", ["Develop calendar"], research_out)
    assert isinstance(res, GapAnalysis)


@pytest.mark.asyncio
async def test_run_compliance_status_with_fake_llm():
    llm = FakeLLMProvider()
    gaps = GapAnalysis(
        missing_steps=[
            Finding(
                finding_key="MISS_001",
                text="Missing step",
                citations=[Citation(law_code="SYNTH_PFL_001", article_no="5", node_id=1)],
                severity="high",
                kind="missing_step",
            )
        ]
    )
    status = await run_compliance_status(llm, gaps)
    assert status.status == "NON_COMPLIANT"
    assert status.high_severity_count == 1


@pytest.mark.asyncio
async def test_run_review_with_fake_llm():
    llm = FakeLLMProvider()
    decision = await run_review(llm, "content")
    assert decision.decision in ("approve", "revise")
