# ascend/backend/app/providers/vertex_llm.py
import time
from typing import AsyncIterator
from tenacity import retry, stop_after_attempt, wait_exponential
from pydantic import BaseModel
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig
from app.providers.base import Message, LLMResult
from app.settings import Settings


class VertexLLMProvider:
    def __init__(self, settings: Settings, *, fast: bool = False) -> None:
        import os
        from pathlib import Path
        if settings.google_application_credentials and Path(settings.google_application_credentials).exists():
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(Path(settings.google_application_credentials).resolve())

        vertexai.init(
            project=settings.google_cloud_project,
            location=settings.google_cloud_location,
        )
        model_name = settings.vertex_llm_fast_model if fast else settings.vertex_llm_model
        self._model = GenerativeModel(model_name)
        self._model_name = model_name

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def generate(
        self,
        *,
        system: str,
        messages: list[Message],
        response_schema: type[BaseModel] | None = None,
        temperature: float = 0.0,
        max_tokens: int | None = None,
    ) -> LLMResult:
        t0 = time.monotonic()
        config_kwargs: dict = {"temperature": temperature}
        if max_tokens:
            config_kwargs["max_output_tokens"] = max_tokens
        if response_schema:
            config_kwargs["response_mime_type"] = "application/json"
            config_kwargs["response_schema"] = response_schema.model_json_schema()

        prompt = self._build_prompt(system, messages)
        response = await self._model.generate_content_async(
            prompt, generation_config=GenerationConfig(**config_kwargs)
        )
        return LLMResult(
            text=response.text,
            input_tokens=response.usage_metadata.prompt_token_count,
            output_tokens=response.usage_metadata.candidates_token_count,
            latency_ms=(time.monotonic() - t0) * 1000,
        )

    async def stream(
        self,
        *,
        system: str,
        messages: list[Message],
        temperature: float = 0.0,
    ) -> AsyncIterator[str]:
        prompt = self._build_prompt(system, messages)
        async for chunk in await self._model.generate_content_async(
            prompt, generation_config=GenerationConfig(temperature=temperature), stream=True
        ):
            yield chunk.text

    def _build_prompt(self, system: str, messages: list[Message]) -> str:
        parts = [f"System: {system}"]
        for m in messages:
            parts.append(f"{m.role.capitalize()}: {m.content}")
        return "\n\n".join(parts)
