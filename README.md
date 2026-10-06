# ASCEND — AI-Assisted Compliance Automation for Laws & Regulations

> Built by Capgemini × Dubai DOF. Multi-agent LangGraph + hierarchical RAG compliance platform.

## Quick Start

```bash
cp .env.example .env
# Fill in your Vertex AI credentials in .env
docker compose up postgres -d
cd backend && pip install -e . && alembic upgrade head
ascend ingest data/fixtures/synthetic_law.md
uvicorn app.main:app --reload
```

## On-Prem Switch

Change only `.env` — set `LLM_PROVIDER=openai_compat`, `EMBEDDING_PROVIDER=local`, `RERANK_PROVIDER=local`. See `docs/ONPREM_MIGRATION.md`.

## Structure

```
ascend/
├── backend/          # FastAPI + LangGraph + providers
├── frontend/         # React + Vite + Tailwind + react-i18next
├── data/
│   ├── laws/         # User-supplied law files (gitignored)
│   ├── fixtures/     # Synthetic test law (committed)
│   ├── processes/    # Process catalog YAML
│   └── eval/         # Gold evaluation cases
├── docs/             # DECISIONS.md, ONPREM_MIGRATION.md, EVALUATION.md
├── docker-compose.yml
├── .env.example
└── config.yaml
```

## Disclaimer

AI-assisted output requires qualified human review and is not legal advice.
