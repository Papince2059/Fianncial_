# ascend/backend/app/agents/validators.py
from app.agents.schemas import Finding, CorrectiveAction, MissingKPI, GapAnalysis


def validate_citations(
    findings: list[Finding],
    retrieved_node_ids: set[int],
) -> tuple[list[Finding], list[Finding]]:
    """
    Split findings into (valid, rejected).
    A finding is valid only if ALL its citation node_ids are in retrieved_node_ids.
    """
    valid, rejected = [], []
    for f in findings:
        if all(c.node_id in retrieved_node_ids for c in f.citations):
            valid.append(f)
        else:
            rejected.append(f)
    return valid, rejected


def validate_actions(
    actions: list[CorrectiveAction],
    valid_finding_keys: set[str],
) -> tuple[list[CorrectiveAction], list[CorrectiveAction]]:
    """Actions must reference a real finding_key."""
    valid, rejected = [], []
    for a in actions:
        if a.addresses_finding_key in valid_finding_keys:
            valid.append(a)
        else:
            rejected.append(a)
    return valid, rejected


def validate_kpis(
    kpis: list[MissingKPI],
    valid_finding_keys: set[str],
) -> tuple[list[MissingKPI], list[MissingKPI]]:
    """KPIs must reference at least one real finding_key."""
    valid, rejected = [], []
    for k in kpis:
        if any(fk in valid_finding_keys for fk in k.linked_finding_keys):
            valid.append(k)
        else:
            rejected.append(k)
    return valid, rejected


def compute_compliance_rubric(gap_analysis: GapAnalysis) -> str:
    """Code-enforced rubric — does not rely on LLM."""
    all_findings = gap_analysis.missing_steps + gap_analysis.deviations + gap_analysis.risks
    if not all_findings:
        return "COMPLIANT"
    high_count = sum(1 for f in all_findings if f.severity == "high")
    if high_count > 0:
        return "NON_COMPLIANT"
    return "PARTIALLY_COMPLIANT"
