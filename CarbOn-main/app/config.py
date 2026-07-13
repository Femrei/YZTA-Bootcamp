"""CarbOn — uygulama yapılandırması.

Tüm ayarlar ortam değişkenlerinden okunur; hiçbir gizli anahtar koda gömülmez.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Veritabanı
DB_PATH = os.getenv("CARBON_DB_PATH", str(BASE_DIR / "carbon.db"))

# LLM sağlayıcı anahtarları (opsiyonel — yoksa kural tabanlı koç devreye girer)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
LLM_TIMEOUT_SECONDS = float(os.getenv("LLM_TIMEOUT_SECONDS", "20"))

# Günlük karbon bütçesi (kg CO2e) — Türkiye kişi başı ortalamasından türetilmiş
# (~5.4 t/yıl ≈ 14.8 kg/gün). Kullanıcı arayüzden değiştirebilir.
DEFAULT_DAILY_BUDGET_KG = float(os.getenv("CARBON_DAILY_BUDGET_KG", "15.0"))

# Sunucu
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
