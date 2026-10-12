# ascend/backend/app/tests/test_chunker.py
import pytest
from pathlib import Path
from app.ingestion.parsers import parse_file
from app.ingestion.hierarchy import build_hierarchy
from app.ingestion.chunker import chunk_law

FIXTURE_LAW = next(
    (p for cand in [Path("/app"), *Path(__file__).resolve().parents]
     for p in [cand / "data/fixtures/synthetic_law.md", cand / "ascend/data/fixtures/synthetic_law.md"]
     if p.exists()),
    Path("data/fixtures/synthetic_law.md"),
).resolve()


@pytest.fixture
def chunks():
    text = parse_file(FIXTURE_LAW)
    tree = build_hierarchy(text, "SYNTH_PFL_001", "Public Finance Law of Testland")
    return chunk_law(tree, max_tokens=512)


def test_produces_chunks(chunks):
    assert len(chunks) >= 10  # fixture has 15 articles


def test_chunks_have_breadcrumb(chunks):
    for c in chunks:
        assert c.content_with_path.startswith("[SYNTH_PFL_001"), f"Missing breadcrumb: {c.content_with_path[:60]}"


def test_article_5_chunk_contains_sfc(chunks):
    art5 = next((c for c in chunks if "Art.5" in c.node_path), None)
    assert art5 is not None, "Article 5 chunk not found"
    assert "Supreme Fiscal Committee" in art5.content or "SFC" in art5.content


def test_no_empty_chunks(chunks):
    for c in chunks:
        assert c.content.strip(), f"Empty chunk: {c.node_path}"


def test_all_chunks_have_token_estimate(chunks):
    for c in chunks:
        assert c.token_estimate > 0
