# ascend/backend/app/tests/test_citation_validator.py
from app.agents.schemas import Finding, Citation, GapAnalysis
from app.agents.validators import validate_citations, compute_compliance_rubric


def make_finding(key: str, node_ids: list[int], severity: str = "high") -> Finding:
    return Finding(
        finding_key=key,
        text="test",
        citations=[Citation(law_code="L", article_no="1", node_id=nid) for nid in node_ids],
        severity=severity,  # type: ignore[arg-type]
        kind="missing_step",
    )


def test_validator_accepts_valid_node_ids():
    findings = [make_finding("F1", [10, 20])]
    valid, rejected = validate_citations(findings, retrieved_node_ids={10, 20, 30})
    assert len(valid) == 1
    assert len(rejected) == 0


def test_validator_rejects_unknown_node_ids():
    findings = [make_finding("F1", [99])]
    valid, rejected = validate_citations(findings, retrieved_node_ids={10, 20})
    assert len(valid) == 0
    assert len(rejected) == 1


def test_rubric_non_compliant_on_high_severity():
    gaps = GapAnalysis(missing_steps=[make_finding("F1", [1], severity="high")])
    assert compute_compliance_rubric(gaps) == "NON_COMPLIANT"


def test_rubric_partially_compliant_on_medium():
    gaps = GapAnalysis(missing_steps=[make_finding("F1", [1], severity="medium")])
    assert compute_compliance_rubric(gaps) == "PARTIALLY_COMPLIANT"


def test_rubric_compliant_on_no_gaps():
    gaps = GapAnalysis()
    assert compute_compliance_rubric(gaps) == "COMPLIANT"
