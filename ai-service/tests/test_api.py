from tests.test_service import _query, _seed


def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["service"] == "smart-query-ai"
    assert body["status"] == "ok"
    assert body["providers"]["rules"] is True


def test_root_endpoint(client):
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["docs"] == "/docs"


def test_process_endpoint(client, db_session):
    _seed(db_session)
    _query(db_session, "Missing marks in MGT211 final result",
           "My MGT211 result shows incomplete even though I appeared in the final exam.")

    res = client.post("/queries/process", json={"limit": 10})
    assert res.status_code == 200
    body = res.json()
    assert body["count"] == 1
    assert len(body["processed"]) == 1


def test_get_query_endpoint(client, db_session):
    _seed(db_session)
    _query(db_session, "Missing marks in MGT211 final result",
           "My MGT211 result shows incomplete even though I appeared in the final exam.")
    processed = client.post("/queries/process", json={"limit": 1}).json()["processed"]

    res = client.get(f"/queries/{processed[0]}")
    assert res.status_code == 200
    body = res.json()
    assert body["category"] == "result"
    assert body["ai_draft_reply"] is not None
    assert body["status"] == "ROUTED"


def test_get_missing_query_404(client):
    res = client.get("/queries/nope-nope-nope")
    assert res.status_code == 404


def test_escalate_endpoint(client, db_session):
    _seed(db_session)
    from datetime import datetime, timedelta, timezone

    _query(
        db_session,
        "Stale pending query",
        "Nobody answered this for days.",
        updated_at=datetime.now(timezone.utc) - timedelta(hours=50),
    )

    import app.config as config_mod

    saved = config_mod.settings.escalation_hours
    config_mod.settings.escalation_hours = 0
    try:
        res = client.post("/queries/escalate")
    finally:
        config_mod.settings.escalation_hours = saved

    assert res.status_code == 200
    assert res.json()["count"] == 1