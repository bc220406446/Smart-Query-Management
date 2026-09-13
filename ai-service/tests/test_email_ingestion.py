from datetime import datetime, timezone

from app.service import gmail_poll_for_emails, ingest_email_query
from app.models import AuditLog, Query, QueryChannel, QueryStatus


def test_gmail_poll_without_credentials_is_noop(db_session, settings_with_gmail):
    """When GMAIL_CREDENTIALS_JSON is empty the poller returns an empty list."""
    import app.config as config_mod

    saved = config_mod.settings.gmail_credentials_json
    config_mod.settings.gmail_credentials_json = ""
    try:
        ingested = gmail_poll_for_emails(db_session)
        assert ingested == []
    finally:
        config_mod.settings.gmail_credentials_json = saved


def test_gmail_poll_with_credentials_is_noop_without_genai(
    db_session, settings_with_gmail, monkeypatch
):
    """With credentials set but the google-genai import unavailable, the poller
    logs a warning and returns an empty list (no side effects on the DB)."""

    def raise_import(err):
        raise ImportError("google-genai not installed")

    monkeypatch.setattr("importlib.import_module", raise_import)
    ingested = gmail_poll_for_emails(db_session, max_messages=5)
    assert ingested == []

    queries = db_session.scalars(Query.__table__.select()).all()
    assert len(list(queries)) == 0


def test_ingest_email_query_creates_submitted_row(db_session):
    """FR-02: an email message turns into a SUBMITTED query on the EMAIL channel."""
    received_at = datetime(2024, 5, 17, 9, 12, 0, tzinfo=timezone.utc)
    query_id = ingest_email_query(
        db_session,
        subject="Result card not received",
        snippet="My result card for Fall 2023 has not been delivered yet.",
        sender="student@example.com",
        thread_id="gmail-thread-123",
        received_at=received_at,
    )
    db_session.commit()

    query = db_session.query(Query).filter_by(id=query_id).one()
    assert query.subject == "Result card not received"
    assert query.message == "My result card for Fall 2023 has not been delivered yet."
    assert query.channel == QueryChannel.EMAIL
    assert query.status == QueryStatus.SUBMITTED
    assert query.student_id is None
    # SQLite has no timezone support; strip tzinfo for comparison.
    assert query.created_at.replace(tzinfo=None) == received_at.replace(tzinfo=None)
    assert query.updated_at.replace(tzinfo=None) == received_at.replace(tzinfo=None)


def test_ingest_email_query_defaults_received_at_to_now(db_session):
    """When received_at is omitted, the row is stamped with the current UTC time."""
    before = datetime.now(timezone.utc)
    query_id = ingest_email_query(
        db_session,
        subject="Late fee waiver",
        snippet="Please waive my late fee.",
        sender="s@student.edu.pk",
        thread_id="t-2",
    )
    db_session.commit()
    after = datetime.now(timezone.utc)

    query = db_session.query(Query).filter_by(id=query_id).one()
    assert before.replace(tzinfo=None) <= query.created_at <= after.replace(tzinfo=None)
    assert query.updated_at == query.created_at


def test_ingest_email_query_emits_audit_entry(db_session):
    """Each ingested email should produce an ``email_ingested`` audit log."""
    query_id = ingest_email_query(
        db_session,
        subject="Exam form typo",
        snippet="My name is misspelled on the exam form.",
        sender="a@vu.edu.pk",
        thread_id="t-3",
    )
    db_session.commit()

    audit = db_session.query(AuditLog).filter_by(entity_id=query_id).one()
    assert audit.action == "email_ingested"
    assert audit.entity_type == "query"
    assert audit.meta["sender"] == "a@vu.edu.pk"
    assert audit.meta["thread_id"] == "t-3"


def test_ingest_email_query_does_not_resolve_student_id(db_session):
    """Email ingestion leaves student_id NULL so a downstream resolver can
    match the sender address to a user later."""
    query_id = ingest_email_query(
        db_session,
        subject="Grade concern",
        snippet="Can we discuss my grade?",
        sender="x@student.edu.pk",
        thread_id="t-4",
    )
    db_session.commit()
    query = db_session.query(Query).filter_by(id=query_id).one()
    assert query.student_id is None


def test_multiple_email_ingest_creates_unique_rows(db_session):
    ids = {
        ingest_email_query(db_session, f"Subject {n}", "snippet", "s@x.com", f"t-{n}")
        for n in range(3)
    }
    assert len(ids) == 3
    count = db_session.query(Query).count()
    assert count == 3
