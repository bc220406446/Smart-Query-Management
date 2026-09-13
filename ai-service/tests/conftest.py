import pytest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app


# ---------------------------------------------------------------------------
# In-memory SQLite engine for the whole test session, patched onto
# ``app.database.engine`` so that any module that already imported
# ``app.database`` sees the SQLite engine instead of the real Postgres one.
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session", autouse=True)
def _sqlite_engine_session():
    import app.database as db_mod

    saved = db_mod.engine
    patched = create_engine(
        "sqlite://",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    db_mod.engine = patched
    Base.metadata.create_all(patched)
    try:
        yield patched
    finally:
        Base.metadata.drop_all(patched)
        db_mod.engine = saved


@pytest.fixture()
def db_session(_sqlite_engine_session):
    """Fresh per-test session backed by the session-scoped SQLite engine.

    Tears down by deleting every row from every table so the next test
    starts from a clean schema without dropping/recreating tables.
    """
    TestingSession = sessionmaker(
        bind=_sqlite_engine_session, autoflush=False, expire_on_commit=False
    )
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        # Wipe all rows (keeps the schema intact for the next test).
        with sessionmaker(bind=_sqlite_engine_session, autoflush=False, expire_on_commit=False)() as wipe:
            for table in reversed(Base.metadata.sorted_tables):
                wipe.execute(table.delete())
            wipe.commit()


@pytest.fixture()
def client(db_session):
    def override_get_db():
        yield db_session

    original = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    if original is not None:
        app.dependency_overrides[get_db] = original
    else:
        app.dependency_overrides.pop(get_db, None)


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
def settings_with_gmail():
    """Override settings so the Gmail poller treats credentials as wired.

    The poller checks ``app.config.settings.gmail_credentials_json`` to
    decide whether to run; this fixture makes that field truthy so the
    happy-path branches are reachable in tests without a real service account.
    The caller is responsible for restoring the original value afterward.
    """
    import app.config as config_mod

    saved = config_mod.settings.gmail_credentials_json
    config_mod.settings.gmail_credentials_json = (
        '{"type":"service_account","project_id":"test"}'
    )
    try:
        yield
    finally:
        config_mod.settings.gmail_credentials_json = saved