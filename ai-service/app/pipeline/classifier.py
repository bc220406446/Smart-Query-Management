"""Classification providers (FR-03).

Provider chain, LangChain-style orchestration:

1. Local reference/rules classifier - always used for category, intent,
   department, and priority routing.
2. Gemini/Claude are reserved for natural-language reply drafting.

Each provider is optional: the SDK import happens lazily inside the provider's
__init__, so the service runs even when the AI dependencies are not installed.
"""

import json
import logging
from dataclasses import dataclass
from typing import Optional

from app.config import settings
from app.models import QueryPriority
from app.pipeline.rules import classify_rules, department_code_for_query, format_prompt

logger = logging.getLogger(__name__)


@dataclass
class ClassificationResult:
    category: str
    priority: QueryPriority
    confidence: float
    summary: str
    provider: str
    department_code: Optional[str] = None


def _parse_model_output(raw: object) -> Optional[dict]:
    """Best-effort JSON parse of an LLM reply."""
    if isinstance(raw, list):
        # Some google-genai response versions expose text parts as a list.
        raw = "".join(
            part if isinstance(part, str) else str(getattr(part, "text", part))
            for part in raw
        )
    if not isinstance(raw, str):
        raw = str(raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    # Try extracting the first {...} block.
    try:
        start = raw.index("{")
        end = raw.rindex("}") + 1
        return json.loads(raw[start:end])
    except (ValueError, json.JSONDecodeError):
        return None


class GeminiProvider:
    def __init__(self) -> None:
        self.available = bool(settings.gemini_api_key)
        self._client = None
        self._lc_chain = None
        if not self.available:
            return
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI  # type: ignore
            from langchain_core.prompts import ChatPromptTemplate  # type: ignore

            model = ChatGoogleGenerativeAI(
                model=settings.gemini_model, api_key=settings.gemini_api_key
            )
            self._lc_chain = ChatPromptTemplate.from_messages(
                [("human", "{input}")]
            ) | model
        except ImportError:
            try:
                from google import genai  # type: ignore

                self._client = genai.Client(api_key=settings.gemini_api_key)
            except ImportError:
                logger.warning("Gemini API key set but google-genai SDK missing.")
                self.available = False

    def classify(self, text: str) -> Optional[ClassificationResult]:
        prompt = format_prompt(text)
        try:
            if self._lc_chain is not None:
                raw = self._lc_chain.invoke({"input": prompt}).content
            elif self._client is not None:
                raw = self._client.models.generate_content(
                    model=settings.gemini_model, contents=prompt
                ).text
            else:
                return None
            return _to_result(raw, provider="gemini", text=text)
        except Exception as exc:  # noqa: BLE001 - fall back on any provider error
            logger.warning("Gemini classification failed: %s", exc)
            return None


class ClaudeProvider:
    def __init__(self) -> None:
        self.available = bool(settings.anthropic_api_key)
        self._client = None
        if not self.available:
            return
        try:
            import anthropic  # type: ignore

            self._client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        except ImportError:
            logger.warning("Anthropic API key set but anthropic SDK missing.")
            self.available = False

    def classify(self, text: str) -> Optional[ClassificationResult]:
        prompt = format_prompt(text)
        try:
            if self._client is None:
                return None
            msg = self._client.messages.create(
                model=settings.claude_model,
                max_tokens=256,
                system="You classify university queries into categories and priorities.",
                messages=[{"role": "user", "content": prompt}],
            )
            raw = "".join(block.text for block in msg.content if getattr(block, "type", "") == "text")
            return _to_result(raw, provider="claude", text=text)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Claude classification failed: %s", exc)
            return None


def _to_result(raw: str, provider: str, text: str = "") -> Optional[ClassificationResult]:
    data = _parse_model_output(raw)
    if not data:
        return None
    category = str(data.get("category", "general")).strip().lower()
    if category not in {
        "admission", "registration", "exam", "result", "fee", "course",
        "technical", "complaint", "leave", "general",
    }:
        category = "general"
    try:
        priority = QueryPriority(str(data.get("priority", "NORMAL")).upper())
    except ValueError:
        priority = QueryPriority.NORMAL
    confidence = float(data.get("confidence", 0.6))
    confidence = max(0.0, min(1.0, confidence))
    return ClassificationResult(
        category=category,
        priority=priority,
        confidence=confidence,
        summary=str(data.get("summary", category)),
        provider=provider,
        department_code=department_code_for_query(text, category),
    )


def classify_text(text: str) -> ClassificationResult:
    """Classify locally so routing is deterministic and department-safe."""
    category, priority, confidence = classify_rules(text)
    return ClassificationResult(
        category=category,
        priority=priority,
        confidence=confidence,
        summary=f"rule-based classification: {category}",
        provider="local_rules",
        department_code=department_code_for_query(text, category),
    )
