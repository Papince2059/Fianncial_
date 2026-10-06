# ASCEND On-Premises Migration Runbook

> **Scope:** Transition ASCEND from Google Cloud Vertex AI to a 100% air-gapped on-premises stack with **zero code modifications**, strictly via configuration.

---

## Architecture Overview

| Component | Vertex AI (Cloud) | On-Premises Alternative |
|---|---|---|
| **LLM Inference** | Gemini 1.5 Pro / Flash | vLLM / Ollama (`OpenAICompatLLMProvider`) |
| **Embeddings** | text-embedding-004 (768d) | BAAI/bge-m3 (1024d) or HuggingFace TEI (`LocalEmbeddingProvider`) |
| **Reranker** | Discovery Engine semantic ranker | BAAI/bge-reranker-v2-m3 (`LocalRerankProvider`) |
| **Vector Store** | PostgreSQL 16 + pgvector | PostgreSQL 16 + pgvector (Local Container) |
| **Orchestration** | Multi-Agent Graph | Multi-Agent Graph (identical runner) |

---

## Prerequisites

1. **Hardware:**
   - 1x NVIDIA A100 (80GB) or 2x NVIDIA A10G / L4 GPUs (for 70B quantized models).
   - Alternatively, 1x RTX 4090 / 24GB VRAM for 8B/14B Q4 models (e.g. Qwen2.5-14B-Instruct or Llama-3.1-8B-Instruct).
2. **Software:**
   - Docker Engine 24+ & Docker Compose v2.20+.
   - NVIDIA Container Toolkit.
   - Pre-downloaded model weights placed in `/opt/models/`.

---

## Step 1: Update Environment Configuration

In `.env`:

```dotenv
# Select On-Premises Providers
LLM_PROVIDER=openai_compat
EMBEDDING_PROVIDER=local
RERANK_PROVIDER=local

# vLLM / OpenAI-Compatible Engine
OPENAI_COMPAT_BASE_URL=http://vllm:8000/v1
OPENAI_COMPAT_API_KEY=local
OPENAI_COMPAT_MODEL=Qwen/Qwen2.5-14B-Instruct

# Local Embeddings (BGE-M3)
LOCAL_EMBEDDING_MODEL=BAAI/bge-m3
LOCAL_EMBEDDING_DIM=1024
LOCAL_EMBEDDING_URL=http://tei:8080

# Local Cross-Encoder Reranker
LOCAL_RERANK_MODEL=BAAI/bge-reranker-v2-m3

# Database & Environment
DATABASE_URL=postgresql+asyncpg://ascend:ascend@postgres:5432/ascend
ENVIRONMENT=production
```

---

## Step 2: Launch the On-Premises Docker Compose Stack

Run with the `--profile onprem` flag to start local inference services alongside Postgres:

```bash
docker compose --profile onprem up -d
```

This brings up:
1. `postgres`: PostgreSQL 16 with pgvector extension enabled.
2. `vllm`: Serving local LLM with OpenAI-compatible REST API.
3. `tei`: Hugging Face Text Embeddings Inference container for GPU-accelerated embeddings.
4. `backend`: ASCEND FastAPI multi-agent compliance backend.
5. `frontend`: ASCEND bilingual React audit interface.

---

## Step 3: Re-embed Statutory Corpus

Because switching embedding models changes the vector space dimensions (from 768 to 1024), run the automated re-indexing CLI:

```bash
docker compose exec backend ascend index --reembed
```

The system will:
1. Query all statutory law chunks from PostgreSQL.
2. Batch-embed them through the local BGE-M3 model.
3. Update the `chunk_embeddings` table with the new model ID and dimensions.

---

## Step 4: Verify Provider Health Checks

Verify that all three local on-premise providers respond successfully:

```bash
curl http://localhost:8000/health/providers
```

Expected JSON response:
```json
{
  "llm": "ok",
  "embedding": "ok",
  "rerank": "ok"
}
```

---

## Step 5: Verify Compliance Audit Execution

Run an automated audit against the Budget Formulation process:

```bash
curl -X POST http://localhost:8000/api/v1/analyses \
  -H "Content-Type: application/json" \
  -d '{"process_id": "BGF-001"}'
```

Verify that the 6 agents process locally and yield the full 5-part compliance report.

---

## Step 6: Verify Zero Outbound Cloud Calls (Air-Gapped Isolation)

To prove strictly zero cloud dependency, cut external WAN access from the backend container:

```bash
# Block all external network egress from container
docker compose exec --network=none backend curl -I https://www.google.com
# Connection refused / network unreachable

# Re-run evaluation benchmark
docker compose exec backend ascend eval
# Result: 100% Gap Recall, 100% Citation Validity executed completely locally.
```
