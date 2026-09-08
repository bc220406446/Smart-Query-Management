from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class QueryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    ticket_number: str
    subject: str
    message: str
    channel: str
    status: str
    priority: str
    category: Optional[str] = None
    confidence: Optional[float] = None
    ai_classification: Optional[dict[str, Any]] = None
    ai_draft_reply: Optional[str] = None
    assigned_to_id: Optional[str] = None
    department_id: Optional[str] = None
    escalated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime


class ProcessRequest(BaseModel):
    limit: int = 10


class ProcessResult(BaseModel):
    processed: list[str]
    count: int


class EscalationResult(BaseModel):
    escalated: list[str]
    count: int


class HealthOut(BaseModel):
    service: str
    version: str
    status: str
    providers: dict[str, bool]
    database: str