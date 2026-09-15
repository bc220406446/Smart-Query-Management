"""SQLAlchemy models - mirror of web/prisma/schema.prisma.

The web layer owns the schema (created via `prisma db push`); these models
read and write the same tables. Column names are snake_case (Prisma @map),
table names are lowercase plural (Prisma @@map). Enum names match the native
Postgres enum types Prisma creates, with create_type=False so SQLAlchemy never
tries to (re)create them.
"""

import enum
from datetime import datetime
from typing import Any, Optional
from uuid import uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Role(str, enum.Enum):
    STUDENT = "STUDENT"
    INSTRUCTOR = "INSTRUCTOR"
    HOD = "HOD"
    ADMIN = "ADMIN"


class QueryStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    CLASSIFYING = "CLASSIFYING"
    ROUTED = "ROUTED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    ESCALATED = "ESCALATED"
    CLOSED = "CLOSED"


class QueryPriority(str, enum.Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"


class QueryChannel(str, enum.Enum):
    WEB = "WEB"
    EMAIL = "EMAIL"
    WHATSAPP = "WHATSAPP"


# Python string identifiers are NOT passed to the database: we only reference
# the native PG enum types Prisma created (create_type=False).
_enum = lambda enum_cls: Enum(  # noqa: E731
    enum_cls,
    name=enum_cls.__name__,
    native_enum=True,
    create_type=False,
    validate_strings=True,
)


def new_id() -> str:
    """Primary keys: Prisma's cuid() defaults are client-side, so SQLAlchemy
    inserts must generate ids itself (32-char hex fits the String(32) columns)."""
    return uuid4().hex


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(255))
    code: Mapped[str] = mapped_column(String(16), unique=True)
    created_at: Mapped[datetime] = mapped_column("createdAt", DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column("updatedAt", DateTime(timezone=True))

    users: Mapped[list["User"]] = relationship(back_populates="department")
    queries: Mapped[list["Query"]] = relationship(back_populates="department")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    name: Mapped[Optional[str]] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    email_verified: Mapped[Optional[datetime]] = mapped_column("emailVerified", DateTime(timezone=True))
    image: Mapped[Optional[str]] = mapped_column(String(1024))
    role: Mapped[Role] = mapped_column(_enum(Role), default=Role.STUDENT)
    department_id: Mapped[Optional[str]] = mapped_column(
        "departmentId", ForeignKey("departments.id", ondelete="SET NULL"), index=True
    )
    is_on_leave: Mapped[bool] = mapped_column("isOnLeave", Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column("createdAt", DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column("updatedAt", DateTime(timezone=True))

    department: Mapped[Optional[Department]] = relationship(back_populates="users")
    queries: Mapped[list["Query"]] = relationship(
        back_populates="student", foreign_keys="Query.student_id"
    )
    assigned_queries: Mapped[list["Query"]] = relationship(
        back_populates="assigned_to", foreign_keys="Query.assigned_to_id"
    )


class Query(Base):
    __tablename__ = "queries"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    ticket_number: Mapped[str] = mapped_column("ticketNumber", String(32), unique=True, default=new_id)
    subject: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    channel: Mapped[QueryChannel] = mapped_column(
        _enum(QueryChannel), default=QueryChannel.WEB
    )
    status: Mapped[QueryStatus] = mapped_column(
        _enum(QueryStatus), default=QueryStatus.SUBMITTED, index=True
    )
    priority: Mapped[QueryPriority] = mapped_column(
        _enum(QueryPriority), default=QueryPriority.NORMAL
    )
    category: Mapped[Optional[str]] = mapped_column(String(64))
    confidence: Mapped[Optional[float]] = mapped_column(Float)
    ai_classification: Mapped[Optional[Any]] = mapped_column("aiClassification", JSON)
    ai_draft_reply: Mapped[Optional[str]] = mapped_column("aiDraftReply", Text)
    student_id: Mapped[Optional[str]] = mapped_column(
        "studentId", ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    assigned_to_id: Mapped[Optional[str]] = mapped_column(
        "assignedToId", ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    department_id: Mapped[Optional[str]] = mapped_column(
        "departmentId", ForeignKey("departments.id", ondelete="SET NULL"), index=True
    )
    escalated_at: Mapped[Optional[datetime]] = mapped_column("escalatedAt", DateTime(timezone=True))
    resolved_at: Mapped[Optional[datetime]] = mapped_column("resolvedAt", DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column("createdAt", DateTime(timezone=True), index=True)
    updated_at: Mapped[datetime] = mapped_column("updatedAt", DateTime(timezone=True))

    student: Mapped[Optional[User]] = relationship(
        back_populates="queries", foreign_keys=[student_id]
    )
    assigned_to: Mapped[Optional[User]] = relationship(
        back_populates="assigned_queries", foreign_keys=[assigned_to_id]
    )
    department: Mapped[Optional[Department]] = relationship(back_populates="queries")
    replies: Mapped[list["Reply"]] = relationship(back_populates="query")


class Reply(Base):
    __tablename__ = "replies"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    query_id: Mapped[str] = mapped_column(
        ForeignKey("queries.id", ondelete="CASCADE"), index=True
    )
    author_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    body: Mapped[str] = mapped_column(Text)
    is_ai_draft: Mapped[bool] = mapped_column(Boolean, default=False)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column("createdAt", DateTime(timezone=True))

    query: Mapped[Query] = relationship(back_populates="replies")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(
        "userId", ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    type: Mapped[str] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[Optional[str]] = mapped_column(Text)
    read_at: Mapped[Optional[datetime]] = mapped_column("readAt", DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column("createdAt", DateTime(timezone=True))


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    actor_id: Mapped[Optional[str]] = mapped_column(
        "actorId", ForeignKey("users.id", ondelete="SET NULL")
    )
    action: Mapped[str] = mapped_column(String(64))
    entity_type: Mapped[str] = mapped_column("entityType", String(64), index=True)
    entity_id: Mapped[Optional[str]] = mapped_column("entityId", String(32), index=True)
    # Python attribute `meta` maps to the `metadata` column (reserved name in declarative API).
    meta: Mapped[Optional[Any]] = mapped_column("metadata", JSON)
    created_at: Mapped[datetime] = mapped_column("createdAt", DateTime(timezone=True))
