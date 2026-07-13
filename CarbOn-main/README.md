# 🌿 CarbOn

**Çok Ajanlı Yapay Zeka Destekli Karbon Ayak İzi Koçu**

YZTA Bootcamp 2026 — Takım 17

---

## Takım İsmi

YZTA Takım 17 (CarbOn)

## Takım Elemanları

| Kişi | Rol | Teknik Sorumluluk |
|---|---|---|
| Melis Can | Product Owner + Developer | 
| Eda Kaygulu | Scrum Master + Developer |
| Rüya Sena Demirci | Developer |
| Furkan Emre İnce | Developer |
| Musa Barutcu | Developer |

## Ürün İsmi

CarbOn

## Ürün Açıklaması

CarbOn, bireylerin ulaşım ve elektrik tüketimi alışkanlıklarının çevresel
etkisini somut şekilde görmelerini ve azaltmalarını sağlayan çok ajanlı
yapay zeka destekli bir karbon ayak izi koçudur. Kullanıcı girdilerini
işleyen **Takip Ajanı**, eğilimleri analiz eden **İçgörü Ajanı** ve
kişiselleştirilmiş öneriler üreten **Koç Ajanı**, bir **Orkestratör**
tarafından koordine edilir; kullanıcı geçmişi hafızada tutularak zamanla
daha kişisel öneriler üretilir.

## Ürün Özellikleri

- 🚌 Ulaşım (11 araç tipi) ve ⚡ elektrik girişinden anlık CO₂e hesabı
- 📊 30 günlük kategori kırılımlı trend grafiği ve haftalık karşılaştırma
- 🧠 İçgörü Ajanı'ndan sade, jargonsuz haftalık özet metni
- 🤖 Koç Ajanı'ndan günlük 3 "yeşil görev" (Gemini/OpenAI veya yerleşik koç)
- 🎯 Günlük karbon bütçesi halkası ve Türkiye ortalaması kıyası
- 🔥 Seri (streak) takibi ve görev tamamlama
- 🌳 Somutlaştırma: ağaç / araba-km / kahve eşdeğerleri
- 📤 CSV/JSON veri dışa aktarma
- 🛡️ LLM anahtarı olmadan da tam çalışan fallback mimarisi

## Hedef Kitle

- Karbon ayak izini azaltmak isteyen 18–60 yaş arası akıllı telefon kullanıcıları
- Sürdürülebilir yaşamı benimsemek isteyen dijital kullanıcılar
- Tüketim alışkanlıklarını bilinçli takip etmek isteyenler

---

## Kurulum ve Çalıştırma

### Yerel

```bash
pip install -r requirements.txt
cp .env.example .env        # (opsiyonel) LLM anahtarlarını doldurun
uvicorn app.main:app --reload
```

Arayüz: http://localhost:8000 · API dokümanı: http://localhost:8000/docs

> **Not:** `GEMINI_API_KEY` veya `OPENAI_API_KEY` tanımlı değilse Koç Ajanı
> otomatik olarak yerleşik kural tabanlı koça geçer; uygulama anahtarsız da
> uçtan uca çalışır.

### Docker (canlıya alma)

```bash
docker build -t carbon .
docker run -p 8000:8000 --env-file .env carbon
```

Render / Railway / Fly.io gibi platformlara Dockerfile ile doğrudan deploy
edilebilir (değerlendirmede "canlıya alınabilir" ekstra 10 puan).

### Testler

```bash
python -m pytest tests/ -v
```

---

## Mimari

```
Kullanıcı girdisi (km / kWh)
        │
        ▼
┌─────────────────── ORKESTRATÖR ───────────────────┐
│                                                   │
│  1) Tracking Agent                                │
│     km × araç katsayısı  |  kWh × 0.478           │
│     → SQLite hafızaya yazar                       │
│                                                   │
│  2) Insight Agent                                 │
│     30 günlük trend, kategori kırılımı,           │
│     haftalık değişim, eşdeğerler, özet metin      │
│                                                   │
│  3) Coach Agent                                   │
│     Gemini → OpenAI → kural tabanlı (fallback)    │
│     → günün 3 yeşil görevi                        │
│                                                   │
│  Her adım kendi hata sınırında; ajan düşerse      │
│  akış kesilmez (fallback mekanizması).            │
└───────────────────────────────────────────────────┘
        │
        ▼
FastAPI REST → tek sayfa arayüz (Chart.js)
```

### Veri Kaynakları

- **Elektrik:** 0.478 kg CO₂e/kWh — Türkiye ulusal şebeke (ETKB/EVÇED)
- **Ulaşım:** DEFRA 2024 yaklaşık katsayıları; `CLIMATIQ_API_KEY`
  tanımlanırsa Climatiq API'den canlı katsayı denenir, hata durumunda
  yerel tabloya düşülür.

### Proje Yapısı

```
carbon/
├── app/
│   ├── main.py              # FastAPI uçları
│   ├── config.py            # ortam değişkenleri
│   ├── db.py                # SQLite hafıza katmanı
│   ├── emission_factors.py  # katsayılar + kaynaklar
│   ├── agents/
│   │   ├── tracking.py      # Takip Ajanı
│   │   ├── insight.py       # İçgörü Ajanı
│   │   ├── coach.py         # Koç Ajanı (LLM + fallback)
│   │   └── orchestrator.py  # Orkestratör
│   └── static/index.html    # arayüz
├── tests/test_carbon.py     # 13 test
├── requirements.txt
├── Dockerfile
├── .env.example
└── run.sh
```

## API Özeti

| Uç | Açıklama |
|---|---|
| `POST /api/entries` | Girdi ekle → tam pipeline (Tracking→Insight→Coach) |
| `GET /api/dashboard` | Arayüz için tüm veriler tek çağrıda |
| `GET /api/insight` | İçgörü Ajanı analizi |
| `POST /api/coach/refresh` | Koç önerilerini yenile |
| `POST /api/tasks/complete` | Yeşil görevi tamamla (streak) |
| `POST /api/budget` | Günlük bütçeyi güncelle |
| `GET /api/export?fmt=csv\|json` | Veri dışa aktarma |
| `GET /api/health` | Sağlık + aktif LLM sağlayıcısı |

---

*CarbOn — YZTA Bootcamp 2026 | Takım 17*
