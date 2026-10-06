# ascend/backend/app/settings.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator
from pathlib import Path
import yaml


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Provider selection
    llm_provider: str = "vertex"          # vertex | openai_compat
    embedding_provider: str = "vertex"    # vertex | local
    rerank_provider: str = "vertex"       # vertex | local | none

    # Vertex AI
    google_cloud_project: str = ""
    google_cloud_location: str = "us-central1"
    google_application_credentials: str = ""
    vertex_llm_model: str = ""
    vertex_llm_fast_model: str = ""
    vertex_embedding_model: str = ""
    vertex_embedding_dim: int = 0
    vertex_rerank_model: str = ""

    # On-prem
    openai_compat_base_url: str = "http://vllm:8000/v1"
    openai_compat_api_key: str = "local"
    openai_compat_model: str = ""
    local_embedding_model: str = "BAAI/bge-m3"
    local_embedding_dim: int = 1024
    local_embedding_url: str = ""
    local_rerank_model: str = "BAAI/bge-reranker-v2-m3"

    # Database
    database_url: str = "postgresql+asyncpg://ascend:ascend@localhost:5432/ascend"

    # API
    allowed_origins: str = "http://localhost:25173,http://localhost:5173"
    rate_limit_analyses: str = "10/minute"

    # App
    log_level: str = "INFO"
    environment: str = "development"

    # Internal: populated by load_settings()
    _yaml_config: dict = {}

    @model_validator(mode="after")
    def validate_providers(self) -> "Settings":
        # Skip validation in test/stub mode when models are placeholder values
        if self.environment == "test":
            return self
        if self.llm_provider == "vertex" and not self.vertex_llm_model:
            raise ValueError(
                "VERTEX_LLM_MODEL must be set when LLM_PROVIDER=vertex. "
                "Set it in .env or as an environment variable."
            )
        if self.llm_provider == "openai_compat" and not self.openai_compat_model:
            raise ValueError(
                "OPENAI_COMPAT_MODEL must be set when LLM_PROVIDER=openai_compat."
            )
        if self.embedding_provider == "vertex" and not self.vertex_embedding_model:
            raise ValueError("VERTEX_EMBEDDING_MODEL must be set when EMBEDDING_PROVIDER=vertex.")
        if self.embedding_provider == "vertex" and self.vertex_embedding_dim == 0:
            raise ValueError("VERTEX_EMBEDDING_DIM must be set to a positive integer.")
        return self

    def get_yaml(self, *keys: str, default=None):  # type: ignore[return]
        """Access nested config.yaml values by dotted key path."""
        node: object = self._yaml_config
        for k in keys:
            if not isinstance(node, dict):
                return default
            node = node.get(k, default)
        return node


def load_settings() -> Settings:
    yaml_path = Path(__file__).parent.parent.parent / "config.yaml"
    yaml_data: dict = {}
    if yaml_path.exists():
        with yaml_path.open() as f:
            yaml_data = yaml.safe_load(f) or {}
    s = Settings()
    s._yaml_config = yaml_data
    return s


settings = load_settings()
