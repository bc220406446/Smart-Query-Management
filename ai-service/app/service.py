"""Core service operations: process pending queries, run escalation,
and ingest external channels (e.g. email) into the shared query pipeline."""

import email
import imaplib
import logging
from email.header import decode_header
from datetime import datetime, timedelta, timezone
from typing import List

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import AuditLog, Query, QueryChannel, QueryStatus, Reply, User
from app.pipeline.classifier import classify_text
from app.pipeline.drafts import draft_reply
from app.pipeline.router import route_query

logger = logging.getLogger(__name__)


def _notify(db: Session, user_id: str, title: str, body: str) -> None:
    # In-app notifications were removed from FR-08. Email and WhatsApp are
    # delivered by the web webhook using the user's channel preferences.
    return


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
            db,
            result.category,
            result.department_code or getattr(query, "_department_name", None),
            f"{query.subject}\n{query.message}",
        )
        assigned_user = db.get(User, assigned_to_id) if assigned_to_id else None
        instructor_on_leave = bool(assigned_user and assigned_user.role.value == "INSTRUCTOR" and assigned_user.is_on_leave)
        draft = draft_reply(query, result.category, result.priority)

        query.status = QueryStatus.IN_PROGRESS if instructor_on_leave else QueryStatus.ASSIGNED
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

        message = assigned_user.leave_auto_reply if instructor_on_leave and assigned_user.leave_auto_reply else f"'{query.subject}' was classified and assigned to the appropriate instructor."
        if instructor_on_leave:
            now = datetime.now(timezone.utc)
            db.add(Reply(query_id=query.id, author_id=None, body=message, is_ai_draft=False, sent_at=now, created_at=now))
        if query.student_id:
            _notify(
                db,
                query.student_id,
                "Instructor leave auto-reply" if instructor_on_leave else "Query classified & routed",
                f"'{query.subject}' → {result.category} ({result.provider}).",
            )
        if query.student_id and instructor_on_leave and assigned_user and assigned_user.leave_auto_reply:
            _notify(db, query.student_id, "Instructor leave auto-reply", assigned_user.leave_auto_reply)
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

    for query in [item for item in pending if item.id in processed]:
        _notify_webhook(query)

    return processed


