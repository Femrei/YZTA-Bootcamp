"""CarbOn test paketi — ajanlar, orkestratör ve API uçları."""
import os
import tempfile
from datetime import date, timedelta

import pytest

# testler geçici veritabanı kullanır
_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ["CARBON_DB_PATH"] = _tmp.name

from fastapi.testclient import TestClient  # noqa: E402

from app import db  # noqa: E402
from app.agents import insight, orchestrator, tracking  # noqa: E402
from app.agents.coach import _extract_tips, _rule_based  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app)
db.init_db()


# ------------------------------------------------------- Tracking Agent
def test_transport_calculation():
    r = tracking.track_transport("test_u", "car_petrol", 100)
    assert r["co2_kg"] == pytest.approx(17.1, abs=0.01)
    assert r["unit"] == "km"


def test_electricity_calculation():
    r = tracking.track_electricity("test_u", 200)
    assert r["co2_kg"] == pytest.approx(95.6, abs=0.01)  # 200 * 0.478


def test_invalid_amount_rejected():
    with pytest.raises(tracking.TrackingError):
        tracking.track_transport("test_u", "bus", -5)
    with pytest.raises(tracking.TrackingError):
        tracking.track_transport("test_u", "spaceship", 10)


# -------------------------------------------------------- Insight Agent
def test_insight_totals_and_top_category():
    u = "insight_u"
    tracking.track_transport(u, "car_petrol", 50)   # 8.55 kg
    tracking.track_electricity(u, 10)               # 4.78 kg
    a = insight.analyze(u)
    assert a["week_total_kg"] == pytest.approx(13.33, abs=0.05)
    assert a["top_category"] == "transport"
    assert a["equivalents"]["car_km"] > 0
    assert isinstance(a["trend"], list)


def test_week_change_detection():
    u = "trend_u"
    old = (date.today() - timedelta(days=8)).isoformat()
    tracking.track_transport(u, "bus", 100, entry_date=old)   # geçen hafta
    tracking.track_transport(u, "bus", 200)                   # bu hafta
    a = insight.analyze(u)
    assert a["week_change_pct"] == pytest.approx(100.0, abs=1)


# ---------------------------------------------------------- Coach Agent
def test_rule_based_coach_always_three_tips():
    tips = _rule_based({"by_subtype": {"car_petrol": 20.0}, "top_category": "transport",
                        "week_total_kg": 20.0})
    assert len(tips) == 3
    tips_empty = _rule_based({"by_subtype": {}, "top_category": None, "week_total_kg": 0})
    assert len(tips_empty) == 3


def test_tip_json_extraction():
    raw = '```json\n{"tips": ["a", "b", "c"]}\n```'
    assert _extract_tips(raw) == ["a", "b", "c"]
    assert _extract_tips("bozuk çıktı") is None


# ---------------------------------------------------------- Orkestratör
def test_full_pipeline():
    out = orchestrator.handle_entry("pipe_u", "transport",
                                    {"subtype": "metro", "amount": 30})
    agents = [p["agent"] for p in out["pipeline"]]
    assert agents == ["tracking", "insight", "coach"]
    assert out["entry"]["co2_kg"] == pytest.approx(1.05, abs=0.01)
    assert len(out["coach"]["tips"]) == 3
    # LLM anahtarı test ortamında yok → kural tabanlı fallback
    assert out["coach"]["provider"] == "rule_based"


# ------------------------------------------------------------------ API
def test_api_entry_and_dashboard():
    r = client.post("/api/entries", json={
        "user": "api_u", "category": "electricity", "amount": 50})
    assert r.status_code == 200
    body = r.json()
    assert body["entry"]["co2_kg"] == pytest.approx(23.9, abs=0.01)

    d = client.get("/api/dashboard", params={"user": "api_u"}).json()
    assert d["insight"]["week_total_kg"] >= 23.9
    assert "tasks" in d


def test_api_validation_error():
    r = client.post("/api/entries", json={
        "user": "api_u", "category": "transport", "subtype": "bus", "amount": -1})
    assert r.status_code == 422


def test_api_export_csv():
    r = client.get("/api/export", params={"user": "api_u", "fmt": "csv"})
    assert r.status_code == 200
    assert "entry_date" in r.text


def test_task_completion_and_streak():
    client.post("/api/entries", json={"user": "task_u", "category": "transport",
                                      "subtype": "bus", "amount": 5})
    d = client.get("/api/dashboard", params={"user": "task_u"}).json()
    task_id = d["tasks"][0]["id"]
    r = client.post("/api/tasks/complete", json={"user": "task_u", "task_id": task_id})
    assert r.status_code == 200
    assert r.json()["streak_days"] >= 1


def test_budget_update():
    r = client.post("/api/budget", json={"user": "api_u", "daily_budget_kg": 12})
    assert r.status_code == 200
    d = client.get("/api/dashboard", params={"user": "api_u"}).json()
    assert d["user"]["daily_budget_kg"] == 12
