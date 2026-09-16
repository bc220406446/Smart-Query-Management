"""Automatic routing (FR-04).

Given a classified category, pick the department and the best assignee:
1. Department mapped from the category (or a name match).
2. An INSTRUCTOR in that department who is NOT on leave, preferring the one
   with the fewest open assignments.
3. Falling back to the department HOD, then unassigned.
"""

from typing import Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Department, Query, QueryStatus, Role, User
from app.pipeline.rules import CATEGORY_TO_DEPARTMENT


def _open_count_subquery(db: Session):
    open_statuses = [
        QueryStatus.SUBMITTED,
        QueryStatus.ASSIGNED,
        QueryStatus.IN_PROGRESS,
    ]
    return (
        select(Query.assigned_to_id, func.count(Query.id).label("open_count"))
        .where(Query.status.in_(open_statuses))
        .group_by(Query.assigned_to_id)
        .subquery()
    )


def route_query(
    db: Session, category: str, department_name: Optional[str] = None
) -> Tuple[Optional[str], Optional[str]]:
    """Return (department_id, assigned_user_id) for a classified query."""
    dept = _find_department(db, category, department_name)
    if dept is None:
        return None, None

    assignee = _pick_assignee(db, dept.id)
    return dept.id, assignee.id if assignee else None


def _find_department(
    db: Session, category: str, department_name: Optional[str]
) -> Optional[Department]:
    code = CATEGORY_TO_DEPARTMENT.get(category)
    if code:
        return db.scalar(select(Department).where(Department.code == code))
    if department_name:
        return db.scalar(
            select(Department).where(Department.name.ilike(f"%{department_name}%"))
        )
    return None


def _pick_assignee(db: Session, department_id: str) -> Optional[User]:
    open_counts = _open_count_subquery(db)

    # 1) Instructors on duty, least loaded first.
    instructor = db.scalar(
        select(User)
        .where(
            User.department_id == department_id,
            User.role == Role.INSTRUCTOR,
            User.is_on_leave.is_(False),
        )
        .outerjoin(open_counts, User.id == open_counts.c.assigned_to_id)
        .order_by(func.coalesce(open_counts.c.open_count, 0).asc())
        .limit(1)
    )
    if instructor:
        return instructor

    # 2) HOD of the department.
    return db.scalar(
        select(User).where(
            User.department_id == department_id, User.role == Role.HOD
        )
    )
