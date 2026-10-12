from pathlib import Path
from app.ingestion.eval_runner import evaluate_case, load_gold

GOLD = next(
    (p for cand in [Path("/app"), *Path(__file__).resolve().parents]
     for p in [cand / "data/eval/gold.yaml", cand / "ascend/data/eval/gold.yaml"]
     if p.exists()),
    Path("data/eval/gold.yaml"),
).resolve()

def test_gold_yaml_loads():
    assert GOLD.exists(), f"gold.yaml should exist at {GOLD}"
    cases = load_gold(GOLD)
    assert len(cases) >= 1
    assert cases[0]["process_code"] == "BGF-001"

def test_evaluate_case_perfect_match():
    gold_case = {
        "process_code": "BGF-001",
        "expected_status": "PARTIALLY_COMPLIANT",
        "expected_gaps": [
            {"finding_key": "MISS_001"},
            {"finding_key": "MISS_002"},
        ],
    }
    actual_findings = [
        {"finding_key": "MISS_001", "citations": [{"node_id": 10}]},
        {"finding_key": "MISS_002", "citations": [{"node_id": 11}]},
    ]
    result = evaluate_case(
        gold_case,
        actual_findings,
        "PARTIALLY_COMPLIANT",
        retrieved_node_ids={10, 11},
    )
    assert result.status_correct is True
    assert result.gap_recall == 1.0
    assert result.gap_precision == 1.0
    assert result.citation_validity == 1.0

def test_evaluate_case_citation_violation():
    gold_case = {
        "process_code": "TEST",
        "expected_status": "COMPLIANT",
        "expected_gaps": [],
    }
    actual_findings = [{"finding_key": "F1", "citations": [{"node_id": 999}]}]
    result = evaluate_case(
        gold_case,
        actual_findings,
        "COMPLIANT",
        retrieved_node_ids={10},
    )
    assert result.citation_validity == 0.0  # node_id 999 not in retrieved set
