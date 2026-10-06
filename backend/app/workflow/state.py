# ascend/backend/app/workflow/state.py
from dataclasses import dataclass, field
from app.agents.schemas import (
    ResearchOutput, GapAnalysis, ComplianceStatus,
    CorrectiveAction, MissingKPI, WorkflowReport,
)
from app.retrieval.service import RetrievedArticle


@dataclass
class WorkflowState:
    analysis_id: int
    process_name: str
    activities: list[str]
    retrieved_articles: list[RetrievedArticle] = field(default_factory=list)
    research_output: ResearchOutput | None = None
    gap_analysis: GapAnalysis | None = None
    compliance_status: ComplianceStatus | None = None
    corrective_actions: list[CorrectiveAction] = field(default_factory=list)
    missing_kpis: list[MissingKPI] = field(default_factory=list)
    event_seq: int = 0
    errors: list[str] = field(default_factory=list)
