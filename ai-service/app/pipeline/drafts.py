"""Reply drafting (FR-05).

Generates a suggested reply stored on the query for staff to review/edit/send.
Uses Gemini first, Claude second, and the deterministic template only when
both configured providers fail.
"""

import logging

from app.config import settings
from app.models import Query, QueryPriority
from app.pipeline.rules import draft_reply_rules

logger = logging.getLogger(__name__)

DRAFT_PROMPT = (
    "You are a university support officer. Write a polite, concise reply "
    "(2-4 sentences) to this student query. Do not fabricate facts; invite "
    "follow-up and give a clear next step.\n\n"
    "Subject: {subject}\nCategory: {category}\nPriority: {priority}\n\n"
    "Message:\n{message}\n\nAction: {action}\n"
    "If forwarding, address the recipient role and explain why this query is being routed to them.\n"
    "Reply:"
)


def draft_reply(query: Query, category: str, priority: QueryPriority, action: str = "resolve", recipient: str = "") -> str:
    """Return a draft reply for the query (LLM with template fallback)."""
    if settings.gemini_api_key:
        llm_draft = _draft_with_gemini(query, category, priority, action, recipient)
        if llm_draft:
            logger.info("Generated AI draft with Gemini for query %s", query.id)
            return llm_draft
    if settings.anthropic_api_key:
        llm_draft = _draft_with_claude(query, category, priority, action, recipient)
        if llm_draft:
            logger.info("Generated AI draft with Claude for query %s", query.id)
            return llm_draft
    logger.warning("Using rules-based draft for query %s; AI providers failed", query.id)
    return draft_reply_rules(category, query.subject, priority)


def _draft_with_gemini(query: Query, category: str, priority: QueryPriority, action: str, recipient: str) -> str | None:
    try:
        from google import genai  # type: ignore

        client = genai.Client(api_key=settings.gemini_api_key)
        prompt = DRAFT_PROMPT.format(
            subject=query.subject,
            category=category,
            priority=priority.value,
            message=query.message,
            action=f"{action}; recipient: {recipient or 'the concerned university staff member'}",
        )
        raw = client.models.generate_content(
            model=settings.gemini_model, contents=prompt
        ).text
        return raw.strip() if raw and raw.strip() else None
    except Exception as exc:  # noqa: BLE001
        logger.warning("Gemini drafting failed, using template: %s", exc)
        return None


def _draft_with_claude(query: Query, category: str, priority: QueryPriority, action: str, recipient: str) -> str | None:
    try:
        import anthropic  # type: ignore

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        prompt = DRAFT_PROMPT.format(
            subject=query.subject,
            category=category,
            priority=priority.value,
            message=query.message,
            action=f"{action}; recipient: {recipient or 'the concerned university staff member'}",
        )
        response = client.messages.create(
            model=settings.claude_model,
            max_tokens=300,
            system="You are a university support officer. Return only the reply text.",
            messages=[{"role": "user", "content": prompt}],
        )
        raw = "".join(block.text for block in response.content if getattr(block, "type", "") == "text")
        return raw.strip() if raw.strip() else None
    except Exception as exc:  # noqa: BLE001
        logger.warning("Claude drafting failed, using template: %s", exc)
        return None
