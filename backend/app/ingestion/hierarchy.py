# ascend/backend/app/ingestion/hierarchy.py
from __future__ import annotations
import re
from dataclasses import dataclass, field

# Regex patterns for English and Arabic headings
_EN_CHAPTER   = re.compile(r"^##\s+Chapter\s+(\d+|[IVXLC]+)[^\n]*", re.IGNORECASE | re.MULTILINE)
_EN_ARTICLE   = re.compile(r"^###\s+Article\s+(\d+)[^\n]*", re.IGNORECASE | re.MULTILINE)
_EN_CLAUSE    = re.compile(r"^####\s+(.+)", re.MULTILINE)
_AR_CHAPTER   = re.compile(r"الفصل\s+(\d+|[\u0660-\u0669]+)", re.MULTILINE)
_AR_ARTICLE   = re.compile(r"المادة\s+\((\d+|[\u0660-\u0669]+)\)", re.MULTILINE)
_ARABIC_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


@dataclass
class LawTreeNode:
    node_type: str          # law | chapter | article | clause
    number: str
    title: str
    text: str
    path_text: str
    ordinal: int
    children: list[LawTreeNode] = field(default_factory=list)


@dataclass
class LawTree:
    law_code: str
    title: str
    root: LawTreeNode


def build_hierarchy(text: str, law_code: str, title: str = "") -> LawTree:
    """
    Parse text into a 3-level tree: law → chapter → article.
    Falls back to treating the whole text as a single article if no structure found.
    """
    root = LawTreeNode(
        node_type="law", number="0", title=title or law_code,
        text="", path_text=law_code, ordinal=0
    )

    # Split on ## Chapter headings (markdown-structured fixture)
    chapter_splits = re.split(r"(?=^##\s+Chapter)", text, flags=re.MULTILINE)
    if len(chapter_splits) <= 1:
        # No chapters found — treat entire text as single article
        root.children.append(LawTreeNode(
            node_type="article", number="1", title=title,
            text=text.strip(), path_text=f"{law_code} > Art.1", ordinal=1
        ))
        return LawTree(law_code=law_code, title=title, root=root)

    for ch_ord, ch_block in enumerate(chapter_splits[1:], start=1):
        ch_lines = ch_block.strip().splitlines()
        ch_heading = ch_lines[0] if ch_lines else f"Chapter {ch_ord}"
        ch_title = re.sub(r"^##\s+Chapter\s+\d+\s*[—–-]?\s*", "", ch_heading).strip()
        ch_number = str(ch_ord)
        ch_path = f"{law_code} > Ch.{ch_number}"
        ch_node = LawTreeNode(
            node_type="chapter", number=ch_number, title=ch_title,
            text="", path_text=ch_path, ordinal=ch_ord
        )

        # Split on ### Article headings within chapter
        art_splits = re.split(r"(?=^###\s+Article)", "\n".join(ch_lines[1:]), flags=re.MULTILINE)
        for art_ord, art_block in enumerate(art_splits, start=1):
            if not art_block.strip():
                continue
            art_lines = art_block.strip().splitlines()
            art_heading = art_lines[0]
            art_match = re.match(r"###\s+Article\s+(\d+)\s*[—–-]?\s*(.*)", art_heading, re.IGNORECASE)
            if art_match:
                art_number = art_match.group(1)
                art_title = art_match.group(2).strip()
            else:
                art_number = str(art_ord)
                art_title = art_heading.lstrip("#").strip()
            art_text = "\n".join(art_lines[1:]).strip()
            art_path = f"{ch_path} > Art.{art_number}"
            art_node = LawTreeNode(
                node_type="article", number=art_number, title=art_title,
                text=art_text, path_text=art_path, ordinal=art_ord
            )
            ch_node.children.append(art_node)

        root.children.append(ch_node)

    return LawTree(law_code=law_code, title=title, root=root)


def extract_definitions(tree: LawTree) -> list[dict]:
    """Find the Definitions article and extract term → definition pairs."""
    definitions = []
    for ch in tree.root.children:
        for art in ch.children:
            if "definition" in art.title.lower() or art.number == "2":
                # Simple extraction: look for "**Term:**" pattern
                for line in art.text.splitlines():
                    match = re.match(r"\s*-\s+\*\*(.+?):\*\*\s+(.+)", line)
                    if match:
                        definitions.append({
                            "term": match.group(1).strip(),
                            "definition_text": match.group(2).strip(),
                            "article_number": art.number,
                        })
    return definitions
