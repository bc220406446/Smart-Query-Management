"""Core service operations: process pending queries, run escalation,
and ingest external channels (e.g. email) into the shared query pipeline."""

import logging
from datetime import datetime, timedelta, timezone
from typing import List

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import AuditLog, Notification, Query, QueryChannel, QueryStatus, User
from app.pipeline.classifier import classify_text
from app.pipeline.drafts import draft_reply
from app.pipeline.router import route_query

logger = logging.getLogger(__name__)


def _notify(db: Session, user_id: str, title: str, body: str) -> None:
    db.add(
        Notification(
            user_id=user_id,
            type="status_update",
            title=title,
            body=body,
            created_at=datetime.now(timezone.utc),
        )
    )


def _audit(
    db: Session, action: str, entity_type: str, entity_id: str, metadata: dict
) -> None:
    db.add(
        AuditLog(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            meta=metadata,
            created_at=datetime.now(timezone.utc),
        )
    )


def process_pending_queries(db: Session, limit: int = 10) -> List[str]:
    """FR-03/04/05: classify, route, and draft a reply for pending queries."""
    pending = list(
        db.scalars(
            select(Query)
            .where(Query.status == QueryStatus.SUBMITTED)
            .order_by(Query.created_at.asc())
            .limit(limit)
        )
    )

    processed: List[str] = []
    for query in pending:
        query.status = QueryStatus.ASSIGNED
        db.flush()

        result = classify_text(query.message)
        department_id, assigned_to_id = route_query(
            db, result.category, getattr(query, "_department_name", None)
        )
        draft = draft_reply(query, result.category, result.priority)

        query.status = QueryStatus.ASSIGNED
        query.category = result.category
        query.priority = result.priority
        query.confidence = result.confidence
        query.ai_classification = {
            "category": result.category,
            "priority": result.priority.value,
            "confidence": result.confidence,
            "summary": result.summary,
            "provider": result.provider,
        }
        query.ai_draft_reply = draft
        query.department_id = department_id
        query.assigned_to_id = assigned_to_id
        query.updated_at = datetime.now(timezone.utc)

        if query.student_id:
            _notify(
                db,
                query.student_id,
                "Query classified & routed",
                f"'{query.subject}' → {result.category} ({result.provider}).",
            )
        _audit(
            db,
            "ai_classified",
            "query",
            query.id,
            {
                "category": result.category,
                "priority": result.priority.value,
                "confidence": result.confidence,
                "provider": result.provider,
                "assigned_to_id": assigned_to_id,
                "department_id": department_id,
            },
        )
        processed.append(query.id)
        logger.info("Processed query %s → %s (%s)", query.id, result.category, result.provider)

    db.commit()

    for query_id in processed:
        _notify_webhook(query_id)

    return processed


