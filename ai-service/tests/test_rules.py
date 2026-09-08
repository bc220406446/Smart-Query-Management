from app.models import QueryPriority
from app.pipeline.rules import (
    CATEGORY_TO_DEPARTMENT,
    classify_rules,
    draft_reply_rules,
    format_prompt,
)


def test_classify_result_keywords():
    category, priority, confidence = classify_rules(
        "I cannot see my midterm result in the portal, please check my marks"
    )
    assert category == "result"
    assert confidence >= 0.3


def test_classify_exam_keywords():
    category, _, _ = classify_rules("When is the final exam date sheet coming out?")
    assert category == "exam"


def test_classify_urgent_priority():
    _, priority, _ = classify_rules(
        "URGENT: my fee deadline is today and I am blocked from the portal"
    )
    assert priority == QueryPriority.URGENT


def test_classify_general_fallback():
    category, _, confidence = classify_rules("hello there, how are you doing today?")
    assert category == "general"
    assert confidence < 0.5


def test_category_to_department_mapping():
    assert CATEGORY_TO_DEPARTMENT["exam"] == "EXAM"
    assert CATEGORY_TO_DEPARTMENT["admission"] == "ADM"
    assert CATEGORY_TO_DEPARTMENT["course"] == "CS"


def test_draft_reply_mentions_subject():
    reply = draft_reply_rules("exam", "Final exam schedule", QueryPriority.NORMAL)
    assert "Final exam schedule" in reply


def test_draft_reply_high_priority_prefix():
    reply = draft_reply_rules("fee", "Fee payment", QueryPriority.URGENT)
    assert "high priority" in reply.lower()


def test_format_prompt_contains_query():
    prompt = format_prompt("sample query text")
    assert "sample query text" in prompt
    assert "admission" in prompt