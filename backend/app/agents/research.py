# ascend/backend/app/agents/research.py
from app.agents.base_agent import load_prompt, call_with_schema, wrap_process
from app.agents.schemas import ResearchOutput, RelevantSection
from app.agents.validators import validate_citations
from app.providers.base import LLMProvider
from app.retrieval.service import RetrievedArticle


async def run_research(
    llm: LLMProvider,
    process_name: str,
    activities: list[str],
    retrieved_articles: list[RetrievedArticle],
) -> ResearchOutput:
    prompt = load_prompt("research_v1")
    retrieved_node_ids = {a.node_id for a in retrieved_articles}

    articles_text = "\n\n".join(
        f"[node_id={a.node_id}] [{a.path_text}]\n{a.text}"
        for a in retrieved_articles
    )
    user_content = (
        f"{wrap_process(process_name, activities)}\n\n"
        f"Retrieved Law Articles:\n{articles_text}"
    )

    output: ResearchOutput = await call_with_schema(llm, prompt, user_content, ResearchOutput)

    # Validate citations
    valid, rejected = validate_citations(
        [s for s in output.relevant_sections],  # type: ignore[arg-type]
        retrieved_node_ids,
    )
    if rejected:
        valid_node_ids = {s.node_id for s in valid}  # type: ignore[attr-defined]
        output = ResearchOutput(
            relevant_sections=[s for s in output.relevant_sections if s.node_id in valid_node_ids]
        )
    return output
