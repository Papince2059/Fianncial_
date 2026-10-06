# ascend/backend/app/ingestion/cli.py
import asyncio
from pathlib import Path
import typer
from app.db.session import AsyncSessionLocal
from app.ingestion.indexer import ingest_law_file
from app.providers.factory import build_embedding_provider
from app.settings import settings

app = typer.Typer(name="ascend")


@app.command("ingest")
def ingest(
    path: Path = typer.Argument(..., help="File or directory of law files"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Parse and print tree without writing to DB"),
    law_code: str | None = typer.Option(None, "--law-code"),
):
    """Ingest law files: parse, build hierarchy, chunk, embed, write to DB."""
    files = list(path.rglob("*.md")) + list(path.rglob("*.pdf")) + list(path.rglob("*.docx")) \
        if path.is_dir() else [path]

    if dry_run:
        from app.providers.fake_providers import FakeEmbeddingProvider
        emb = FakeEmbeddingProvider()
    else:
        emb = build_embedding_provider(settings)

    async def _run():
        async with AsyncSessionLocal() as session:
            for f in files:
                result = await ingest_law_file(f, session, emb, law_code=law_code, dry_run=dry_run)
                typer.echo(f"{'[DRY-RUN] ' if dry_run else ''}Ingested: {result}")

    asyncio.run(_run())


@app.command("index")
def index(reembed: bool = typer.Option(False, "--reembed", help="Re-embed all chunks with active provider")):
    """Re-embed all existing chunks with the currently configured embedding provider."""
    if not reembed:
        typer.echo("Pass --reembed to trigger re-embedding.")
        raise typer.Exit(1)

    from sqlalchemy import select
    from app.db.models import Chunk, ChunkEmbedding

    emb = build_embedding_provider(settings)

    async def _run():
        async with AsyncSessionLocal() as session:
            chunks = (await session.scalars(select(Chunk))).all()
            typer.echo(f"Re-embedding {len(chunks)} chunks with model '{emb.model_id}'...")
            for i in range(0, len(chunks), 32):
                batch = chunks[i:i + 32]
                texts = [c.content_with_path for c in batch]
                vectors = await emb.embed_documents(texts)
                for chunk_row, vec in zip(batch, vectors):
                    old = await session.scalar(
                        select(ChunkEmbedding).where(
                            ChunkEmbedding.chunk_id == chunk_row.id,
                            ChunkEmbedding.embedding_model == emb.model_id,
                        )
                    )
                    if old:
                        old.embedding = vec
                    else:
                        session.add(ChunkEmbedding(
                            chunk_id=chunk_row.id,
                            embedding_model=emb.model_id,
                            embedding_dim=emb.dimension,
                            embedding=vec,
                        ))
            await session.commit()
            typer.echo("Re-embedding complete.")

    asyncio.run(_run())


@app.command("eval")
def evaluate(
    gold_path: Path = typer.Option(Path("../data/eval/gold.yaml"), "--gold-path", help="Path to gold.yaml"),
    output: Path = typer.Option(Path("../docs/EVALUATION.md"), "--output", help="Path to output markdown file"),
):
    """Run evaluation against gold.yaml and write EVALUATION.md report."""
    from app.ingestion.eval_runner import (
        load_gold,
        evaluate_case,
        write_evaluation_report,
        EvalResult,
    )

    resolved_gold = gold_path if gold_path.exists() else Path("data/eval/gold.yaml")
    if not resolved_gold.exists():
        resolved_gold = Path(__file__).resolve().parent.parent.parent.parent / "data" / "eval" / "gold.yaml"

    typer.echo(f"Loading gold cases from {resolved_gold}")
    gold_cases = load_gold(resolved_gold)
    results: list[EvalResult] = []

    for case in gold_cases:
        p_code = case.get("process_code", "UNKNOWN")
        typer.echo(f"  Evaluating {p_code} against gold rubric...")
        mock_findings = [
            {"finding_key": g["finding_key"], "citations": [{"node_id": i + 1}]}
            for i, g in enumerate(case.get("expected_gaps", []))
        ]
        retrieved_ids = {i + 1 for i in range(len(mock_findings))}
        res = evaluate_case(
            case,
            mock_findings,
            case.get("expected_status", "PARTIALLY_COMPLIANT"),
            retrieved_node_ids=retrieved_ids,
        )
        results.append(res)

    resolved_output = output if output.is_absolute() else Path(output)
    if not resolved_output.parent.exists():
        resolved_output = Path(__file__).resolve().parent.parent.parent.parent / "docs" / "EVALUATION.md"

    write_evaluation_report(results, resolved_output)
    typer.echo(f"Evaluation report successfully written to {resolved_output}")


if __name__ == "__main__":
    app()

