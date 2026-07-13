"""CarbOn — FastAPI uygulaması.

Çalıştırma:  uvicorn app.main:app --reload
Arayüz:      http://localhost:8000
API doküman: http://localhost:8000/docs
"""
import csv
import io
from datetime import date
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import config, db
from .agents import insight, orchestrator
from .agents.tracking import TrackingError
from .emission_factors import (ELECTRICITY_KG_PER_KWH, TRANSPORT_FACTORS,
                               TURKEY_DAILY_AVG_KG)

from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(_: FastAPI):
    db.init_db()
    yield


app = FastAPI(
    title="CarbOn API",
    description="Çok ajanlı yapay zeka destekli karbon ayak izi koçu",
    version="1.0.0",
    lifespan=lifespan,
)

STATIC_DIR = Path(__file__).parent / "static"


# ------------------------------------------------------------- şemalar
class EntryIn(BaseModel):
    user: str = Field(..., min_length=1, max_length=64)
    category: str  # 'transport' | 'electricity'
    subtype: str | None = None
    amount: float
    entry_date: str | None = None  # YYYY-MM-DD


class BudgetIn(BaseModel):
    user: str
    daily_budget_kg: float = Field(..., gt=0, le=1000)


class TaskDoneIn(BaseModel):
    user: str
    task_id: int


# ------------------------------------------------------------- uçlar
@app.get("/api/factors")
def factors():
    return {
        "transport": TRANSPORT_FACTORS,
        "electricity_kg_per_kwh": ELECTRICITY_KG_PER_KWH,
        "turkey_daily_avg_kg": TURKEY_DAILY_AVG_KG,
    }


@app.post("/api/entries")
def create_entry(body: EntryIn):
    """Orkestratör pipeline'ı: Tracking → Insight → Coach."""
    try:
        return orchestrator.handle_entry(
            body.user.strip(),
            body.category,
            {"subtype": body.subtype, "amount": body.amount,
             "entry_date": body.entry_date},
        )
    except TrackingError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@app.delete("/api/entries/{entry_id}")
def remove_entry(entry_id: int, user: str = Query(...)):
    if not db.delete_entry(user, entry_id):
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı.")
    return {"deleted": entry_id}


@app.get("/api/entries")
def list_entries(user: str = Query(...), limit: int = Query(50, le=500)):
    return db.all_entries(user)[:limit]


@app.get("/api/insight")
def get_insight(user: str = Query(...)):
    return insight.analyze(user)


@app.post("/api/coach/refresh")
def refresh_coach(body: BudgetIn | None = None, user: str = Query(...)):
    return orchestrator.refresh_coaching(user)


@app.get("/api/dashboard")
def dashboard(user: str = Query(...)):
    """Arayüzün tek çağrıda ihtiyaç duyduğu her şey."""
    u = db.ensure_user(user)
    analysis = insight.analyze(user)
    today = date.today().isoformat()
    return {
        "user": u,
        "insight": analysis,
        "tasks": db.tasks_for_day(user, today),
        "recent_entries": db.all_entries(user)[:10],
    }


@app.post("/api/budget")
def set_budget(body: BudgetIn):
    db.set_budget(body.user, body.daily_budget_kg)
    return {"user": body.user, "daily_budget_kg": body.daily_budget_kg}


@app.post("/api/tasks/complete")
def complete_task(body: TaskDoneIn):
    if not db.complete_task(body.user, body.task_id):
        raise HTTPException(status_code=404, detail="Görev bulunamadı.")
    return {"done": body.task_id, "streak_days": db.streak_days(body.user)}


@app.get("/api/export")
def export(user: str = Query(...), fmt: str = Query("csv", pattern="^(csv|json)$")):
    rows = db.all_entries(user)
    if fmt == "json":
        return rows
    buf = io.StringIO()
    writer = csv.DictWriter(
        buf, fieldnames=["id", "entry_date", "category", "subtype",
                         "amount", "unit", "co2_kg", "created_at"],
        extrasaction="ignore",
    )
    writer.writeheader()
    writer.writerows(rows)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=carbon_{user}.csv"},
    )


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "llm": "gemini" if config.GEMINI_API_KEY
               else ("openai" if config.OPENAI_API_KEY else "rule_based"),
    }


# ------------------------------------------------------------- arayüz
@app.get("/", include_in_schema=False)
def index():
    return FileResponse(STATIC_DIR / "index.html")


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
