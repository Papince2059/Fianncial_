# ascend/backend/app/agents/review.py
from app.agents.base_agent import load_prompt, call_with_schema
from app.agents.schemas import ReviewDecision
from app.providers.base import LLMProvider


async def run_review(llm: LLMProvider, content_to_review: str) -> ReviewDecision:
    prompt = load_prompt("review_v1")
    output = await call_with_schema(llm, prompt, content_to_review, ReviewDecision)
    return output  # type: ignore[return-value]
