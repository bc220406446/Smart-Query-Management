from __future__ import annotations

import os
from typing import Any

from sqlalchemy import create_engine, pool
from sqlalchemy.engine import URL, make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    pass


def _create_engine_for_url(url: str | URL, **kwargs: Any) -> Any:
    """Create an engine, choosing a psycopg3-friendly driver when the URL
    specifies a legacy psycopg2 scheme.

    The project's production database is accessed through ``psycopg[binary]``
    (v3), so the default DATABASE_URL is on the ``postgresql+psycopg://``
    driver. Some older tutorials and test helpers hardcode
    ``postgresql+psycopg2://`` / ``postgres+psycopg2://`` which would force
    SQLAlchemy to import the uninstalled ``psycopg2`` package. This helper
    rewrites those schemes to ``postgresql+psycopg://`` so the same ``psycopg``
    package is used everywhere.
    """
    parsed = make_url(str(url))
    scheme = parsed.drivername
    if scheme.endswith("+psycopg2") or scheme == "postgres+psycopg2":
        new_scheme = scheme.replace("+psycopg2", "+psycopg")
        url = URL.create(
            new_scheme,
            username=parsed.username,
            password=parsed.password,
            host=parsed.host,
            port=parsed.port,
            database=parsed.database,
            query=parsed.query,
        )
    return create_engine(url, **kwargs)


def _default_database_url() -> str:
    """Read DATABASE_URL from the environment (honours ``.env`` via
    ``pydantic-settings``). Falls back to the same value ``Settings`` would
    pick, but computed without importing ``app.settings`` at module import
    time in test environments where that might trigger unwanted network trips.
    """
    return os.environ.get(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@localhost:5432/smartquery",
    )


# ``engine`` is created once at import time and reused by ``SessionLocal``.
# Tests monkeypatch this attribute to an in-memory SQLite engine before any
# ``app.database`` consumers are imported.
engine = _create_engine_for_url(
    _default_database_url(),
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    connect_args={"connect_timeout": 5},
)


def _sqlite_engine(url: str | URL) -> Any:
    return create_engine(
        url,
        poolclass=pool.StaticPool,
        connect_args={"check_same_thread": False},
    )


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db():
    """FastAPI dependency: yields a session and always closes it."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()