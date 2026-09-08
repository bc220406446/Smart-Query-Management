from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Query
from app.schemas import EscalationResult, ProcessRequest, ProcessResult, QueryOut
from app.service import process_pending_queries, run_escalation

router = APIRouter(prefix="/queries", tags=["queries"])


@router.post("/process", response_model=ProcessResult)
def process_queries(req: ProcessRequest, db: Session = Depends(get_db)) -> ProcessResult:
    """Run the AI pipeline over pending (SUBMITTED) queries. Also triggered
    periodically by the ingestion poller in production."""
    processed = process_pending_queries(db, limit=req.limit)
    return ProcessResult(processed=processed, count=len(processed))


@router.post("/escalate", response_model=EscalationResult)
def escalate(db: Session = Depends(get_db)) -> EscalationResult:
    """FR-07: run the 24h auto-escalation check immediately."""
    escalated = run_escalation(db)
    return EscalationResult(escalated=escalated, count=len(escalated))


@router.get("/{query_id}", response_model=QueryOut)
def get_query(query_id: str, db: Session = Depends(get_db)) -> QueryOut:
    query = db.scalar(select(Query).where(Query.id == query_id))
    if query is None:
        raise HTTPException(status_code=404, detail="Query not found")
    return QueryOut.model_validate(query)