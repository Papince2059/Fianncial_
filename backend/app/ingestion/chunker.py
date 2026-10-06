# ascend/backend/app/ingestion/chunker.py
from dataclasses import dataclass
from app.ingestion.hierarchy import LawTree, LawTreeNode


@dataclass
class ChunkRecord:
    law_code: str
    article_number: str
    node_path: str          # unique key for upsert
    content: str
    content_with_path: str  # breadcrumb + content — embedded
    token_estimate: int


def chunk_law(tree: LawTree, max_tokens: int = 512) -> list[ChunkRecord]:
    """Produce one chunk per article (or sub-clause if article exceeds max_tokens)."""
    chunks: list[ChunkRecord] = []
    for ch in tree.root.children:
        for art in ch.children:
            _chunk_article(tree.law_code, art, chunks, max_tokens)
    return chunks


def _chunk_article(law_code: str, art: LawTreeNode, out: list[ChunkRecord], max_tokens: int) -> None:
    full_text = f"{art.title}\n\n{art.text}".strip() if art.title else art.text.strip()
    tokens = _estimate_tokens(full_text)
    heading = f"[{art.path_text}]"
    content_with_path = f"{heading}\n{full_text}"

    if tokens <= max_tokens or not art.children:
        out.append(ChunkRecord(
            law_code=law_code,
            article_number=art.number,
            node_path=art.path_text,
            content=full_text,
            content_with_path=content_with_path,
            token_estimate=tokens,
        ))
        return

    # Split by sub-clause children — keep heading on each part
    for clause in art.children:
        clause_text = f"{art.title} — {clause.title}\n\n{clause.text}".strip()
        out.append(ChunkRecord(
            law_code=law_code,
            article_number=f"{art.number}.{clause.number}",
            node_path=clause.path_text,
            content=clause_text,
            content_with_path=f"{heading}\n{clause_text}",
            token_estimate=_estimate_tokens(clause_text),
        ))


def _estimate_tokens(text: str) -> int:
    """Rough estimate: 1 token ≈ 4 characters."""
    return max(1, len(text) // 4)
