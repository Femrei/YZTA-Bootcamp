"""CarbOn — SQLite kalıcılık katmanı.

Kullanıcı bazlı hafıza: girişler (entries), tamamlanan yeşil görevler (tasks)
ve kullanıcı ayarları (users). Insight ve Coach ajanları geçmişi buradan okur.
"""
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone

from . import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    username        TEXT PRIMARY KEY,
    daily_budget_kg REAL NOT NULL DEFAULT 15.0,
    created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS entries (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT NOT NULL,
    entry_date TEXT NOT NULL,            -- YYYY-MM-DD
    category   TEXT NOT NULL,            -- 'transport' | 'electricity'
    subtype    TEXT NOT NULL,            -- örn. 'car_petrol' | 'grid'
    amount     REAL NOT NULL,            -- km veya kWh
    unit       TEXT NOT NULL,            -- 'km' | 'kWh'
    co2_kg     REAL NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries (username, entry_date);

CREATE TABLE IF NOT EXISTS tasks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT NOT NULL,
    text       TEXT NOT NULL,
    done       INTEGER NOT NULL DEFAULT 0,
    task_date  TEXT NOT NULL,            -- görevin verildiği gün
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks (username, task_date);
"""


@contextmanager
def get_conn():
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript(SCHEMA)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ---------------------------------------------------------------- users
def ensure_user(username: str) -> dict:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE username = ?", (username,)
        ).fetchone()
        if row is None:
            conn.execute(
                "INSERT INTO users (username, daily_budget_kg, created_at) VALUES (?, ?, ?)",
                (username, config.DEFAULT_DAILY_BUDGET_KG, _now()),
            )
            return {"username": username, "daily_budget_kg": config.DEFAULT_DAILY_BUDGET_KG}
        return dict(row)


def set_budget(username: str, budget_kg: float) -> None:
    ensure_user(username)
    with get_conn() as conn:
        conn.execute(
            "UPDATE users SET daily_budget_kg = ? WHERE username = ?",
            (budget_kg, username),
        )


# -------------------------------------------------------------- entries
def add_entry(username: str, entry_date: str, category: str, subtype: str,
              amount: float, unit: str, co2_kg: float) -> int:
    ensure_user(username)
    with get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO entries (username, entry_date, category, subtype,
                                    amount, unit, co2_kg, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (username, entry_date, category, subtype, amount, unit, co2_kg, _now()),
        )
        return cur.lastrowid


def delete_entry(username: str, entry_id: int) -> bool:
    with get_conn() as conn:
        cur = conn.execute(
            "DELETE FROM entries WHERE id = ? AND username = ?", (entry_id, username)
        )
        return cur.rowcount > 0


def entries_between(username: str, start: str, end: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT * FROM entries
               WHERE username = ? AND entry_date BETWEEN ? AND ?
               ORDER BY entry_date DESC, id DESC""",
            (username, start, end),
        ).fetchall()
        return [dict(r) for r in rows]


def all_entries(username: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM entries WHERE username = ? ORDER BY entry_date DESC, id DESC",
            (username,),
        ).fetchall()
        return [dict(r) for r in rows]


def daily_totals(username: str, days: int = 30) -> list[dict]:
    start = (date.today() - timedelta(days=days - 1)).isoformat()
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT entry_date, category, SUM(co2_kg) AS total
               FROM entries
               WHERE username = ? AND entry_date >= ?
               GROUP BY entry_date, category
               ORDER BY entry_date""",
            (username, start),
        ).fetchall()
        return [dict(r) for r in rows]


# ---------------------------------------------------------------- tasks
def save_tasks(username: str, texts: list[str], task_date: str) -> list[dict]:
    ensure_user(username)
    saved = []
    with get_conn() as conn:
        # aynı güne ait tamamlanmamış eski görevleri temizle (yenileme)
        conn.execute(
            "DELETE FROM tasks WHERE username = ? AND task_date = ? AND done = 0",
            (username, task_date),
        )
        for t in texts:
            cur = conn.execute(
                "INSERT INTO tasks (username, text, done, task_date, created_at) VALUES (?, ?, 0, ?, ?)",
                (username, t, task_date, _now()),
            )
            saved.append({"id": cur.lastrowid, "text": t, "done": 0})
    return saved


def tasks_for_day(username: str, task_date: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, text, done FROM tasks WHERE username = ? AND task_date = ? ORDER BY id",
            (username, task_date),
        ).fetchall()
        return [dict(r) for r in rows]


def complete_task(username: str, task_id: int) -> bool:
    with get_conn() as conn:
        cur = conn.execute(
            "UPDATE tasks SET done = 1 WHERE id = ? AND username = ?",
            (task_id, username),
        )
        return cur.rowcount > 0


def streak_days(username: str) -> int:
    """Ardışık kaç gündür en az bir görev tamamlanmış veya veri girilmiş."""
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT DISTINCT d FROM (
                   SELECT entry_date AS d FROM entries WHERE username = ?
                   UNION
                   SELECT task_date AS d FROM tasks WHERE username = ? AND done = 1
               ) ORDER BY d DESC""",
            (username, username),
        ).fetchall()
    days = [r["d"] for r in rows]
    streak, cursor = 0, date.today()
    day_set = set(days)
    while cursor.isoformat() in day_set:
        streak += 1
        cursor -= timedelta(days=1)
    return streak
