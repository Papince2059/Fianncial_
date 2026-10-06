# ascend/backend/app/tests/test_schemas.py
from app.agents.schemas import Finding, Citation, ComplianceStatus


def test_finding_requires_citation():
    f = Finding(
        finding_key="MISS_001",
        text="Missing SFC approval",
        citations=[Citation(law_code="LAW_1", article_no="5", node_id=42)],
        severity="high",
        kind="missing_step",
    )
    assert f.finding_key == "MISS_001"
    assert len(f.citations) == 1


def test_compliance_status_valid_values():
    for status in ("COMPLIANT", "PARTIALLY_COMPLIANT", "NON_COMPLIANT"):
        cs = ComplianceStatus(status=status, justification="test")
        assert cs.status == status
