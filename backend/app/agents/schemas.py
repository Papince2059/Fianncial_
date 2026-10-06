# ascend/backend/app/agents/schemas.py
from typing import Literal
from pydantic import BaseModel, Field


class Citation(BaseModel):
    law_code: str
    article_no: str
    node_id: int


class RelevantSection(BaseModel):
    node_id: int
    law_code: str
    article_no: str
    path_text: str
    text: str
    why_relevant: str
    key_obligation: str
    citations: list[Citation]


class ResearchOutput(BaseModel):
    relevant_sections: list[RelevantSection] = Field(default_factory=list)


class Finding(BaseModel):
    finding_key: str                        # e.g. "MISS_001"
    text: str
    citations: list[Citation]
    severity: Literal["low", "medium", "high"]
    kind: Literal["missing_step", "deviation", "risk"] = "missing_step"


class GapAnalysis(BaseModel):
    missing_steps: list[Finding] = Field(default_factory=list)
    deviations: list[Finding] = Field(default_factory=list)
    risks: list[Finding] = Field(default_factory=list)


class ComplianceStatus(BaseModel):
    status: Literal["COMPLIANT", "PARTIALLY_COMPLIANT", "NON_COMPLIANT"]
    justification: str
    high_severity_count: int = 0
    medium_severity_count: int = 0
    low_severity_count: int = 0


class CorrectiveAction(BaseModel):
    action_key: str
    addresses_finding_key: str
    citation: Citation
    steps: list[str]
    owner_suggestion: str
    priority: Literal["immediate", "short_term", "medium_term"]


class MissingKPI(BaseModel):
    name: str
    definition: str
    formula: str
    target: str
    frequency: Literal["daily", "weekly", "monthly", "quarterly", "annual"]
    data_source: str
    rationale: str
    linked_finding_keys: list[str]


class ReviewDecision(BaseModel):
    decision: Literal["approve", "revise"]
    notes: str = ""


class WorkflowReport(BaseModel):
    relevant_sections: list[RelevantSection] = Field(default_factory=list)
    gap_analysis: GapAnalysis = Field(default_factory=GapAnalysis)
    compliance_status: ComplianceStatus | None = None
    corrective_actions: list[CorrectiveAction] = Field(default_factory=list)
    missing_kpis: list[MissingKPI] = Field(default_factory=list)