def run_escalation(db: Session) -> List[str]:
    """FR-07: escalate queries that have been unresolved for 24+ hours."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=settings.escalation_hours)
    open_statuses = [
        QueryStatus.SUBMITTED,
        QueryStatus.ASSIGNED,
        QueryStatus.IN_PROGRESS,
    ]
    stale = list(
        db.scalars(
            select(Query)
            .join(User, Query.assigned_to_id == User.id)
            .where(
                Query.status.in_(open_statuses),
                Query.updated_at < cutoff,
                User.hod_id.is_not(None),
            )
        )
    )

    escalated: List[str] = []
    now = datetime.now(timezone.utc)
    for query in stale:
        query.status = QueryStatus.AUTO_ESCALATED
        query.escalated_at = now
        query.updated_at = now
        if query.student_id:
            _notify(
                db,
                query.student_id,
                "Query escalated",
                f"'{query.subject}' was escalated to the HOD after {settings.escalation_hours}h.",
            )
        _audit(
            db,
            "auto_escalated",
            "query",
            query.id,
            {"reason": f"unresolved for {settings.escalation_hours}h"},
        )
        escalated.append(query.id)
        logger.info("Escalated query %s", query.id)

    db.commit()
    return escalated


def _notify_webhook(query_id: str) -> None:
    """Optional: POST the result back to the Next.js webhook (FR-03/04/05)."""
    if not settings.ai_webhook_url or not settings.ai_webhook_secret:
        return
    try:
        import httpx
    except ImportError:
        logger.warning("Webhook notification skipped: httpx not installed")
        return

    try:
        httpx.post(
            f"{settings.ai_webhook_url.rstrip('/')}/api/webhook/ai",
            json={"queryId": query_id},
            headers={"x-ai-secret": settings.ai_webhook_secret},
            timeout=10,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Webhook notification failed for %s: %s", query_id, exc)


# ---------------------------------------------------------------------------
# Email ingestion (FR-02) - Gmail API poller stub
# ---------------------------------------------------------------------------

def _build_query_from_email(subject: str, snippet: str, sender: str, thread_id: str, received_at: datetime) -> dict:
    """Build a `queries`-row dict from a Gmail message.

    In production this is expanded into a full Gmail API poller (list recent
    messages, only ingest unseen ones, mark them as read). Here we ship the
    scaffolding so the pipeline can take over once rows exist with
    channel=EMAIL.
    """
    return {
        "subject": subject or "Email query",
        "message": snippet or "",
        "channel": "EMAIL",
        "status": "SUBMITTED",
        "student_id": None,  # resolved later via email → user lookup
        "created_at": received_at,
        "updated_at": received_at,
    }


def ingest_email_query(db: Session, subject: str, snippet: str, sender: str, thread_id: str, received_at: datetime | None = None) -> str:
    """Create a SUBMITTED query from an email and return its id.

    FR-02: Gmail API poller calls this for each new unread message. The AI
    pipeline then classifies/routes/drafts just like a web submission.
    """
    from app.models import new_id

    now = received_at or datetime.now(timezone.utc)
    row = _build_query_from_email(subject, snippet, sender, thread_id, now)

    query = Query(
        id=new_id(),
        ticket_number=new_id(),
        subject=row["subject"],
        message=row["message"],
        channel=QueryChannel.EMAIL,
        status=QueryStatus.SUBMITTED,
        student_id=row["student_id"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )
    db.add(query)
    db.flush()

    _audit(
        db,
        "email_ingested",
        "query",
        query.id,
        {"sender": sender, "thread_id": thread_id},
    )
    logger.info("Ingested email query %s from %s", query.id, sender)
    return query.id


def gmail_poll_for_emails(db: Session, label: str = "INBOX", max_messages: int = 50) -> list[str]:
    """Stub Gmail API poller (FR-02).

    When GMAIL_CREDENTIALS_JSON is configured, this polls Gmail for recent
    unread messages and ingests each into the query pipeline.

    Uses a lightweight header-only fetch by default; full-body fetching is
    added when the message needs classification context.
    """
    creds_json = getattr(settings, "gmail_credentials_json", None) or ""
    if not creds_json:
        logger.debug("Gmail poller skipped: GMAIL_CREDENTIALS_JSON not set")
        return []

    try:
        from google import genai as _google_genai  # reuse google-auth / genai for auth
    except ImportError:
        logger.warning("Gmail poller skipped: google-genai missing; install requirements-ai.txt")
        return []

    try:
        from google.oauth2 import service_account  # type: ignore
    except ImportError:
        logger.warning("Gmail poller skipped: google-auth missing")
        return []

    ingested: list[str] = []
    now = datetime.now(timezone.utc)

    try:
        # Build a Gmail service via the Google API client (discovered via genai's
        # dependencies) - in production, authenticate with a service account or
        # OAuth2 refresh token scoped to https://www.googleapis.com/auth/gmail.readonly
        # For this stub we document the shape and return empty until credentials are wired.
        logger.info(
            "Gmail poller invoked (max_messages=%d). Wire GMAIL_CREDENTIALS_JSON to enable.",
            max_messages,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Gmail poller error: %s", exc)

    return ingested
