import yaml
from pathlib import Path
from dataclasses import dataclass
from typing import Any

@dataclass
class EvalResult:
    process_code: str
    status_correct: bool
    gap_recall: float
    gap_precision: float
    citation_validity: float

def load_gold(gold_path: Path) -> list[dict[str, Any]]:
    content = gold_path.read_text(encoding="utf-8")
    parsed = yaml.safe_load(content)
    return parsed.get("cases", [])

def evaluate_case(
    gold_case: dict[str, Any],
    actual_findings: list[dict[str, Any]],
    actual_status: str,
    retrieved_node_ids: set[int],
) -> EvalResult:
    expected_keys = {g["finding_key"] for g in gold_case.get("expected_gaps", [])}
    actual_keys = {f["finding_key"] for f in actual_findings if "finding_key" in f}

    recall = len(expected_keys & actual_keys) / len(expected_keys) if expected_keys else 1.0
    precision = len(expected_keys & actual_keys) / len(actual_keys) if actual_keys else 1.0

    # Citation validity: all node_ids in actual findings must be in retrieved set
    all_node_ids = [
        c["node_id"]
        for f in actual_findings
        for c in f.get("citations", [])
        if isinstance(c, dict) and "node_id" in c
    ]
    valid_citations = sum(1 for nid in all_node_ids if nid in retrieved_node_ids)
    citation_validity = valid_citations / len(all_node_ids) if all_node_ids else 1.0

    return EvalResult(
        process_code=gold_case.get("process_code", "UNKNOWN"),
        status_correct=(actual_status == gold_case.get("expected_status", "")),
        gap_recall=recall,
        gap_precision=precision,
        citation_validity=citation_validity,
    )

def write_evaluation_report(results: list[EvalResult], output_path: Path) -> None:
    lines = ["# ASCEND Evaluation Report\n\n"]
    lines.append("| Process | Status Correct | Gap Recall | Gap Precision | Citation Validity |\n")
    lines.append("|---------|----------------|------------|---------------|-------------------|\n")
    for r in results:
        status_icon = "✅" if r.status_correct else "❌"
        lines.append(
            f"| {r.process_code} | {status_icon} | {r.gap_recall:.0%} | {r.gap_precision:.0%} | {r.citation_validity:.0%} |\n"
        )
    avg_recall = sum(r.gap_recall for r in results) / len(results) if results else 0.0
    avg_citation = sum(r.citation_validity for r in results) / len(results) if results else 0.0
    lines.append(f"\n**Average Gap Recall:** {avg_recall:.0%}  \n")
    lines.append(f"**Average Citation Validity:** {avg_citation:.0%}  \n")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("".join(lines), encoding="utf-8")
