# ascend/backend/app/providers/vertex_llm.py
import time
from typing import AsyncIterator
from tenacity import retry, stop_after_attempt, wait_exponential
from pydantic import BaseModel
from google import genai
from google.genai import types
from app.providers.base import Message, LLMResult
from app.settings import Settings


class VertexLLMProvider:
    def __init__(self, settings: Settings, *, fast: bool = False) -> None:
        import os
        from pathlib import Path
        candidates = []
        if settings.google_application_credentials:
            candidates.append(Path(settings.google_application_credentials))
        candidates.extend([
            Path("/app/vertex_credentials.json"),
            Path("vertex_credentials.json"),
            Path("../vertex_credentials.json"),
        ])
        for c in candidates:
            if c.exists():
                os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(c.resolve())
                break

        self._client = genai.Client(
            vertexai=True,
            project=settings.google_cloud_project,
            location=settings.google_cloud_location,
        )
        self._model_name = settings.vertex_llm_fast_model if fast else settings.vertex_llm_model

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
        if system:
            config_kwargs["system_instruction"] = system
        if response_schema:
            config_kwargs["response_mime_type"] = "application/json"
            config_kwargs["response_schema"] = response_schema

        config = types.GenerateContentConfig(**config_kwargs)
        prompt = self._build_prompt(messages)
        response = await self._client.aio.models.generate_content(
            model=self._model_name,
            contents=prompt,
            config=config,
        )
        in_tokens = response.usage_metadata.prompt_token_count if response.usage_metadata else 0
        out_tokens = response.usage_metadata.candidates_token_count if response.usage_metadata else 0
        return LLMResult(
            text=response.text or "",
            input_tokens=in_tokens,
            output_tokens=out_tokens,
            latency_ms=(time.monotonic() - t0) * 1000,
        )

    async def stream(
        self,
        *,
        system: str,
        messages: list[Message],
        temperature: float = 0.0,
    ) -> AsyncIterator[str]:
        config = types.GenerateContentConfig(temperature=temperature, system_instruction=system)
        prompt = self._build_prompt(messages)
        async for chunk in await self._client.aio.models.generate_content_stream(
            model=self._model_name,
            contents=prompt,
            config=config,
        ):
            if chunk.text:
                yield chunk.text

    def _build_prompt(self, messages: list[Message]) -> str:
        parts = []
        for m in messages:
            parts.append(f"{m.role.capitalize()}: {m.content}")
        return "\n\n".join(parts) if parts else "Audit analysis request"

