from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import __version__
from app.config import settings
from app.database import get_db
from app.pipeline.classifier import ClaudeProvider, GeminiProvider
from app.schemas import HealthOut

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthOut)
def health(db: Session = Depends(get_db)) -> HealthOut:
    try:
        db.execute(text("SELECT 1"))
        database = "connected"
    except Exception:  # noqa: BLE001
        database = "unreachable"

    return HealthOut(
        service="smart-query-ai",
        version=__version__,
        status="ok",
        providers={
            "gemini": GeminiProvider().available,
            "claude": ClaudeProvider().available,
            "rules": True,
        },
        database=database,
    )