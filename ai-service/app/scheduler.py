"""Scheduled jobs (FR-07 escalation, FR-02 email ingestion).

The poller interval for escalation and email ingestion is controlled by
settings.escalation_poll_minutes / settings.gmail_poll_minutes.
"""

import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.config import settings
from app.database import SessionLocal
from app.service import gmail_poll_for_emails, process_pending_queries, run_escalation

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def _escalation_job() -> None:
    db = SessionLocal()
    try:
        escalated = run_escalation(db)
        if escalated:
            logger.info("Escalated %d stale queries.", len(escalated))
    except Exception as exc:  # noqa: BLE001
        logger.error("Escalation job failed: %s", exc)
    finally:
        db.close()


def _email_ingestion_job() -> None:
    db = SessionLocal()
    try:
        ingested = gmail_poll_for_emails(
            db,
            label=settings.gmail_label,
            max_messages=settings.gmail_max_messages,
        )
        if ingested:
            logger.info("Ingested %d email queries.", len(ingested))
    except Exception as exc:  # noqa: BLE001
        logger.error("Email ingestion job failed: %s", exc)
    finally:
        db.close()


def _query_processing_job() -> None:
    db = SessionLocal()
    try:
        processed = process_pending_queries(db, limit=settings.query_processing_batch_size)
        if processed:
            logger.info("Automatically processed %d pending queries.", len(processed))
    except Exception as exc:  # noqa: BLE001
        logger.error("Query processing job failed: %s", exc)
    finally:
        db.close()


def start_scheduler() -> BackgroundScheduler:
    """Start the background scheduler. Disabled when poll interval is 0."""
    global _scheduler
    if _scheduler is not None or (settings.escalation_poll_minutes <= 0 and settings.query_processing_poll_seconds <= 0):
        return _scheduler  # type: ignore[return-value]

    _scheduler = BackgroundScheduler(timezone="UTC", daemon=True)
    _scheduler.add_job(
        _query_processing_job,
        trigger=IntervalTrigger(seconds=max(30, settings.query_processing_poll_seconds)),
        id="query_processing",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    _scheduler.add_job(
        _escalation_job,
        trigger=IntervalTrigger(minutes=settings.escalation_poll_minutes),
        id="escalation",
        replace_existing=True,
        next_run_time=None,  # first run after one interval
    )

    # FR-02: optional Gmail API poller for email ingestion.
    if settings.gmail_credentials_json:
        _scheduler.add_job(
            _email_ingestion_job,
            trigger=IntervalTrigger(minutes=settings.gmail_poll_minutes),
            id="email_ingestion",
            replace_existing=True,
            next_run_time=None,
        )
        logger.info(
            "Email ingestion scheduler started (every %d minutes).",
            settings.gmail_poll_minutes,
        )

    _scheduler.start()
    logger.info(
        "Escalation scheduler started (every %d minutes, threshold %dh).",
        settings.escalation_poll_minutes,
        settings.escalation_hours,
    )
    return _scheduler


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
