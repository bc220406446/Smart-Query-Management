import pytest

from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app


_sqlite_engine = create_engine(
    "sqlite://",
    poolclass=StaticPool,
    connect_args={"check_same_thread": False},
)


@pytest.fixture(scope="session", autouse=True)
def _patch_engine_for_collections():
    """Temporarily override ``app.database.engine`` so that any module that
    imports ``app.database`` at collection time receives the SQLite engine
    instead of the real Postgres engine."""
    import app.database as db_mod

    saved = db_mod.engine
    db_mod.engine = _sqlite_engine
    try:
        yield
    finally:
        db_mod.engine = saved


@pytest.fixture()
def db_session():
    Base.metadata.create_all(_sqlite_engine)
    TestingSession = sessionmaker(bind=_sqlite_engine, autoflush=False, expire_on_commit=False)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(_sqlite_engine)


@pytest.fixture()
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def make_row(**kwargs):
    """Minimal required fields for a model row (ids ≤ 32 chars)."""
    from datetime import datetime, timezone

    base = {
        "id": "r-" + str(abs(hash(frozenset(kwargs.items()))))[:20],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    base.update(kwargs)
    return base


@pytest.fixture()
def settings_with_gmail(settings):
    """Override settings so the Gmail poller treats credentials as wired.

    The poller checks ``settings.gmail_credentials_json`` to decide whether
    to run; this fixture makes that field truthy so the happy-path branches
    are reachable in tests without a real service account.
    """
    settings.gmail_credentials_json = '{"type":"service_account","project_id":"test"}'
    return settings