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


if __name__ == "__main__":
    app()
