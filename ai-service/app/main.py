import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app import __version__
from app.routers import health, queries
from app.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

app = FastAPI(
    title="Smart Query Hub - AI Service",
    description=(
        "Classification, routing, reply drafting, and 24h escalation for the "
        "university query system. Shares the PostgreSQL database with the "
        "Next.js web layer."
    ),
    version=__version__,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app.router.lifespan_context = lifespan

app.include_router(health.router)
app.include_router(queries.router)


@app.get("/", include_in_schema=False)
def root():
    return {"service": "smart-query-ai", "docs": "/docs", "health": "/health"}