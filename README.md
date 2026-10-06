# ASCEND — AI-Assisted Compliance Platform for Financial Laws & Regulations

> Multi-agent hierarchical-RAG compliance intelligence platform cross-referencing government financial processes against Dubai public finance statutory laws, generating cited 5-part compliance audit reports with human-in-the-loop review.

---

## Key Capabilities

1. **Multi-Agent Compliance Network:**
   - **Legal Research Agent:** Hybrid retrieval (pgvector cosine + FTS bm25 with RRF k=60) with statutory context expansion (parent chapters & legal definitions).
   - **Gap Analysis Agent:** Maps financial process steps against statutory obligations, categorizing omissions with strict severity ratings.
   - **Compliance Status Agent:** Article-by-article compliance status assignment (`COMPLIANT`, `NON_COMPLIANT`, `PARTIALLY_COMPLIANT`, `NOT_APPLICABLE`).
   - **Corrective Action Agent:** Actionable remediation plans with clear priority (`P1`, `P2`, `P3`), entity ownership, and timelines.
   - **Missing KPI Agent:** Supervisory control metrics, formula definitions, target thresholds, and audit review frequencies.
   - **Supervisory Review Agent:** Verifies citation grounding against actual statutory nodes and computes final rubric confidence.

2. **Zero-Cloud Switchable Architecture:**
   - Runs today on **Google Cloud Vertex AI** (Gemini 1.5, text-embedding-004, Discovery Engine ranking).
   - Switchable to **100% on-premises** (vLLM / Qwen2.5, BGE-M3, BGE-Reranker) via configuration only, zero code changes outside `providers/`.
   - Guaranteed by automated AST tests (`test_portability.py`).

3. **Bilingual Frontend Interface (English & Arabic RTL):**
   - Built with React 19, TypeScript, Vite, Tailwind CSS, and `react-i18next`.
   - Live SSE event streaming with 6-agent status grid, interactive event log, 5-part report accordion, and human-in-the-loop auditor feedback widget.

---

## Architecture & Project Structure

```
ascend/
├── backend/
│   ├── alembic/              # Database schema migrations
│   ├── app/
│   │   ├── agents/           # 6 specialized agents, schemas, validators, and prompt templates
│   │   ├── api/              # REST & SSE endpoints (laws, processes, analyses, feedback, dashboard)
│   │   ├── db/               # SQLAlchemy models (12 tables) & NullPool session engine
│   │   ├── ingestion/        # Parsers (PDF/DOCX/MD), hierarchy builder, chunker, indexer, eval runner, CLI
│   │   ├── providers/        # Vertex, OpenAI-compatible, Local & Fake providers + factory
│   │   ├── retrieval/        # Hybrid search (pgvector + FTS + RRF) & context expansion
│   │   ├── workflow/         # Multi-agent execution graph & event streamer
│   │   ├── main.py           # FastAPI application entrypoint
│   │   ├── settings.py       # Pydantic Settings & YAML loader
│   │   └── tests/            # 47 unit & integration tests
│   └── pyproject.toml        # Backend dependencies & tools
├── frontend/
│   ├── src/
│   │   ├── api/              # API client with EventSource SSE streaming
│   │   ├── components/       # Navbar, AgentGrid, EventLog, ReportAccordion, FeedbackWidget
│   │   ├── pages/            # Dashboard, Processes, Laws, Analyses, NewAnalysis, AnalysisDetail
│   │   ├── i18n/             # English and Arabic dictionaries with RTL dynamic direction
│   │   └── types/            # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts
├── data/
│   ├── fixtures/             # Synthetic Dubai public finance statutory law (3 chapters, 15 articles)
│   ├── processes/            # Standard government financial processes catalog (BGF-001, REV-001, etc.)
│   └── eval/                 # Gold evaluation benchmark cases
├── docs/
│   ├── DECISIONS.md          # Architectural decisions record
│   ├── ONPREM_MIGRATION.md   # Air-gapped on-premises deployment runbook
│   └── EVALUATION.md         # Automated benchmark evaluation results
├── docker-compose.yml
├── .env.example
└── config.yaml
```

---

## Quick Start Guide

### 1. Database Setup

Ensure PostgreSQL with pgvector is running:

```bash
docker compose up postgres -d
```

### 2. Backend Setup & Ingestion

```bash
cd backend

# Run database migrations
uv run alembic upgrade head

# Ingest statutory law fixture into PostgreSQL + pgvector
uv run python -m app.ingestion.cli ingest ../data/fixtures/synthetic_law.md --dry-run
uv run python -m app.ingestion.cli ingest ../data/fixtures/synthetic_law.md

# Start backend server
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies (already initialized)
npm install

# Start Vite development server
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) in your browser.

---

## Testing & Quality Assurance

Run the comprehensive test suite (47 unit and integration tests):

```bash
cd backend
ENVIRONMENT=test uv run pytest app/tests/ -v
```

Run evaluation benchmark against gold dataset:

```bash
cd backend
ENVIRONMENT=test uv run python -m app.ingestion.cli eval
```

Build frontend production bundle:

```bash
cd frontend
npm run build
```

---

## Disclaimer

AI-assisted compliance output requires qualified legal and financial auditor review and does not constitute formal legal counsel.
