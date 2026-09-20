"""Deterministic, dependency-free fallback for the AI pipeline.

Used when no LLM API keys are configured (or when the LLM call fails), so the
service is fully functional locally and in CI. Also provides the routing
tables (category → department) used by every provider.
"""

import csv
import re
from pathlib import Path
from typing import Optional

from app.models import QueryPriority

# ---------------------------------------------------------------------------
# Classification keywords
# ---------------------------------------------------------------------------

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    # More specific categories come first so ties resolve sensibly.
    "result": ["result", "grade", "marks", "gpa", "transcript", "incomplete", "grievance", "recheck", "reeval"],
    "admission": ["admission", "apply", "application", "enrol", "enroll", "enrolment", "eligibility"],
    "registration": ["register", "registration", "course load", "credit hour", "credit hours", "credit limit", "increase credit", "add course", "drop course", "enroll in", "enrol in"],
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
    "registration": "REG",
    "exam": "EXAM",
    "result": "EXAM",
    "fee": "FIN",
    "course": "CS",
    "technical": "TECH",
    "complaint": "SA",
    "leave": "SA",
    # General/unmatched queries belong to general administration rather than
    # being assigned to an academic or technical department.
    "general": "ADMIN",
}

COURSE_CODE_DEPARTMENTS = {
    "CS": "CS", "MGT": "MGT", "ECO": "ECO", "EDU": "EDU", "ENG": "ENG",
    "MCM": "MCM", "ISL": "ISL", "MTH": "MTH", "PAK": "PAK", "PHY": "PHY",
    "PSY": "PSY", "PAD": "PAD", "SOC": "SOC", "STA": "STA", "URD": "URD",
}


def department_code_for_query(text: str, category: str) -> str | None:
    """Resolve the department first; course instructors are never random."""
    lowered = text.lower()
    if any(term in lowered for term in ("credit hour", "credit hours", "credit limit", "increase credit")):
        return "ACA"
    code_match = re.search(r"\b([A-Z]{2,5})[- ]?\d{3}\b", text.upper())
    if code_match and code_match.group(1) in COURSE_CODE_DEPARTMENTS:
        return COURSE_CODE_DEPARTMENTS[code_match.group(1)]
    return CATEGORY_TO_DEPARTMENT.get(category)


def _reference_keywords() -> dict[str, list[str]]:
    """Load department/course vocabulary from the supplied account reference."""
    path = Path(__file__).resolve().parents[2] / "data" / "classification_reference.csv"
    if not path.exists():
        return {}

    department_categories = {
        "admissions": "admission", "finance": "fee", "examinations": "exam",
        "technical": "technical", "registrar": "registration",
    }
    keywords: dict[str, list[str]] = {}
    with path.open(newline="", encoding="utf-8-sig") as file:
        for row in csv.DictReader(file):
            relation = (row.get("HOD Email Relation") or "").lower()
            hod_key = relation.split(".")[0]
            category = department_categories.get(hod_key, "course" if ".hod@" in relation else "general")
            source = " ".join((row.get("Name") or "", row.get("Role Task") or "", row.get("Priority Assessment Keywords") or ""))
            keywords.setdefault(category, []).extend(re.findall(r"[a-z0-9]+(?:[- ][a-z0-9]+)*", source.lower()))
    return keywords


REFERENCE_KEYWORDS = _reference_keywords()


def _reference_course_routes() -> dict[str, str]:
    """Build exact course -> instructor routes from the supplied CSV."""
    path = Path(__file__).resolve().parents[2] / "data" / "classification_reference.csv"
    routes: dict[str, str] = {}
    if not path.exists():
        return routes
    with path.open(newline="", encoding="utf-8-sig") as file:
        for row in csv.DictReader(file):
            email = (row.get("Email") or "").strip().lower()
            role = (row.get("Role Task") or "").lower()
            name = (row.get("Name") or "").lower()
            if "instructor" not in role and "instructor" not in name:
                continue
            text = " ".join(row.get(key) or "" for key in ("Name", "Role Task", "Priority Assessment Keywords"))
            for code in re.findall(r"\b[A-Z]{2,5}[- ]?\d{3}\b", text.upper()):
                routes[code.replace("-", "").replace(" ", "")] = email
    return routes


REFERENCE_COURSE_ROUTES = _reference_course_routes()

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
        score = sum(2 for kw in set(keywords) if len(kw) > 2 and re.search(rf"(?<!\w){re.escape(kw)}(?!\w)", lowered))
        score += sum(1 for kw in set(REFERENCE_KEYWORDS.get(category, [])) if len(kw) > 2 and re.search(rf"(?<!\w){re.escape(kw)}(?!\w)", lowered))
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


def draft_reply_rules(
    category: str,
    subject: str,
    priority: QueryPriority,
    action: str = "resolve",
    sender_role: str = "STAFF",
    recipient_role: str = "",
) -> str:
    """Generate a reasonable draft reply without any LLM."""
    if action == "forward":
        if sender_role == "HOD" and recipient_role == "HOD":
            body = "Dear Sir, I am forwarding this query to you for better resolution as it requires your department's review. Kindly look into it and guide the student accordingly."
        elif sender_role == "HOD":
            body = "Please review this query and take the necessary action within your area of responsibility. Update the ticket once the student has been assisted."
        else:
            body = "Sir, kindly look into this query and resolve it as it requires your authority or departmental review. Please update the ticket with the outcome."
        return f"Subject: Re: {subject}\n\n{body}"
    template = CATEGORY_REPLIES.get(category, CATEGORY_REPLIES["general"])
    reply = template.format(category=category, university="our university")
    reply += " Please follow the applicable VU policy and official process, and reply with the required documents or details if further verification is needed."
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
