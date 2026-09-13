from __future__ import annotations

import os
from typing import Any

from dotenv import load_dotenv
from sqlalchemy import create_engine, pool
from sqlalchemy.engine import URL, make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    pass


load_dotenv()


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
    query = dict(parsed.query)
    # Supabase adds this Prisma-specific pooler hint to its URI. Psycopg
    # rejects it as an unknown libpq connection option.
    query.pop("pgbouncer", None)
    if parsed.host and parsed.host.endswith("supabase.com"):
        query.setdefault("sslmode", "require")
    if scheme == "postgresql":
        url = URL.create(
            "postgresql+psycopg",
            username=parsed.username,
            password=parsed.password,
            host=parsed.host,
            port=parsed.port,
            database=parsed.database,
            query=query,
        )
        scheme = "postgresql+psycopg"
    if scheme.endswith("+psycopg2") or scheme == "postgres+psycopg2":
        new_scheme = scheme.replace("+psycopg2", "+psycopg")
        url = URL.create(
            new_scheme,
            username=parsed.username,
            password=parsed.password,
            host=parsed.host,
            port=parsed.port,
            database=parsed.database,
            query=query,
        )
    return create_engine(url, **kwargs)


def _default_database_url() -> str:
    """Read DATABASE_URL from the environment (honours ``.env`` via
    ``pydantic-settings``). Falls back to the same value ``Settings`` would
    pick, but computed without importing ``app.settings`` at module import
    time in test environments where that might trigger unwanted network trips.
    """
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL is required. Configure it with the Supabase PostgreSQL connection string."
        )
    return url


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


def _sqlite_engine_for_tests(url: str | URL = "sqlite://") -> Any:
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


# ---------------------------------------------------------------------------
# Test helpers: patch ``engine`` and ``SessionLocal`` for in-memory SQLite.
# ---------------------------------------------------------------------------

_original_engine: Any = None


def patch_engine_for_tests(sqlite_url: str = "sqlite://") -> Any:
    """Replace ``engine`` + ``SessionLocal`` with an in-memory SQLite engine.

    Must be called *before* any test code imports ``app.database`` at module
    level (i.e. inside a ``session``-scoped autouse fixture or at the very
    top of ``conftest.py``). Returns the patched engine so the caller can
    call ``Base.metadata.create_all`` / ``.drop_all`` against it.
    """
    global _original_engine
    if _original_engine is None:
        _original_engine = engine
        SessionLocal = sessionmaker(
            bind=engine, autoflush=False, expire_on_commit=False
        )
    patched = _sqlite_engine_for_tests(sqlite_url)
    engine = patched
    SessionLocal = sessionmaker(bind=patched, autoflush=False, expire_on_commit=False)
    return patched


def restore_engine() -> None:
    """Restore the production ``engine`` (no-op if never patched)."""
    global _original_engine
    if _original_engine is not None:
        engine = _original_engine
        SessionLocal = sessionmaker(
            bind=_original_engine, autoflush=False, expire_on_commit=False
        )
        _original_engine = None
