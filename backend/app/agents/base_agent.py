# ascend/backend/app/agents/base_agent.py
import json
from pathlib import Path
from pydantic import BaseModel, ValidationError
from app.providers.base import LLMProvider, Message, LLMResult

PROMPTS_DIR = Path(__file__).parent / "prompts"


def load_prompt(name: str) -> str:
    """Load a prompt file from agents/prompts/<name>.md"""
    path = PROMPTS_DIR / f"{name}.md"
    if not path.exists():
        raise FileNotFoundError(f"Prompt not found: {path}")
    return path.read_text(encoding="utf-8")


async def call_with_schema(
    llm: LLMProvider,
    system_prompt: str,
    user_content: str,
    schema: type[BaseModel],
    max_retries: int = 1,
) -> BaseModel:
    """Call LLM with structured output schema; retry once on parse failure."""
    messages = [Message(role="user", content=user_content)]
    for attempt in range(max_retries + 1):
        result: LLMResult = await llm.generate(
            system=system_prompt,
            messages=messages,
            response_schema=schema,
            temperature=0.0,
        )
        try:
            return schema.model_validate_json(result.text)
        except (ValidationError, json.JSONDecodeError) as e:
            if attempt == max_retries:
                raise RuntimeError(
                    f"LLM output failed schema validation after {max_retries+1} attempts: {e}\n"
                    f"Raw output: {result.text[:500]}"
                ) from e
            # Add the failed output to context for repair
            messages.append(Message(role="assistant", content=result.text))
            messages.append(Message(role="user", content=f"That response was invalid JSON. Fix it to match the schema exactly. Error: {e}"))
    raise RuntimeError("unreachable")


def wrap_process(process_text: str, activities: list[str]) -> str:
    """Wrap user process in injection-prevention delimiters."""
    act_str = "\n".join(f"  {i+1}. {a}" for i, a in enumerate(activities))
    return (
        "---USER_PROCESS_START---\n"
        f"Process: {process_text}\n\n"
        f"Activities:\n{act_str}\n"
        "---USER_PROCESS_END---"
    )
