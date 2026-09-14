"""Deterministic, dependency-free fallback for the AI pipeline.

Used when no LLM API keys are configured (or when the LLM call fails), so the
service is fully functional locally and in CI. Also provides the routing
tables (category → department) used by every provider.
"""

import re
from typing import Optional

from app.models import QueryPriority

# ---------------------------------------------------------------------------
# Classification keywords
# ---------------------------------------------------------------------------

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    # More specific categories come first so ties resolve sensibly.
    "result": ["result", "grade", "marks", "gpa", "transcript", "incomplete", "grievance", "recheck", "reeval"],
    "admission": ["admission", "apply", "application", "enrol", "enroll", "enrolment", "eligibility"],
    "registration": ["register", "registration", "course load", "add course", "drop course", "enroll in", "enrol in"],
    "exam": ["exam", "midterm", "final", "quiz", "paper", "schedule", "date sheet", "timing"],
    "fee": ["fee", "tuition", "payment", "scholarship", "financial aid", "dues", "voucher", "bill"],
    "course": ["course", "syllabus", "lecture", "assignment", "lab", "project", "teacher", "instructor", "cs302", "mgt"],
    "technical": ["portal", "login", "password", "lms", "website", "email not", "account", "technical", "error", "bug"],
    "complaint": ["complaint", "harassment", "unfair", "discrimination", "bullying"],
    "leave": ["leave", "absence", "off days", "vacation"],
    "general": ["question", "help", "info", "information", "contact", "where", "how", "what"],
}

PRIORITY_KEYWORDS: list[tuple[QueryPriority, list[str]]] = [
    (QueryPriority.URGENT, ["urgent", "asap", "immediately", "emergency", "deadline today", "last date today", "blocked"]),
    (QueryPriority.HIGH, ["soon", "deadline", "expire", "expired", "tomorrow", "tonight", "critical", "important", "not able to"]),
    (QueryPriority.LOW, ["whenever", "curious", "not urgent", "later"]),
]

CATEGORY_TO_DEPARTMENT: dict[str, str] = {
    "admission": "ADM",
    "registration": "CS",
    "exam": "EXAM",
    "result": "EXAM",
    "fee": "BA",
    "course": "CS",
    "technical": "CS",
    "complaint": "SA",
    "leave": "SA",
    "general": "SA",
}

# ---------------------------------------------------------------------------
# Classification
# ---------------------------------------------------------------------------

def classify_rules(text: str) -> tuple[str, QueryPriority, float]:
    """Classify a query with keywords. Returns (category, priority, confidence)."""
    lowered = text.lower()

    # "general" is the fallback bucket, not a real category - it never scores.
    best_category = "general"
    best_score = 0
    for category, keywords in CATEGORY_KEYWORDS.items():
        if category == "general":
            continue
        score = sum(1 for kw in keywords if kw in lowered)
        if score > best_score:
            best_score = score
            best_category = category

    priority = QueryPriority.NORMAL
    for p, keywords in PRIORITY_KEYWORDS:
        if any(re.search(rf"\b{kw}\b", lowered) or kw in lowered for kw in keywords):
            priority = p
            break

    # Confidence reflects how many keyword signals matched.
    if best_category == "general":
        confidence = 0.3
    else:
        confidence = min(0.95, 0.35 + best_score * 0.2)

    return best_category, priority, confidence


# ---------------------------------------------------------------------------
# Reply drafting (template-based fallback for FR-05)
# ---------------------------------------------------------------------------

CATEGORY_REPLIES: dict[str, str] = {
    "admission": (
        "Thank you for your interest in {university}. Regarding your {category} query, please find the details below. "
        "For further assistance, visit the Admissions Office or reply to this ticket."
    ),
    "registration": (
        "Thank you for contacting us about {category}. Your registration request has been received. "
        "Kindly ensure you have completed the prerequisites for the course. If you need help enrolling, "
        "reply to this ticket and we will assist you."
    ),
    "exam": (
        "Thank you for your {category}-related query. The relevant schedule and procedures are attached. "
        "Please check the examination portal for updates, or reply here if you need clarification."
    ),
    "result": (
        "Thank you for reaching out about your {category}. We have forwarded your query to the Examination Department "
        "for verification. You will receive an update shortly. If you believe there is an error, please share your "
        "student ID and course code in a reply."
    ),
    "fee": (
        "Thank you for your query regarding {category}. Payment details and deadlines are available on the finance "
        "portal. For extensions or assistance, reply to this ticket and our team will look into it."
    ),
    "course": (
        "Thank you for your query about {category}. Our team is reviewing your request and will get back to you "
        "with the relevant information shortly."
    ),
    "technical": (
        "Thank you for reporting this {category} issue. Please try clearing your browser cache and logging in again. "
        "If the problem persists, reply with your student ID and the exact error message."
    ),
    "complaint": (
        "Thank you for bringing this matter to our attention. It has been escalated to Student Affairs, and a "
        "representative will contact you. Please know that all reports are handled confidentially."
    ),
    "leave": (
        "Thank you for your {category} request. It has been forwarded to the concerned department for approval. "
        "You will be notified of the outcome."
    ),
    "general": (
        "Thank you for contacting the university support desk. Your query has been routed to the appropriate "
        "department and you will receive a response shortly."
    ),
}


def draft_reply_rules(category: str, subject: str, priority: QueryPriority) -> str:
    """Generate a reasonable draft reply without any LLM."""
    template = CATEGORY_REPLIES.get(category, CATEGORY_REPLIES["general"])
    reply = template.format(category=category, university="our university")
    if priority in (QueryPriority.HIGH, QueryPriority.URGENT):
        reply = (
            "We have flagged your query as high priority and it is being handled urgently. "
            + reply
        )
    return f"Subject: Re: {subject}\n\n{reply}"


def format_prompt(text: str) -> str:
    """Build the classification prompt used by the LLM providers."""
    return (
        "You are an assistant for a university query routing system. Classify the "
        "student's query into exactly one category and a priority.\n\n"
        "Categories: admission, registration, exam, result, fee, course, technical, "
        "complaint, leave, general.\n"
        "Priorities: LOW, NORMAL, HIGH, URGENT.\n\n"
        f"Query:\n{text}\n\n"
        'Reply with JSON only: {"category": "...", "priority": "...", '
        '"confidence": 0.0-1.0, "summary": "one sentence"}'
    )