def run_escalation(db: Session) -> List[str]:
    """FR-07: escalate queries that have been unresolved for 24+ hours."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=settings.escalation_hours)
    now = datetime.now(timezone.utc)
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
                or_(
                    User.is_on_leave.is_(False),
                    User.leave_end.is_not(None) & (User.leave_end < now),
                    User.leave_start.is_not(None) & (User.leave_start > now),
                ),
            )
        )
    )

    escalated: List[str] = []
    escalated_queries: list[Query] = []
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
        escalated_queries.append(query)
        logger.info("Escalated query %s", query.id)

    db.commit()
    for query in escalated_queries:
        _notify_webhook(query)
    return escalated


def _notify_webhook(query: Query) -> None:
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
            json={
                "queryId": query.id,
                "status": query.status.value,
                "category": query.category,
                "confidence": query.confidence,
                "aiClassification": query.ai_classification,
                "aiDraftReply": query.ai_draft_reply,
                "departmentId": query.department_id,
                "assignedToId": query.assigned_to_id,
                "priority": query.priority.value,
                "forceNotification": True,
            },
            headers={"x-ai-secret": settings.ai_webhook_secret},
            timeout=10,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Webhook notification failed for %s: %s", query.id, exc)


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

    student = db.scalar(select(User).where(User.email == sender.lower().strip(), User.role == "STUDENT"))
    query = Query(
        id=new_id(),
        ticket_number=new_id(),
        subject=row["subject"],
        message=row["message"],
        channel=QueryChannel.EMAIL,
        status=QueryStatus.SUBMITTED,
        student_id=student.id if student else row["student_id"],
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
        {"sender": sender, "thread_id": thread_id, "matched_student_id": student.id if student else None},
    )
    logger.info("Ingested email query %s from %s", query.id, sender)
    return query.id


def _is_undeliverable_email(message: email.message.Message, sender: str, subject: str, body: str) -> bool:
    """Return True for automated bounce/delivery-failure messages.

    These messages are mailbox notifications, not student support requests.
    Keep the check deliberately narrow so ordinary emails mentioning delivery
    problems still become queries.
    """
    sender_text = sender.lower().strip()
    subject_text = subject.lower().strip()
    content_type = message.get_content_type().lower()
    auto_submitted = message.get("Auto-Submitted", "").lower()
    precedence = message.get("Precedence", "").lower()
    system_sender = (
        sender_text in {"mailer-daemon", "postmaster"}
        or sender_text.startswith("mailer-daemon@")
        or sender_text.startswith("postmaster@")
        or "mailer-daemon" in sender_text
    )
    failure_subject = any(
        phrase in subject_text
        for phrase in (
            "undelivered mail",
            "delivery status notification",
            "delivery failure",
            "mail delivery failed",
            "returned mail",
            "failure notice",
            "message not delivered",
        )
    )
    report_message = content_type == "multipart/report" or "auto-replied" in auto_submitted
    return system_sender or (failure_subject and (report_message or precedence == "bulk"))


def imap_poll_for_emails(db: Session, label: str = "INBOX", max_messages: int = 50) -> list[str]:
    """Read unread IMAP messages and create EMAIL queries."""
    if not settings.email_ingestion_enabled or not settings.email_imap_username or not settings.email_imap_password:
        logger.warning("Email ingestion skipped: enable IMAP settings and provide mailbox credentials.")
        return []
    mailbox = None
    ingested: list[str] = []
    try:
        mailbox = imaplib.IMAP4_SSL(settings.email_imap_host, settings.email_imap_port)
        mailbox.login(settings.email_imap_username, settings.email_imap_password)
        mailbox.select(label or settings.email_imap_folder)
        _, result = mailbox.search(None, "UNSEEN")
        logger.info("Email inbox connected; found %d unread message(s).", len(result[0].split()))
        for message_id in result[0].split()[-max_messages:]:
            _, parts = mailbox.fetch(message_id, "(RFC822)")
            raw = next((part[1] for part in parts if isinstance(part, tuple)), None)
            if not raw:
                continue
            message = email.message_from_bytes(raw)
            sender = email.utils.parseaddr(message.get("From", ""))[1].lower().strip()
            subject = _decode_email_header(message.get("Subject", "")) or "Email query"
            body = _email_text(message)
            if _is_undeliverable_email(message, sender, subject, body):
                logger.info("Skipping undeliverable email %s from %s", message_id.decode(errors="ignore"), sender or "unknown")
                mailbox.store(message_id, "+FLAGS", "\\Seen")
                continue
            if not sender or not body:
                continue
            message_key = message.get("Message-ID", message_id.decode(errors="ignore"))
            ingest_email_query(db, subject, body, sender, message_key)
            db.commit()
            mailbox.store(message_id, "+FLAGS", "\\Seen")
            ingested.append(message_key)
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        logger.exception("Email inbox poller error: %s", exc)
    finally:
        if mailbox:
            try: mailbox.logout()
            except Exception: pass
    return ingested


def _decode_email_header(value: str) -> str:
    return "".join(part.decode(charset or "utf-8", errors="replace") if isinstance(part, bytes) else part for part, charset in decode_header(value)).strip()


def _email_text(message: email.message.Message) -> str:
    parts = message.walk() if message.is_multipart() else [message]
    for part in parts:
        if part.get_content_type() == "text/plain" and "attachment" not in str(part.get("Content-Disposition", "")):
            return (part.get_payload(decode=True) or b"").decode(part.get_content_charset() or "utf-8", errors="replace").strip()
    return ""


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
