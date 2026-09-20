"""Automatic routing (FR-04).

Given a classified category, pick the department and the best assignee:
1. Department mapped from the category (or a name match).
2. An exact course instructor from the classification reference when a course
   code is present; otherwise a deterministic instructor (never load balance).
3. Falling back to the department HOD, then unassigned.
"""

import re
from typing import Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Department, Query, QueryStatus, Role, User
from app.pipeline.rules import CATEGORY_TO_DEPARTMENT, REFERENCE_COURSE_ROUTES


def route_query(
    db: Session, category: str, department_name: Optional[str] = None, text: Optional[str] = None
) -> Tuple[Optional[str], Optional[str]]:
    """Return (department_id, assigned_user_id) for a classified query."""
    dept = _find_department(db, category, department_name)
    if dept is None:
        return None, None

    assignee = _pick_assignee(db, dept.id, text)
    return dept.id, assignee.id if assignee else None


def _find_department(
    db: Session, category: str, department_name: Optional[str]
) -> Optional[Department]:
    code = CATEGORY_TO_DEPARTMENT.get(category)
    if code:
        return db.scalar(select(Department).where(Department.code == (department_name or code)))
    if department_name:
        return db.scalar(select(Department).where(Department.code == department_name)) or db.scalar(select(Department).where(Department.name.ilike(f"%{department_name}%")))
    return None


def _pick_assignee(db: Session, department_id: str, text: Optional[str] = None) -> Optional[User]:
    lowered = (text or "").lower()
    # Credit-hour/load-limit matters are owned by Course Selection &
    # Registration, even when the student mentions a course code.
    if any(term in lowered for term in ("credit hour", "credit hours", "credit limit", "increase credit")):
        course_selection = db.scalar(select(User).where(
            User.role == Role.INSTRUCTOR,
            User.email.ilike("course.registration@%"),
        ))
        if course_selection:
            return course_selection

    # Course-specific queries must go to the matching course instructor when
    # that account exists; otherwise CS101 could be assigned to any CS staff.
    course_match = re.search(r"\b([A-Z]{2,5})[- ]?(\d{3})\b", (text or "").upper())
    if course_match:
        code = f"{course_match.group(1)}{course_match.group(2)}"
        course_email = REFERENCE_COURSE_ROUTES.get(code) or f"{course_match.group(1).lower()}{course_match.group(2)}.instructor@"
        exact = db.scalar(select(User).where(
            User.department_id == department_id,
            User.role == Role.INSTRUCTOR,
            User.email.ilike(course_email if "@" in course_email else f"{course_email}%"),
        ))
        if exact:
            return exact

    # 1) Deterministic fallback. Related queries stay with the same stable
    # department staff selection; workload is deliberately not considered.
    instructor = db.scalar(
        select(User)
        .where(
            User.department_id == department_id,
            User.role == Role.INSTRUCTOR,
        )
        .order_by(User.email.asc())
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
