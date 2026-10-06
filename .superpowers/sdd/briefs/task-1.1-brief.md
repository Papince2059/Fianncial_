### Task 1.1: Repository Scaffold & Docker Compose

**Files:**
- Create: `ascend/README.md`
- Create: `ascend/docker-compose.yml`
- Create: `ascend/.env.example`
- Create: `ascend/config.yaml`
- Create: `ascend/.gitignore`
- Create: `ascend/docs/DECISIONS.md`
- Create: `ascend/docs/ONPREM_MIGRATION.md` (stub)
- Create: `ascend/docs/EVALUATION.md` (stub)
- Create: `ascend/data/laws/.gitkeep`
- Create: `ascend/data/fixtures/.gitkeep`
- Create: `ascend/data/processes/.gitkeep`
- Create: `ascend/data/eval/.gitkeep`

**Interfaces:**
- Produces: running `postgres:16` container with `pgvector` extension, reachable at `localhost:5432`

- [ ] **Step 1: Write `docker-compose.yml`**

```yaml
# ascend/docker-compose.yml
version: "3.9"
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: ascend
      POSTGRES_PASSWORD: ascend
      POSTGRES_DB: ascend
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ascend"]
      interval: 5s
      retries: 10

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql+asyncpg://ascend:ascend@postgres:5432/ascend
    env_file: .env
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./data:/app/data

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend

volumes:
  pgdata:
```

- [ ] **Step 2: Write `.env.example`**

```dotenv
# ascend/.env.example
# ── Provider selection ──────────────────────────────────────────────────────
LLM_PROVIDER=vertex            # vertex | openai_compat
EMBEDDING_PROVIDER=vertex      # vertex | local
RERANK_PROVIDER=vertex         # vertex | local | none

# ── Vertex AI ───────────────────────────────────────────────────────────────
GOOGLE_CLOUD_PROJECT=
GOOGLE_CLOUD_LOCATION=
GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/vertex_credential.json
VERTEX_LLM_MODEL=
VERTEX_LLM_FAST_MODEL=
VERTEX_EMBEDDING_MODEL=
VERTEX_EMBEDDING_DIM=
VERTEX_RERANK_MODEL=

# ── On-prem ─────────────────────────────────────────────────────────────────
OPENAI_COMPAT_BASE_URL=http://vllm:8000/v1
OPENAI_COMPAT_API_KEY=local
OPENAI_COMPAT_MODEL=
LOCAL_EMBEDDING_MODEL=BAAI/bge-m3
LOCAL_EMBEDDING_DIM=1024
LOCAL_EMBEDDING_URL=
LOCAL_RERANK_MODEL=BAAI/bge-reranker-v2-m3

# ── Database ─────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql+asyncpg://ascend:ascend@postgres:5432/ascend

# ── API ──────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:5173
RATE_LIMIT_ANALYSES=10/minute

# ── App ──────────────────────────────────────────────────────────────────────
LOG_LEVEL=INFO
ENVIRONMENT=development
```

- [ ] **Step 3: Write `config.yaml`**

```yaml
# ascend/config.yaml
retrieval:
  top_k_vector: 20
  top_k_fts: 20
  top_n_rerank: 10
  query_expansion_count: 4
  research_max_iterations: 6

agents:
  review_max_retries: 1
  temperature: 0.0

ingestion:
  chunk_token_limit: 512
  batch_embed_size: 32
```

- [ ] **Step 4: Write `.gitignore`**

```gitignore
# ascend/.gitignore
__pycache__/
*.pyc
.env
*.json  # credential files
data/laws/
!data/laws/.gitkeep
.venv/
node_modules/
dist/
*.egg-info/
.mypy_cache/
.ruff_cache/
pgdata/
```

- [ ] **Step 5: Start docker compose and verify postgres**

```bash
cd ascend
docker compose up postgres -d
docker compose exec postgres pg_isready -U ascend
```
Expected: `localhost:5432 - accepting connections`

- [ ] **Step 6: Verify pgvector extension**

```bash
docker compose exec postgres psql -U ascend -c "CREATE EXTENSION IF NOT EXISTS vector; SELECT extname FROM pg_extension WHERE extname='vector';"
```
Expected output includes: `vector`

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "chore: repository scaffold and docker-compose"
```

---

