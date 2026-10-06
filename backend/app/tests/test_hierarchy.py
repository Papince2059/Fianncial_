# ascend/backend/app/tests/test_hierarchy.py
import pytest
from pathlib import Path
from app.ingestion.parsers import parse_file
from app.ingestion.hierarchy import build_hierarchy, extract_definitions

FIXTURE_LAW = (Path(__file__).parents[3] / "data/fixtures/synthetic_law.md").resolve()
if not FIXTURE_LAW.exists():
    FIXTURE_LAW = (Path(__file__).parents[4] / "ascend/data/fixtures/synthetic_law.md").resolve()


@pytest.fixture
def law_tree():
    text = parse_file(FIXTURE_LAW)
    return build_hierarchy(text, law_code="SYNTH_PFL_001", title="Public Finance Law of Testland")


def test_hierarchy_has_three_chapters(law_tree):
    assert len(law_tree.root.children) == 3


def test_chapter_one_is_definitions(law_tree):
    ch1 = law_tree.root.children[0]
    assert "Definition" in ch1.title or "definition" in ch1.title.lower()


def test_chapter_two_has_articles(law_tree):
    ch2 = law_tree.root.children[1]
    assert len(ch2.children) >= 5  # Articles 3–10


def test_article_5_mentions_sfc(law_tree):
    ch2 = law_tree.root.children[1]
    article_5 = next((a for a in ch2.children if a.number == "5"), None)
    assert article_5 is not None
    assert "Supreme Fiscal Committee" in article_5.text or "SFC" in article_5.text


def test_path_text_format(law_tree):
    ch2 = law_tree.root.children[1]
    art = ch2.children[0]
    assert "SYNTH_PFL_001" in art.path_text
    assert "Ch." in art.path_text
    assert "Art." in art.path_text


def test_extract_definitions_finds_terms(law_tree):
    defs = extract_definitions(law_tree)
    terms = [d["term"] for d in defs]
    assert "Fiscal Authority" in terms
    assert "Budget Circular" in terms
    assert "Supreme Fiscal Committee (SFC)" in terms or "Supreme Fiscal Committee" in terms
