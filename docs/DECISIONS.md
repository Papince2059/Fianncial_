# ASCEND — Architecture Decisions Record (ADR)

> Record of key architectural decisions, rationales, and trade-offs made during platform design and implementation.

| # | Decision | Rationale | Alternatives Considered |
|---|----------|-----------|------------------------|
| 1 | Multi-Agent Graph Architecture | Explicit state machine; per-agent event streaming via SSE; independent error isolation and retries | Monolithic single-prompt LLM, Sequential LangChain chains |
| 2 | Google Vertex AI as default provider with zero-code on-prem switch | Cloud stack matches Dubai DOF cloud strategy; zero-code switch guarantees air-gapped sovereign deployment readiness | Hardcoded Vertex SDK calls, vendor-locked proprietary cloud vectors |
| 3 | PostgreSQL 16 + pgvector for unified storage | Single ACID store for vectors, hierarchical law AST, process catalog, analysis results, and feedback logs; identical stack on cloud & on-prem | Pinecone, Qdrant, Chroma, Weaviate |
| 4 | NullPool for SQLAlchemy Async Engine | Eliminates connection loop-binding conflicts in asyncpg across pytest-asyncio and FastAPI concurrent requests | Standard QueuePool (caused attached-to-different-loop errors) |
| 5 | Unconstrained `Vector()` column with explicit `embedding_dim` tracking | Supports text-embedding-004 (768d), BGE-M3 (1024d), OpenAI text-embedding-3 (1536d), and test stubs without schema mutations | Fixed Vector(1536) (failed on different model dimensions) |
| 6 | AST Automated Portability Test (`test_portability.py`) | Statically verifies that cloud SDK imports (`google.cloud`, `vertexai`) NEVER leak outside `app/providers/`, safeguarding air-gapped guarantees | Manual code reviews, runtime inspection |
| 7 | Reciprocal Rank Fusion (RRF k=60) for Hybrid Search | Proven rank fusion technique combining semantic cosine similarity and full-text keyword search without requiring score calibration | Simple weighted score addition, Vector-only retrieval |
| 8 | Hierarchical Breadcrumb Injection | Chunks retain legal context (`Law > Chapter > Article`) inside text and metadata, enabling agents to recognize statutory boundaries | Flat chunking, standard sliding window |
| 9 | Deterministic Rubric Compliance Evaluation | Formulates an objective calculation of compliance status based on severity of identified statutory gaps | Pure LLM hallucination of overall status |
| 10 | Bilingual (English & Arabic RTL) React 19 + Tailwind 4 UI | Native Arabic legal vocabulary (`المتن التشريعي`, `الفجوات`, `الامتثال`) with automatic `dir="rtl"` layout toggling | Separate localized portals, English-only MVP |
