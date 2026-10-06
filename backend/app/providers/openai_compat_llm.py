import time
import json
from collections.abc import AsyncIterator
from tenacity import retry, stop_after_attempt, wait_exponential
from pydantic import BaseModel
from httpx import AsyncClient
from app.providers.base import Message, LLMResult
from app.settings import Settings


class OpenAICompatLLMProvider:
    def __init__(self, settings: Settings) -> None:
        self._base_url = settings.openai_compat_base_url
        self._api_key = settings.openai_compat_api_key
        self._model = settings.openai_compat_model

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
        payload: dict = {
            "model": self._model,
            "temperature": temperature,
            "messages": [{"role": "system", "content": system}]
            + [{"role": m.role, "content": m.content} for m in messages],
        }
        if response_schema:
            payload["response_format"] = {"type": "json_object"}
            payload["guided_json"] = response_schema.model_json_schema()
        if max_tokens:
            payload["max_tokens"] = max_tokens

        headers = {}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"

        async with AsyncClient() as client:
            resp = await client.post(
                f"{self._base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=120.0,
            )
            resp.raise_for_status()
            data = resp.json()

        text = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        return LLMResult(
            text=text,
            input_tokens=usage.get("prompt_tokens", 0),
            output_tokens=usage.get("completion_tokens", 0),
            latency_ms=(time.monotonic() - t0) * 1000,
        )

    async def stream(
        self,
        *,
        system: str,
        messages: list[Message],
        temperature: float = 0.0,
    ) -> AsyncIterator[str]:
        payload = {
            "model": self._model,
            "stream": True,
            "temperature": temperature,
            "messages": [{"role": "system", "content": system}]
            + [{"role": m.role, "content": m.content} for m in messages],
        }
        headers = {}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"

        async with AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self._base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=120.0,
            ) as resp:
                async for line in resp.aiter_lines():
                    if line.startswith("data: ") and line != "data: [DONE]":
                        chunk = json.loads(line[6:])
                        delta = chunk["choices"][0]["delta"].get("content", "")
                        if delta:
                            yield delta
