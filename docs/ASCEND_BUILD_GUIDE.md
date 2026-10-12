# ASCEND — Complete Build Guide
## AI-Assisted Compliance Automation for Laws & Regulations

> **What this file is:** A unified, from-scratch implementation guide synthesising the original video demonstration of the Capgemini × Dubai DOF platform and the engineering build specification. Read every section before writing a single line of code.
>
> **Audience:** Developer, coding agent, or team building ASCEND from zero.
>
> **Hard constraint:** The cloud stack runs on **Google Vertex AI** today but must be switchable to a **fully on-premise stack by changing environment variables only** — never by touching application code.

---

## Table of Contents

1. [What Is ASCEND?](#1-what-is-ascend)
2. [The Problem It Solves](#2-the-problem-it-solves)
3. [How It Solves It — System Overview](#3-how-it-solves-it--system-overview)
4. [Architecture Deep-Dive](#4-architecture-deep-dive)
5. [Repository Layout](#5-repository-layout)
6. [Provider Abstraction Layer](#6-provider-abstraction-layer-portability-core)
7. [Database Schema](#7-database-schema)
8. [Ingestion Pipeline](#8-ingestion-pipeline)
9. [Retrieval Service](#9-retrieval-service)
10. [Agents & Workflow (LangGraph)](#10-agents--workflow-langgraph)
11. [REST API Specification](#11-rest-api-specification)
12. [Frontend Pages & UX](#12-frontend-pages--ux)
13. [Test Data & Fixtures](#13-test-data--fixtures)
14. [Testing, Quality & Guardrails](#14-testing-quality--guardrails)
15. [Build Phases & Acceptance Criteria](#15-build-phases--acceptance-criteria)
16. [Configuration Reference](#16-configuration-reference)
17. [On-Prem Migration Runbook](#17-on-prem-migration-runbook)
18. [Non-Negotiables Checklist](#18-non-negotiables-checklist)

---

## 1. What Is ASCEND?

**ASCEND** (AI-Assisted Compliance Automation for Laws and Regulations) is an enterprise-grade, multi-agent AI platform that automatically audits financial processes against a corpus of statutory laws and produces a structured, cited compliance report in under two minutes.

Originally built by **Capgemini** in partnership with the **Dubai Department of Finance (DOF)** (*حكومة دبي - دائرة المالية*), ASCEND digitally replicates an entire multidisciplinary compliance committee:

| Real Team Member | AI Agent Equivalent |
| :--- | :--- |
| Legal Researcher | Research Agent |
| Compliance Auditor | Gap Analysis Agent |
| Compliance Judge | Compliance Status Agent |
| Compliance Advisor | Corrective Action Agent |
| Performance Consultant | Missing KPI Agent |
| Chief Editor / QA Head | Review Agent |

**Mission Statement (from live demo):**
> *"Transform your budget processes with ASCEND. Ensure compliance, identify and fix gaps, and measure effectiveness with AI precision."*

---

## 2. The Problem It Solves

### 2.1 Regulatory Landscape

Government financial entities in Dubai must comply with:

| Law | Scope |
| :--- | :--- |
| Law No. (31) of 1995 | Establishing the Department of Finance |
| Law No. (1) of 1996 | Financial Regulations of Government Departments |
| Law No. (1) of 2016 | Financial Regulations of the Government of Dubai *(primary)* |
| Law No. (20) of 2020 | Contracts and Warehouse Management |
| Executive Council Resolution No. (3) of 2021 | Implementing Bylaw of Law No. (1) of 2016 |

These laws are hierarchically structured across Chapters → Sections → Articles → Sub-clauses, with hundreds of obligations and inter-article cross-references in Arabic legal language.

### 2.2 Five Core Pain Points

1. **Volume & Complexity** — Cross-referencing even one process against all articles takes expert legal hours.
2. **Labor & Time Cost** — Auditing 20+ financial processes manually consumes weeks of billable time.
3. **Inconsistent Human Interpretation** — Different departments read the same article differently.
4. **Audit Exposure** — Missing one mandated step (e.g., SFC sign-off on budget circular per Art. 15, or omitting internal budget committees per Art. 16) constitutes a real audit finding with legal consequences.
5. **No KPI Safety Net** — Even when gaps are caught, no operational metrics verify remediation is embedded.

---

## 3. How It Solves It — System Overview

ASCEND pipelines a process description through six specialised AI agents in sequence, each with Review Agent checkpoints:

```
User submits financial process description
         │
         ▼
┌──────────────────────────────────────────────────┐
│           AGENTIC WORKFLOW (LangGraph)            │
│                                                  │
│  [1] Research Agent                              │
│       ├── Query expansion (fast LLM)             │
│       ├── Hybrid semantic + keyword search       │
│       ├── Rerank results                         │
│       ├── Expand hierarchical context            │
│       └── → RelevantSections[]                  │
│            ↓ [Review Agent checkpoint]           │
│  [2] Gap Analysis Agent                          │
│       ├── Compare process vs. legal mandates     │
│       └── → missing_steps[], deviations[],       │
│              risks[] — each with citation+severity│
│            ↓ [Review Agent checkpoint]           │
│  [3] Compliance Status Agent                     │
│       └── → COMPLIANT | PARTIALLY_COMPLIANT |    │
│              NON_COMPLIANT + justification        │
│            ↓ [Review Agent checkpoint]           │
│  [4] Corrective Action Agent                     │
│       └── → Actions tied to gaps + articles      │
│            ↓ [Review Agent checkpoint]           │
│  [5] Missing KPI Agent                           │
│       └── → KPIs: name, formula, target, freq    │
│            ↓ [Review Agent checkpoint]           │
│  [6] Assemble Report                             │
└──────────────────────────────────────────────────┘
         │
         ▼
5-Part Compliance Report
+ Live SSE Stream to UI
+ Human-in-the-Loop Feedback per finding
```

**Key design principle:** Every finding carries `citations: [{law_code, article_no, node_id}]`. A finding whose `node_id` is not in the retrieved article set is **rejected by code** — hallucination is structurally impossible, not just prompted away.

---

## 4. Architecture Deep-Dive

```
React UI (Vite + TypeScript + Tailwind + react-i18next)
    │  HTTP + SSE
    ▼
FastAPI backend (async Python)
    │
    ├── Orchestrator: LangGraph state machine
    │       Research → GapAnalysis → ComplianceStatus
    │          → CorrectiveAction → MissingKPI → Review
    │
    ├── Retrieval Service
    │       Hybrid RAG: pgvector cosine + Postgres FTS (pg_trgm)
    │       Reciprocal Rank Fusion → Reranker → Context Expansion
    │
    ├── Provider Layer  ◀── ONLY place cloud-specific code lives
    │       LLMProvider · EmbeddingProvider · RerankProvider
    │         ├── vertex_*     (Vertex AI — default)
    │         └── local_*     (vLLM / TEI / sentence-transformers)
    │
    └── PostgreSQL 16 + pgvector
            laws, law_nodes, chunks, chunk_embeddings
            processes, analyses, analysis_events, report_sections
            findings, feedback, users
```

### Technology Choices & Rationale

| Concern | Choice | Reason |
| :--- | :--- | :--- |
| Orchestration | **LangGraph** | Explicit state machine; per-node SSE events; resumable on failure |
| API | **FastAPI + SSE** | Async, typed, native streaming |
| Database | **PostgreSQL 16 + pgvector + pg_trgm** | One store for vectors, relational metadata, feedback; identical cloud/on-prem |
| Migrations | **Alembic** | Industry standard for PostgreSQL schema versioning |
| Frontend | **React + TypeScript + Vite + Tailwind + react-i18next** | RTL Arabic support; fast build; type safety |
| Packaging | **Docker Compose** | Identical environment across dev, cloud, on-prem |
| Agent framework | **LangGraph** *(vs LlamaIndex in original demo)* | Better state machine primitives and streaming hooks |

> **Note on original demo:** Capgemini built with LlamaIndex + Azure OpenAI + Azure PostgreSQL. This spec uses Google Vertex AI (default) + on-prem switch, but preserves all product behaviours: 6 agents, 5-part report, HITL, same UI flow.

---

## 5. Repository Layout

```
ascend/
├── README.md
├── docs/
│   ├── DECISIONS.md          # every deviation from this spec + why
│   ├── ONPREM_MIGRATION.md   # step-by-step runbook
│   └── EVALUATION.md         # auto-generated eval results
├── docker-compose.yml         # postgres, backend, frontend
│                              # profile: onprem → adds vllm, tei
├── .env.example
├── config.yaml
├── data/
│   ├── laws/                  # user-supplied law files (gitignored except fixtures)
│   ├── fixtures/
│   │   └── synthetic_law.md   # SYNTHETIC test law (labelled, not real)
│   ├── processes/
│   │   └── processes.yaml
│   └── eval/
│       └── gold.yaml
├── backend/
│   ├── pyproject.toml
│   ├── alembic/
│   └── app/
│       ├── main.py
│       ├── settings.py        # pydantic-settings — single source of all config
│       ├── api/               # routers: laws, processes, analyses, feedback, dashboard, health
│       ├── db/
│       │   ├── models.py
│       │   └── session.py
│       ├── ingestion/
│       │   ├── parsers.py     # PDF (pymupdf), DOCX, HTML, Markdown
│       │   ├── hierarchy.py   # rule-based tree builder (EN + AR headings)
│       │   ├── chunker.py     # article/clause-level splitter
│       │   ├── indexer.py     # embed + write chunk_embeddings
│       │   └── cli.py         # ascend ingest / ascend index --reembed
│       ├── retrieval/
│       │   ├── hybrid.py      # pgvector + FTS + RRF merge
│       │   ├── rerank.py
│       │   ├── context_expand.py
│       │   └── definitions.py
│       ├── providers/         # ★ ONLY place SDK-specific code lives
│       │   ├── base.py        # Protocol interfaces
│       │   ├── factory.py
│       │   ├── vertex_llm.py
│       │   ├── vertex_embedding.py
│       │   ├── vertex_rerank.py
│       │   ├── openai_compat_llm.py   # vLLM / Ollama on-prem
│       │   ├── local_embedding.py     # sentence-transformers or TEI
│       │   ├── local_rerank.py        # cross-encoder
│       │   └── fake_providers.py      # deterministic fakes for tests
│       ├── agents/
│       │   ├── schemas.py     # ALL Pydantic input/output models
│       │   ├── validators.py  # citation validator
│       │   ├── research.py
│       │   ├── gap_analysis.py
│       │   ├── compliance_status.py
│       │   ├── corrective_action.py
│       │   ├── missing_kpi.py
│       │   ├── review.py
│       │   └── prompts/       # one .md prompt per agent, versioned
│       ├── workflow/
│       │   ├── graph.py       # LangGraph state machine
│       │   ├── state.py       # WorkflowState dataclass
│       │   └── events.py      # AnalysisEvent types + SSE serialisation
│       ├── services/
│       │   ├── analysis_service.py
│       │   └── report_service.py
│       └── tests/
└── frontend/
    └── src/
        ├── pages/
        │   ├── Landing.tsx
        │   ├── KnowledgeBase.tsx
        │   ├── Dashboard.tsx
        │   ├── Laws.tsx
        │   ├── Processes.tsx
        │   ├── Analysis.tsx
        │   └── Report.tsx
        ├── components/
        ├── hooks/
        └── i18n/              # en.json + ar.json
```

---

## 6. Provider Abstraction Layer (Portability Core)

All cloud/local differences live **exclusively** in `providers/`. This is the single most important architectural rule.

### 6.1 Protocol Interfaces (`providers/base.py`)

```python
from typing import Protocol, AsyncIterator
from pydantic import BaseModel

class Message(BaseModel):
    role: str      # "system" | "user" | "assistant"
    content: str

class LLMResult(BaseModel):
    text: str
    input_tokens: int
    output_tokens: int
    latency_ms: float

class RerankHit(BaseModel):
    index: int
    score: float

class LLMProvider(Protocol):
    async def generate(
        self, *, system: str, messages: list[Message],
        response_schema: type[BaseModel] | None = None,
        temperature: float = 0.0, max_tokens: int | None = None,
    ) -> LLMResult: ...

    async def stream(
        self, *, system: str, messages: list[Message], **kw,
    ) -> AsyncIterator[str]: ...

class EmbeddingProvider(Protocol):
    dimension: int
    model_id: str
    async def embed_documents(self, texts: list[str]) -> list[list[float]]: ...
    async def embed_query(self, text: str) -> list[float]: ...

class RerankProvider(Protocol):
    async def rerank(self, query: str, passages: list[str], top_n: int) -> list[RerankHit]: ...
```

**Rules for every provider:**
- `response_schema` → enforce JSON output (Vertex: response schema; vLLM: `guided_json`).
- Caller always validates with Pydantic and retries once on failure, regardless of provider.
- Return only plain Pydantic/dataclass objects — zero SDK types leak out of `providers/`.
- Add exponential backoff, timeout, and token/latency logging inside the provider.

### 6.2 Provider Implementations

| File | Purpose |
| :--- | :--- |
| `vertex_llm.py` | Vertex AI Generative AI via Application Default Credentials |
| `vertex_embedding.py` | Multilingual embedding supporting Arabic + English |
| `vertex_rerank.py` | Vertex AI reranking API |
| `openai_compat_llm.py` | Any OpenAI-compatible server (vLLM, Ollama); guided JSON via `guided_json` |
| `local_embedding.py` | TEI HTTP endpoint (if `LOCAL_EMBEDDING_URL` set), else in-process sentence-transformers |
| `local_rerank.py` | Cross-encoder model locally (e.g., `BAAI/bge-reranker-v2-m3`) |
| `fake_providers.py` | Deterministic, instant fakes for tests |

### 6.3 Factory (`providers/factory.py`)

```python
def build_llm_provider(settings) -> LLMProvider:
    match settings.llm_provider:
        case "vertex":       return VertexLLMProvider(settings)
        case "openai_compat": return OpenAICompatLLMProvider(settings)
        case _: raise ValueError(f"Unknown LLM_PROVIDER: {settings.llm_provider}")
# Same pattern for embedding and rerank providers.
```

### 6.4 Embedding Dimension Handling

Vector dimensions differ between models. Solution:
- `chunk_embeddings` stores `(chunk_id, embedding_model, embedding_dim, embedding)`.
- HNSW index created **per model**: `CREATE INDEX ... WHERE embedding_model = 'X'`.
- Retriever only queries rows matching the **active** `embedding_model`.
- `ascend index --reembed` re-embeds all chunks and marks them active atomically.

---

## 7. Database Schema

```sql
-- Law corpus
CREATE TABLE laws (
    id              SERIAL PRIMARY KEY,
    code            TEXT UNIQUE NOT NULL,   -- e.g. "LAW_1_2016"
    title_en        TEXT,
    title_ar        TEXT,
    jurisdiction    TEXT DEFAULT 'Dubai',
    year            INT,
    source_file     TEXT,
    version         TEXT,
    effective_date  DATE
);

CREATE TABLE law_nodes (
    id          SERIAL PRIMARY KEY,
    law_id      INT REFERENCES laws(id),
    parent_id   INT REFERENCES law_nodes(id),
    node_type   TEXT NOT NULL,  -- law|chapter|section|article|clause
    number      TEXT,           -- "15", "4.2", etc.
    title       TEXT,
    text        TEXT,
    path_text   TEXT,           -- "Law 1/2016 > Ch.4 > Art.15"
    ordinal     INT,
    language    TEXT DEFAULT 'ar'
);

CREATE TABLE chunks (
    id                  SERIAL PRIMARY KEY,
    node_id             INT REFERENCES law_nodes(id),
    content             TEXT NOT NULL,
    content_with_path   TEXT NOT NULL,  -- breadcrumb + text (what gets embedded)
    token_count         INT,
    tsv                 TSVECTOR
);
CREATE INDEX ON chunks USING GIN(tsv);

CREATE TABLE chunk_embeddings (
    chunk_id        INT REFERENCES chunks(id),
    embedding_model TEXT NOT NULL,
    embedding_dim   INT NOT NULL,
    embedding       VECTOR,
    PRIMARY KEY (chunk_id, embedding_model)
);
-- Create HNSW index per model on first use:
-- CREATE INDEX ON chunk_embeddings USING hnsw (embedding vector_cosine_ops)
--   WHERE embedding_model = '<active-model>';

CREATE TABLE definitions (
    id              SERIAL PRIMARY KEY,
    law_id          INT REFERENCES laws(id),
    term            TEXT NOT NULL,
    definition_text TEXT NOT NULL,
    node_id         INT REFERENCES law_nodes(id)
);

-- Process catalog
CREATE TABLE processes (
    id          SERIAL PRIMARY KEY,
    level       INT NOT NULL,
    parent_id   INT REFERENCES processes(id),
    code        TEXT UNIQUE,
    name_en     TEXT NOT NULL,
    name_ar     TEXT,
    description TEXT
);

CREATE TABLE process_activities (
    id          SERIAL PRIMARY KEY,
    process_id  INT REFERENCES processes(id),
    ordinal     INT NOT NULL,
    text        TEXT NOT NULL
);

-- Analysis lifecycle
CREATE TABLE analyses (
    id              SERIAL PRIMARY KEY,
    process_id      INT REFERENCES processes(id),
    status          TEXT NOT NULL DEFAULT 'pending',
    started_at      TIMESTAMPTZ,
    finished_at     TIMESTAMPTZ,
    llm_provider    TEXT,
    llm_model       TEXT,
    config_snapshot JSONB   -- full settings snapshot for reproducibility
);

CREATE TABLE analysis_events (
    id          SERIAL PRIMARY KEY,
    analysis_id INT REFERENCES analyses(id),
    seq         INT NOT NULL,
    ts          TIMESTAMPTZ DEFAULT NOW(),
    event_type  TEXT NOT NULL,  -- agent_state|tool_call|agent_switch|section_complete|error|done
    agent       TEXT,
    payload     JSONB
);

CREATE TABLE report_sections (
    id          SERIAL PRIMARY KEY,
    analysis_id INT REFERENCES analyses(id),
    part_no     INT NOT NULL,   -- 1..5
    content     JSONB NOT NULL
);

CREATE TABLE findings (
    id          SERIAL PRIMARY KEY,
    analysis_id INT REFERENCES analyses(id),
    part_no     INT NOT NULL,
    finding_key TEXT NOT NULL,
    kind        TEXT,           -- missing_step|deviation|risk|action|kpi
    text        TEXT NOT NULL,
    citations   JSONB           -- [{law_code, article_no, node_id}]
);

CREATE TABLE feedback (
    id          SERIAL PRIMARY KEY,
    finding_id  INT REFERENCES findings(id),
    user_id     INT,
    rating      SMALLINT CHECK (rating IN (-1, 0, 1)),  -- thumbs down|neutral|up
    note        TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    resolution  TEXT
);

CREATE TABLE users (
    id      SERIAL PRIMARY KEY,
    name    TEXT NOT NULL,
    role    TEXT NOT NULL   -- auditor|admin|viewer
);
```

Indexes: GIN on `chunks.tsv`; HNSW on `chunk_embeddings` per model (cosine); btree on `law_nodes(law_id, parent_id)`.

---

## 8. Ingestion Pipeline

### 8.1 Parsers (`ingestion/parsers.py`)

Pluggable parser registry:

| Format | Library | Notes |
| :--- | :--- | :--- |
| PDF | `pymupdf` (fitz) | Extract text, preserve headings |
| DOCX | `python-docx` | Traverse paragraph styles |
| HTML | `BeautifulSoup` | Strip tags, preserve heading hierarchy |
| Markdown | Plain regex | Already structured |

### 8.2 Hierarchy Builder (`ingestion/hierarchy.py`)

Rule-based structural detector:
- **English:** `Chapter`, `Section`, `Article`, `Clause` + numbering (e.g. `Article (15)`, `Article 15`).
- **Arabic:** `الفصل` (chapter), `المادة` (article), `البند` (clause) + Arabic-Indic digit normalisation to ASCII.
- If detection confidence is low: log a warning and skip — never poison the corpus with wrong structure.

### 8.3 Chunker (`ingestion/chunker.py`)

- Chunk at **article or clause level** — never split mid-sentence.
- Long articles: split by sub-clause, keeping article heading on every part.
- `content_with_path` = breadcrumb + text — this is what gets embedded, keeping retrieval context-rich.

### 8.4 Indexer (`ingestion/indexer.py`)

- Batch-embed `content_with_path` via `EmbeddingProvider`.
- Write to `chunk_embeddings` with `embedding_model` and `embedding_dim`.
- Re-running ingest is **idempotent** — upsert on `(law_code, node path)`.

### 8.5 CLI (`ingestion/cli.py`)

```bash
ascend ingest data/laws/        # parse, build tree, chunk, embed
ascend ingest --dry-run         # print parsed tree only, no DB writes
ascend index --reembed          # re-embed all chunks with active provider
```

---

## 9. Retrieval Service

**Input:** query string (one process activity, or full process description)
**Output:** `RetrievedArticle[]`

```python
@dataclass
class RetrievedArticle:
    node_id:     int
    law_code:    str
    article_no:  str
    path_text:   str
    text:        str
    definitions: list[TermDefinition]  # defined terms found in text
    score:       float
```

### Pipeline Steps

1. **Query Expansion** — fast LLM generates 3–5 legal-search sub-queries.
2. **Hybrid Search:**
   - `pgvector` cosine top-K on `chunk_embeddings` (semantic).
   - `pg_trgm` / `ts_rank` FTS on `chunks.tsv` (keyword).
3. **Reciprocal Rank Fusion (RRF)** — merge both ranked lists.
4. **Rerank** — `RerankProvider.rerank()` for top-N (skip if `RERANK_PROVIDER=none`).
5. **Hierarchical Context Expansion** — attach parent chapter/section titles; include sibling clauses if article is short; inject `definitions` for defined terms.
6. Return `RetrievedArticle[]`.

All retrieval functions accept a **fake embedding provider** for unit testing.

---

## 10. Agents & Workflow (LangGraph)

### 10.1 Shared Rules for Every Agent

- **Input/output = Pydantic schemas** (`agents/schemas.py`). LLM called with `response_schema`; invalid JSON → one repair retry → mark stage failed.
- **Grounding rule:** every finding **must** include `citations: [{law_code, article_no, node_id}]`. `validators.py` verifies each `node_id` is in the retrieved set. If not → **reject** the finding.
- **Temperature = 0** for all agents.
- **Prompts** in `agents/prompts/*.md`, versioned. Each includes: role, task, input format, output schema, "Do not use knowledge outside the provided articles."
- **No hallucination by construction** — agents can only cite what retrieval returned.

### 10.2 Agent Specifications

#### Agent 1: Research Agent

- **Input:** process description + activities
- **Loop (max N iterations):** search → read full article → record note → decide if more needed
- **Output:**
```python
class RelevantSection(BaseModel):
    node_id:        int
    law_code:       str
    article_no:     str
    path_text:      str
    text:           str
    why_relevant:   str
    key_obligation: str
    citations:      list[Citation]
```

#### Agent 2: Gap Analysis Agent

- **Input:** process + `RelevantSections[]`
- **Output:**
```python
class Finding(BaseModel):
    finding_key: str              # e.g. "MISS_001"
    text:        str
    citations:   list[Citation]
    severity:    Literal["low", "medium", "high"]

class GapAnalysis(BaseModel):
    missing_steps: list[Finding]  # process omits what law mandates
    deviations:    list[Finding]  # process contradicts law
    risks:         list[Finding]  # downstream compliance risks
```

#### Agent 3: Compliance Status Agent

- **Input:** `GapAnalysis`
- **Rubric (enforced in code):**
  - Any `high`-severity gap → `NON_COMPLIANT`
  - Only `medium`-severity gaps → `PARTIALLY_COMPLIANT`
  - No gaps → `COMPLIANT`
- **Output:**
```python
class ComplianceStatus(BaseModel):
    status:               Literal["COMPLIANT", "PARTIALLY_COMPLIANT", "NON_COMPLIANT"]
    justification:        str
    high_severity_count:  int
    medium_severity_count: int
    low_severity_count:   int
```

#### Agent 4: Corrective Action Agent

- **Input:** `GapAnalysis`
- **Output:**
```python
class CorrectiveAction(BaseModel):
    action_key:            str
    addresses_finding_key: str   # must match a real finding_key
    citation:              Citation
    steps:                 list[str]
    owner_suggestion:      str
    priority:              Literal["immediate", "short_term", "medium_term"]
```

#### Agent 5: Missing KPI Agent

- **Input:** `GapAnalysis` + `list[CorrectiveAction]`
- **Output:**
```python
class MissingKPI(BaseModel):
    name:                str
    definition:          str
    formula:             str
    target:              str
    frequency:           str        # daily|weekly|monthly|quarterly|annual
    data_source:         str
    rationale:           str
    linked_finding_keys: list[str]  # must reference real finding_keys
```

#### Agent 6: Review Agent (runs after every stage)

- **Checks:** actions map to real `finding_key`; KPIs map to real keys; all `node_id` citations in retrieved set; terminology consistent; no unsupported claims.
- **Output:** `approve` | `revise(notes)` — max 1 revision loop per stage.

### 10.3 LangGraph Workflow

```python
# workflow/graph.py
graph = StateGraph(WorkflowState)

nodes = [
    "research", "review_research",
    "gap_analysis", "review_gap",
    "status", "review_status",
    "corrective_actions", "review_actions",
    "missing_kpis", "review_kpis",
    "assemble_report"
]
# ... add_node for each ...

graph.set_entry_point("research")
edges = [
    ("research",           "review_research"),
    ("review_research",    "gap_analysis"),
    ("gap_analysis",       "review_gap"),
    ("review_gap",         "status"),
    ("status",             "review_status"),
    ("review_status",      "corrective_actions"),
    ("corrective_actions", "review_actions"),
    ("review_actions",     "missing_kpis"),
    ("missing_kpis",       "review_kpis"),
    ("review_kpis",        "assemble_report"),
    ("assemble_report",    END),
]
for src, dst in edges:
    graph.add_edge(src, dst)
```

### 10.4 Event Streaming

Every node transition, tool call, and agent switch emits an `AnalysisEvent`:
1. Persisted to `analysis_events` table.
2. Pushed to SSE stream for real-time UI updates.

```python
class AnalysisEvent(BaseModel):
    id:          int
    analysis_id: int
    seq:         int
    ts:          datetime
    event_type:  Literal[
        "agent_state",      # idle|waiting|running|done|failed
        "tool_call",        # search_documents, record_notes, read_pdf, write_report
        "agent_switch",     # ResearchAgent → GapAnalysisAgent
        "section_complete", # Part 1 done, Part 2 done, ...
        "error", "done"
    ]
    agent:   str | None
    payload: dict
```

---

## 11. REST API Specification

```
# Health
GET  /health                          → {status: "ok"}
GET  /health/providers                → {llm: "ok", embedding: "ok", rerank: "ok"}

# Laws
GET  /laws                            → paginated list
GET  /laws/{id}/tree                  → full hierarchy tree
GET  /laws/nodes/{node_id}            → article full text + definitions

# Processes
GET  /processes                       → catalog with hierarchy
GET  /processes/{id}                  → detail + activities

# Analyses
POST /analyses                        body: {process_id | custom_process_text}
                                      → {analysis_id}
GET  /analyses/{id}                   → status + report
GET  /analyses/{id}/stream            → SSE of AnalysisEvents (Last-Event-ID resume)
POST /analyses/{id}/retry?from=stage  → re-run from a stage
GET  /analyses                        → paginated history

# Feedback
POST /findings/{id}/feedback          body: {rating: -1|0|1, note?: string}

# Dashboard
GET  /dashboard/summary               → totals, compliance_ratio, gaps_over_time,
                                        recent_reports

# Export
GET  /analyses/{id}/export?format=pdf|docx|json
```

**Conventions:**
- All inputs validated with Pydantic.
- Lists paginated (`?page=&size=`).
- Error envelope: `{error: {code, message, detail}}`.
- User process text wrapped in `---USER_PROCESS_START---` / `---USER_PROCESS_END---` delimiters in all prompts (injection prevention).

---

## 12. Frontend Pages & UX

Bilingual (EN/AR, RTL-aware) SPA: React + TypeScript + Vite + Tailwind CSS + `react-i18next`.

### Page 1: Landing (`/`)
- Dubai DOF branding, dark-mode aesthetics, DOF emblem.
- Hero: mission statement + animated tagline.
- CTA buttons: Dashboard, Explore Laws, Start Analysis.
- Language toggle (English ⇄ Arabic).
- Disclaimer: *"AI-assisted output requires qualified human review and is not legal advice."*

### Page 2: Knowledge Base (`/knowledge-base`)
- Explainer for non-technical users: 6 agents, Hierarchical RAG, pgvector, LangGraph.
- Animated state-flow diagram of agent collaboration.

### Page 3: Dashboard (`/dashboard`)
- KPI cards: Total Activity, Processes Analyzed, Compliance Gaps, Corrective Actions.
- Donut chart: compliance ratio.
- Area chart: gaps flagged over time.
- Bar chart: compliance statistics breakdown.
- Table: recent reports with status badges and scores.

### Page 4: Law Explorer (`/laws`)
- Sidebar: list of laws.
- Expandable tree: Law → Chapter → Section → Article → Clause.
- Article viewer: full text, definitions highlighted, `path_text` breadcrumb.
- Keyword search bar within corpus.

### Page 5: Process Catalog (`/processes`)
- Hierarchical list (L1 → L2 → L3 → L4 activities).
- Process card: name (EN + AR), code, description, activities.
- **"Run Compliance Analysis"** button → `/analysis/:processId`.

### Page 6: Analysis / Run Page (`/analysis/:id`)

Three panels:

**Panel A — Agent State Grid (6 cells, colour-coded):**
```
┌───────────────┬───────────────┬───────────────┐
│  Research     │  Gap Analysis │  Status       │
│  RUNNING 🔄   │  WAITING ⏳   │  IDLE ○       │
├───────────────┼───────────────┼───────────────┤
│ Corrective    │  Missing KPIs │  Review       │
│  IDLE ○       │  IDLE ○       │  IDLE ○       │
└───────────────┴───────────────┴───────────────┘
```

**Panel B — Live Agent Stream (SSE log):**
- `[Tool Call] search_documents — "budget circular SFC approval"`
- `[Tool Call] record_notes — "Article 15 requires SFC circular before May..."`
- `[Agent Switch] ResearchAgent → GapAnalysisAgent`
- `[Section Complete] Part 1: Relevant Law Sections`

**Panel C — Accordion Report (fills in real-time):**
- Part 1: Relevant Law Sections
- Part 2: Gap Analysis (missing steps, deviations, risks)
- Part 3: Compliance Status (badge)
- Part 4: Corrective Actions
- Part 5: Missing KPIs

Each finding card shows:
- Finding text + citation badge (e.g., `Law 1/2016 — Art. 15`) + severity chip
- 👍 / 👎 buttons + note input → `POST /findings/{id}/feedback`

### Page 7: Report Export (`/report/:id`)
- Full 5-part formatted report.
- Export: PDF, DOCX, JSON.
- Feedback summary alongside findings.
- Disclaimer footer on all exports.

### Bilingual / RTL
- All strings in `i18n/en.json` and `i18n/ar.json`.
- Arabic active: `dir="rtl"` on `<html>`, Tailwind `rtl:` modifiers, mirrored layout.

---

## 13. Test Data & Fixtures

### Synthetic Law (`data/fixtures/synthetic_law.md`)

Create a **clearly labelled fictional** "Public Finance Law of Testland" (~15 articles, 3 chapters).

Label at top:
```
> ⚠️ SYNTHETIC FIXTURE — FOR TESTING ONLY. Not a real law. Not legal advice.
```

Must contain:
- **Chapter 1 — Definitions:** Fiscal Authority, Budget Circular, Budget Committee, Core Principles, Prescribed Forms.
- **Chapter 2 — Budget Preparation:**
  - Art. 5: Fiscal Authority must issue Budget Circular by April 30, with prior SFC endorsement.
  - Art. 6: All entities must form internal Budget Preparation Committee within 30 days.
  - Art. 7: Four core principles: Comprehensiveness, Universality, Annuality, Unity.
  - Art. 8: Templates must conform to forms prescribed by Director General.
- **Chapter 3 — Reporting:** Audit, reporting, record-keeping obligations.

### Process Catalog (`data/processes/processes.yaml`)

```yaml
processes:
  - id: 1
    level: 3
    code: BGF-001
    name_en: "Design Budgetary Guidelines"
    name_ar: "تصميم المبادئ التوجيهية للميزانية"
    activities:
      - "Develop budget calendar and key milestones."
      - "Issue budget call circular."
      - "Provide templates for budget submission."
      - "Outline legal and policy constraints."
  # 4 more processes: Expenditure Control, Revenue Forecasting,
  # Audit Preparation, Performance Reporting
```

### Gold Cases (`data/eval/gold.yaml`)

```yaml
- process_id: 1
  expected_status: PARTIALLY_COMPLIANT
  expected_gaps:
    - {finding_key: MISS_001, kind: missing_step, article: "Art.5",
       description: "No SFC endorsement step before circular issuance"}
    - {finding_key: MISS_002, kind: missing_step, article: "Art.6",
       description: "No internal budget committee formation mandated"}
    - {finding_key: MISS_003, kind: missing_step, article: "Art.7",
       description: "Four core budgeting principles not embedded"}
    - {finding_key: MISS_004, kind: missing_step, article: "Art.8",
       description: "Templates not aligned with prescribed forms"}
```

---

## 14. Testing, Quality & Guardrails

### Unit Tests

| Test file | What it covers |
| :--- | :--- |
| `test_parsers.py` | Each parser extracts expected text from fixtures |
| `test_hierarchy.py` | Fixture law parses to expected tree JSON |
| `test_chunker.py` | No mid-sentence splits; breadcrumbs correct |
| `test_hybrid_retrieval.py` | RRF merge logic; fake embedding provider |
| `test_citation_validator.py` | Validator rejects findings with unknown node_ids |
| `test_provider_factory.py` | Correct provider per env var |
| `test_schema_validation.py` | All agent output schemas validate |

### Provider Contract Tests

Same test suite runs against all three tiers:
1. `FakeLLMProvider` — deterministic, instant (always runs in CI)
2. `vertex_*` providers — marked `@pytest.mark.cloud`, skipped if `GOOGLE_CLOUD_PROJECT` unset
3. `local_*` providers — marked `@pytest.mark.onprem`, skipped if `OPENAI_COMPAT_BASE_URL` unset

### Portability Test (Critical — runs on every commit)

```python
# test_portability.py
import ast, pathlib

PROVIDER_DIR = pathlib.Path("backend/app/providers")
APP_DIR = pathlib.Path("backend/app")
FORBIDDEN = {"google", "vertexai", "google.cloud"}

for py_file in APP_DIR.rglob("*.py"):
    if PROVIDER_DIR in py_file.parents:
        continue
    tree = ast.parse(py_file.read_text())
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            for alias in getattr(node, "names", []):
                assert not any(alias.name.startswith(f) for f in FORBIDDEN), \
                    f"Cloud SDK outside providers/: {py_file}:{node.lineno}"
```

### Workflow Integration Tests

End-to-end with `FakeLLMProvider` on process 1 → all 5 report parts present → citations 100% valid → status matches gold.

### Evaluation Harness

```bash
ascend eval data/eval/gold.yaml
```
Reports: gap recall/precision, citation validity rate (must be **100%**), status agreement, latency (p50/p95), token cost. Output → `docs/EVALUATION.md`.

### Code Quality

- **Backend:** `ruff` + `mypy --strict` on `providers/` and `agents/schemas.py`.
- **Frontend:** `eslint` + `tsc --noEmit`.
- **Security:** no secrets in logs; CORS via `ALLOWED_ORIGINS` env var; rate limit `POST /analyses`; delimiter-wrap user input in all prompts.
- **Auditability:** every analysis stores `config_snapshot`, prompt version IDs, retrieved `node_id` list, and full event log.

---

## 15. Build Phases & Acceptance Criteria

Work phase by phase. **Do not start the next phase until all acceptance criteria pass.** After each phase: run tests, update `README.md` and `docs/DECISIONS.md`.

---

### Phase 1 — Foundation

**Deliverables:**
- Repo structure, Docker Compose (Postgres + pgvector), `.env.example`, `config.yaml`, `settings.py` (fails fast on missing required keys), Alembic migrations (full schema), provider interfaces + factory + fake providers, Vertex providers, `/health` + `/health/providers`.

**Acceptance Criteria:**
- [ ] `docker compose up` starts without errors.
- [ ] `GET /health` → `{"status": "ok"}`.
- [ ] `GET /health/providers` → Vertex round-trips OK (when credentials set).
- [ ] Portability test passes.
- [ ] `mypy --strict` passes on `providers/` and `agents/schemas.py`.

---

### Phase 2 — Ingestion & Retrieval

**Deliverables:**
- Parsers (PDF, DOCX, HTML, MD), hierarchy builder (EN + AR), chunker, indexer, CLI (`ingest`, `--dry-run`, `--reembed`), HNSW index per model, hybrid retrieval (pgvector + FTS + RRF), rerank, context expansion, `/laws` endpoints.

**Acceptance Criteria:**
- [ ] `ascend ingest data/fixtures/synthetic_law.md` → tree matches expected JSON.
- [ ] Re-running ingest is idempotent (same row counts).
- [ ] Top-3 hit rate ≥ 90% on 10 hand-written queries against fixture.
- [ ] `ascend index --reembed` completes without error.
- [ ] Parser unit tests pass for all four formats.

---

### Phase 3 — Agents & Workflow

**Deliverables:**
- `agents/schemas.py`, `validators.py`, all 6 agent implementations, prompt files, LangGraph graph, `WorkflowState`, `AnalysisEvent` + SSE serialisation, `analysis_events`/`report_sections` persistence, `POST /analyses`.

**Acceptance Criteria:**
- [ ] `POST /analyses` on process 1 → all 5 report parts in DB.
- [ ] Citation validity: **100%** — every `node_id` in retrieved set.
- [ ] Status matches `gold.yaml` for process 1.
- [ ] `analysis_events` fully populated.
- [ ] Workflow integration test passes with fake providers.

---

### Phase 4 — API & Streaming

**Deliverables:**
- `GET /analyses/{id}/stream` (SSE with `Last-Event-ID` resume), `GET /analyses/{id}`, `POST /analyses/{id}/retry`, `GET /analyses`, `POST /findings/{id}/feedback`, `GET /dashboard/summary`, export endpoint, rate limiting, input sanitisation.

**Acceptance Criteria:**
- [ ] All API tests pass.
- [ ] SSE reconnect with `Last-Event-ID` → receives only missed events, no duplicates.
- [ ] Feedback stored and visible in `GET /analyses/{id}`.
- [ ] Dashboard returns correct aggregates.
- [ ] Export produces valid PDF/DOCX/JSON.

---

### Phase 5 — Frontend

**Deliverables:**
- All 7 pages implemented and styled, bilingual EN/AR with RTL layout, live agent state grid, SSE-driven event log and accordion report, per-finding feedback UI, dashboard charts, law explorer, process catalog.

**Acceptance Criteria:**
- [ ] Full journey in Chrome: land → dashboard → laws → processes → run → watch live → read report → submit feedback.
- [ ] Arabic: all text in Arabic, layout flips RTL, no overflow.
- [ ] Disclaimer visible on Landing and all exports.
- [ ] No console errors during normal flow.

---

### Phase 6 — Evaluation & On-Prem Readiness

**Deliverables:**
- `ascend eval` harness → `docs/EVALUATION.md`, `docs/ONPREM_MIGRATION.md`, `onprem` Compose profile (vLLM + TEI), `local_*` providers, `ascend index --reembed` verified with local model.

**Acceptance Criteria:**
- [ ] Eval: citation validity **100%**, status agreement ≥ 80%, gap recall ≥ 70%.
- [ ] Switch three env vars + reembed → full workflow with **no outbound internet** (verify via network-restricted container).
- [ ] `docs/ONPREM_MIGRATION.md` followed by a fresh developer produces working on-prem instance.

---

## 16. Configuration Reference

### Complete `.env.example`

```dotenv
# ── Provider selection (the ONLY switch needed for on-prem) ──────────────────
LLM_PROVIDER=vertex            # vertex | openai_compat
EMBEDDING_PROVIDER=vertex      # vertex | local
RERANK_PROVIDER=vertex         # vertex | local | none

# ── Vertex AI (cloud default) ────────────────────────────────────────────────
GOOGLE_CLOUD_PROJECT=          # required when LLM_PROVIDER=vertex
GOOGLE_CLOUD_LOCATION=         # e.g. us-central1
GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/vertex_credential.json
VERTEX_LLM_MODEL=              # primary reasoning model (fail fast if empty)
VERTEX_LLM_FAST_MODEL=         # cheaper model for review/formatting tasks
VERTEX_EMBEDDING_MODEL=        # multilingual model supporting Arabic + English
VERTEX_EMBEDDING_DIM=          # integer; must match model output
VERTEX_RERANK_MODEL=

# ── On-prem providers ────────────────────────────────────────────────────────
OPENAI_COMPAT_BASE_URL=http://vllm:8000/v1
OPENAI_COMPAT_API_KEY=local
OPENAI_COMPAT_MODEL=           # model name served by vLLM (fail fast if empty)
LOCAL_EMBEDDING_MODEL=BAAI/bge-m3
LOCAL_EMBEDDING_DIM=1024
LOCAL_EMBEDDING_URL=           # TEI endpoint; empty → in-process sentence-transformers
LOCAL_RERANK_MODEL=BAAI/bge-reranker-v2-m3

# ── Database ─────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql+asyncpg://ascend:ascend@postgres:5432/ascend

# ── API ──────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:5173
RATE_LIMIT_ANALYSES=10/minute

# ── Application ──────────────────────────────────────────────────────────────
LOG_LEVEL=INFO
ENVIRONMENT=development
```

**Rule:** `settings.py` must use `pydantic-settings` and raise a clear `ValueError` for any required field that is unset.

---

## 17. On-Prem Migration Runbook

> Full content in `docs/ONPREM_MIGRATION.md`. Summary:

### Prerequisites
- GPU server with CUDA (for vLLM).
- Docker Compose with `onprem` profile.
- Chosen models: instruction LLM (e.g., Qwen2.5-72B-Instruct), embedding (BAAI/bge-m3), reranker (BAAI/bge-reranker-v2-m3).

### Steps

**Step 1:** Update `.env`:
```dotenv
LLM_PROVIDER=openai_compat
EMBEDDING_PROVIDER=local
RERANK_PROVIDER=local
OPENAI_COMPAT_BASE_URL=http://vllm:8000/v1
OPENAI_COMPAT_MODEL=<model-id>
LOCAL_EMBEDDING_MODEL=BAAI/bge-m3
LOCAL_EMBEDDING_DIM=1024
LOCAL_RERANK_MODEL=BAAI/bge-reranker-v2-m3
```

**Step 2:** Start on-prem stack:
```bash
docker compose --profile onprem up -d
```

**Step 3:** Re-embed the corpus:
```bash
docker compose exec backend ascend index --reembed
```

**Step 4:** Verify:
```bash
curl http://localhost:8000/health/providers
# Expected: {"llm":"ok","embedding":"ok","rerank":"ok"}
```

**Step 5:** Run a test analysis. Confirm all 5 parts present.

**Step 6:** Restrict outbound internet on backend container. Confirm workflow still completes.

### What Does NOT Change
- No application code modifications.
- PostgreSQL schema: identical.
- All API endpoints: identical.
- Frontend: identical.

---

## 18. Non-Negotiables Checklist

Before considering any phase complete:

- [ ] **No cloud SDK import outside `providers/`** — enforced by automated portability test.
- [ ] **No hardcoded model names, dimensions, project IDs, or credentials** anywhere in code.
- [ ] **Every finding has a validated citation** — `node_id` verified by `validators.py`, not just by prompt.
- [ ] **Full audit trail per analysis** — config snapshot, prompt version IDs, retrieved `node_id` list, all events persisted.
- [ ] **Human feedback stored per finding and surfaced in report** — it does NOT silently change AI output.
- [ ] **Temperature = 0 on all agents** (reproducibility).
- [ ] **Idempotent ingestion** — re-running `ascend ingest` produces identical row counts.
- [ ] **Portability test passes on every commit** (CI gate).
- [ ] **Disclaimer in UI and all exports:** *"AI-assisted output requires qualified human review and is not legal advice."*
- [ ] **README** explains: repo setup, Docker run, ingesting laws, running an analysis, switching to on-prem.
- [ ] **`docs/DECISIONS.md`** updated with every deviation from this spec.
- [ ] **Arabic RTL renders correctly** — no layout overflow, no mixed text direction.
- [ ] **Grounding-only generation** — every agent prompt forbids knowledge outside provided articles.

---

*This guide is the single source of truth for building ASCEND from scratch. All deviations must be documented in `docs/DECISIONS.md`.*
