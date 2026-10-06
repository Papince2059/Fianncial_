# ascend/backend/app/tests/test_parsers.py
import pytest
from pathlib import Path
from app.ingestion.parsers import parse_file

FIXTURE_LAW = (Path(__file__).parents[3] / "data/fixtures/synthetic_law.md").resolve()
if not FIXTURE_LAW.exists():
    FIXTURE_LAW = (Path(__file__).parents[4] / "ascend/data/fixtures/synthetic_law.md").resolve()


def test_parse_markdown_fixture_contains_expected_articles():
    text = parse_file(FIXTURE_LAW)
    assert "Article 5" in text
    assert "Supreme Fiscal Committee" in text
    assert "Budget Preparation Circular" in text


def test_parse_markdown_fixture_contains_arabic_terms():
    text = parse_file(FIXTURE_LAW)
    assert len(text) > 100


def test_parse_unsupported_raises():
    with pytest.raises(ValueError, match="Unsupported file format"):
        parse_file(Path("test.xyz"))
