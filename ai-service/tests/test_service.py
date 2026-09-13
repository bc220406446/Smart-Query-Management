from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.config import settings as app_settings
from app.models import (
    AuditLog,
    Department,
    Notification,
    Query,
    QueryStatus,
    Role,
    User,
)
from app.service import process_pending_queries, run_escalation


def _seed(db):
    cs = Department(id="dept-cs", name="Computer Science", code="CS",
                    created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    exam = Department(id="dept-exam", name="Examination Department", code="EXAM",
                      created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    db.add_all([cs, exam])
    db.flush()

    student = User(id="usr-stu", name="Ali Hassan", email="ali@vu.edu.pk",
                   role=Role.STUDENT, is_on_leave=False,
                   created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    instructor = User(id="usr-instr", name="Saad Raza", email="s.raza@vu.edu.pk",
                      role=Role.INSTRUCTOR, department_id=cs.id, is_on_leave=False,
                      created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    hod = User(id="usr-hod", name="Ayesha Khan", email="hod.cs@vu.edu.pk",
               role=Role.HOD, department_id=cs.id, is_on_leave=False,
               created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    db.add_all([student, instructor, hod])
    db.flush()
    return {"cs": cs, "exam": exam, "student": student, "instructor": instructor, "hod": hod}


def _query(db, subject, message, status=QueryStatus.SUBMITTED, **kw):
    q = Query(
        id="q-" + subject.replace(" ", "-")[:12],
        ticket_number="tk-" + subject[:8].replace(" ", "-"),
        subject=subject,
        message=message,
        status=status,
        student_id="usr-stu",
        created_at=kw.pop("created_at", datetime.now(timezone.utc)),
        updated_at=kw.pop("updated_at", datetime.now(timezone.utc)),
        **kw,
    )
    db.add(q)
    db.flush()
    return q


def test_process_pending_query_end_to_end(db_session):
    _seed(db_session)
    _query(db_session, "Missing marks in MGT211 final result",
           "My MGT211 result shows incomplete even though I appeared in the final exam.")

    processed = process_pending_queries(db_session)
    assert len(processed) == 1

    query = db_session.scalar(select(Query).where(Query.id == processed[0]))
    assert query.status == QueryStatus.ROUTED
    assert query.category == "result"
    # result → EXAM department, which has no staff seeded → unassigned.
    assert query.department_id == "dept-exam"
    assert query.assigned_to_id is None
    assert query.ai_draft_reply and "MGT211" in query.ai_draft_reply
    assert query.ai_classification["provider"] == "rules"

    notifications = db_session.scalars(select(Notification)).all()
    assert any(n.user_id == "usr-stu" for n in notifications)

    audit = db_session.scalars(select(AuditLog)).all()
    assert any(a.action == "ai_classified" for a in audit)


def test_process_routes_to_department_instructor(db_session):
    _seed(db_session)
    _query(db_session, "How do I register for CS302",
           "I want to register for CS302 this semester, please help me with the portal.")

    processed = process_pending_queries(db_session)
    query = db_session.scalar(select(Query).where(Query.id == processed[0]))

    assert query.department_id == "dept-cs"
    # Instructor on duty exists in CS → routed to them, not the HOD.
    assert query.assigned_to_id == "usr-instr"


def test_escalation_flags_stale_queries(db_session):
    _seed(db_session)
    stale = _query(
        db_session, "Old query never answered", "This has been pending forever.",
        updated_at=datetime.now(timezone.utc) - timedelta(hours=30),
    )
    fresh = _query(db_session, "Fresh query", "Just submitted.", created_at=datetime.now(timezone.utc))

    # 1h threshold: cutoff sits between the two updated_at values, so only
    # the stale query (30h old) qualifies.
    saved = app_settings.escalation_hours
    app_settings.escalation_hours = 1
    try:
        escalated = run_escalation(db_session)
    finally:
        app_settings.escalation_hours = saved

    assert stale.id in escalated
    assert fresh.id not in escalated
    db_session.refresh(stale)
    assert stale.status == QueryStatus.ESCALATED
    assert stale.escalated_at is not None


def test_process_skips_non_submitted(db_session):
    _seed(db_session)
    _query(db_session, "Already routed", "This is routed already.", status=QueryStatus.ROUTED)

    processed = process_pending_queries(db_session)
    assert processed == []