# ASCEND — Architecture Decisions

> Record every deviation from the build spec here with rationale.

| # | Decision | Rationale | Alternatives Considered |
|---|----------|-----------|------------------------|
| 1 | LangGraph instead of LlamaIndex (original demo) | Explicit state machine; per-node SSE events; resumable on failure | LlamaIndex (original Capgemini stack), LangChain |
| 2 | Google Vertex AI as default LLM/embedding/rerank provider | Client requirement; matches Dubai DOF cloud strategy | Azure OpenAI (original demo), AWS Bedrock |
| 3 | PostgreSQL 16 + pgvector for vector storage | Single store for vectors + relational metadata + feedback; identical cloud/on-prem | Pinecone, Weaviate, Chroma |
| 4 | Alembic for DB migrations | Industry standard for PostgreSQL schema versioning | Django ORM migrations, Flyway |
| 5 | pydantic-settings for all config | Type-safe; single source of truth; env + yaml merge | dynaconf, python-dotenv |
