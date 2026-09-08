"""Reply drafting (FR-05).

Generates a suggested reply stored on the query for staff to review/edit/send.
Uses the template layer by default; when a Gemini key is configured it tries an
LLM draft first and falls back to the template.
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
    "Message:\n{message}\n\nReply:"
)


def draft_reply(query: Query, category: str, priority: QueryPriority) -> str:
    """Return a draft reply for the query (LLM with template fallback)."""
    if settings.gemini_api_key:
        llm_draft = _draft_with_gemini(query, category, priority)
        if llm_draft:
            return llm_draft
    return draft_reply_rules(category, query.subject, priority)


def _draft_with_gemini(query: Query, category: str, priority: QueryPriority) -> str | None:
    try:
        from google import genai  # type: ignore

        client = genai.Client(api_key=settings.gemini_api_key)
        prompt = DRAFT_PROMPT.format(
            subject=query.subject,
            category=category,
            priority=priority.value,
            message=query.message,
        )
        raw = client.models.generate_content(
            model=settings.gemini_model, contents=prompt
        ).text
        return raw.strip() if raw and raw.strip() else None
    except Exception as exc:  # noqa: BLE001
        logger.warning("Gemini drafting failed, using template: %s", exc)
        return None