# CarbOn — Detaylı Proje Raporu

YZTA Bootcamp 2026 · Takım 17 · Hazırlanma tarihi: 6 Temmuz 2026 (Sprint 2, 1. gün)

---

## 1. Özet

Proje özet dökümanında tanımlanan CarbOn mimarisi (Tracking + Insight + Coach
ajanları ve Orkestratör) uçtan uca, çalışır ve production'a hazır bir uygulama
olarak kodlandı. Uygulama tek komutla ayağa kalkıyor, LLM anahtarı olmadan bile
tam fonksiyonel çalışıyor, 13 otomatik testin tamamını geçiyor ve Dockerfile ile
canlıya alınmaya hazır. Sprint 2 hedeflerinin (US-1'den US-6'ya kadar, stretch
goal dahil) tamamı bu teslimatta karşılanıyor.

## 2. Teslim Edilen Bileşenler

| Bileşen | Dosya | Durum |
|---|---|---|
| Tracking Agent | `app/agents/tracking.py` | ✅ km/kWh doğrulama, katsayı hesabı, Climatiq opsiyonu |
| Insight Agent | `app/agents/insight.py` | ✅ trend, kırılım, haftalık kıyas, özet metin, eşdeğerler |
| Coach Agent | `app/agents/coach.py` | ✅ Gemini → OpenAI → kural tabanlı üçlü fallback |
| Orkestratör | `app/agents/orchestrator.py` | ✅ hata sınırlı pipeline, adım bazlı durum raporu |
| Hafıza katmanı | `app/db.py` | ✅ SQLite: girişler, görevler, kullanıcı ayarları, streak |
| REST API | `app/main.py` | ✅ 10 uç + otomatik Swagger dokümanı (/docs) |
| Arayüz | `app/static/index.html` | ✅ tek sayfa, responsive, Chart.js trend grafiği |
| Testler | `tests/test_carbon.py` | ✅ 13/13 geçiyor |
| Deploy | `Dockerfile`, `run.sh`, `.env.example` | ✅ hazır |
| Dokümantasyon | `README.md` | ✅ bootcamp README şablonuna uygun |

## 3. Mimari Kararlar ve Gerekçeleri

**Ajan sınırları hata sınırlarıyla örtüşüyor.** Orkestratör her ajanı ayrı
try/except bloğunda çalıştırır. Insight çökerse Coach yine çalışır; Coach'un
LLM çağrısı başarısız olursa kural tabanlı koç devreye girer. Kılavuzdaki
"fallback mekanizması" gereksinimi böylece jüri karşısında canlı demo
sırasında bile güvence altında: internet kesilse, API kotası dolsa uygulama
öneri üretmeye devam eder.

**LLM sağlayıcısı takılabilir (pluggable).** Coach Agent, SDK bağımlılığı
yerine doğrudan REST çağrısı (httpx) kullanır; Gemini ve OpenAI aynı prompt ve
aynı JSON çıktı sözleşmesiyle çalışır. Model çıktısı `{"tips": [...]}`
şemasına zorlanır ve `_extract_tips` fonksiyonu markdown kod bloklarını
temizleyerek güvenli parse yapar. Bu, değerlendirme kriterlerindeki "AI
Agent'ların kullanımı, hafıza, orkestrasyon vb. teknik yönetimlerinin düzgün
yapılmış olması" (15 puan) maddesini doğrudan hedefler.

**Hafıza SQLite üzerinde.** Kullanıcı bazlı girişler, günün görevleri ve
bütçe ayarı kalıcıdır; Insight Agent her analizde son 30 günü okur, Coach
Agent önerilerini "günün görevleri" olarak hafızaya yazar. Ek sunucu
gerektirmez, Docker imajıyla birlikte taşınır.

**Katsayılar tek modülde ve kaynaklı.** `emission_factors.py` içinde her
katsayının kaynağı (ETKB/EVÇED 0.478 kg/kWh, DEFRA 2024 ulaşım değerleri)
yorum satırlarıyla belgelendi. Climatiq API anahtarı verilirse ulaşım
katsayısı canlı çekilir, hata durumunda yerel tabloya düşülür.

## 4. Eklenen Yeni Özellikler (proje özetinde olmayanlar)

Aşağıdakiler benim eklediğim, orijinal dokümanda bulunmayan geliştirmeler:

1. **Günlük karbon bütçesi halkası (arayüzün imza öğesi).** Türkiye kişi başı
   ortalamasından türetilen 15 kg/gün varsayılan bütçe; dış halka bugünkü
   toplamı, iç halka haftalık ortalamayı gösterir. Bütçe aşılırsa halka
   kırmızıya döner. Kullanıcı bütçesini arayüzden değiştirebilir.
2. **Oyunlaştırma: yeşil görevler + streak.** Koçun 3 önerisi işaretlenebilir
   görevlere dönüşür; art arda veri girilen/görev tamamlanan günler 🔥 seri
   sayacını büyütür. Alışkanlık oluşturma hedefini (hedef kitle: sürdürülebilir
   yaşam) doğrudan destekler.
3. **Somutlaştırma eşdeğerleri.** Haftalık toplam; "X ağacın yıllık emdiği
   CO₂", "Y km araba", "Z fincan kahve" olarak gösterilir — "bireyler etkiyi
   somut göremiyor" problem tanımına birebir cevap.
4. **Türkiye ortalaması kıyası.** Kullanıcının günlük ortalaması ulusal
   ortalamanın yüzdesi olarak gösterilir.
5. **Kural tabanlı yedek koç.** LLM anahtarı hiç olmasa bile kullanıcının
   verisine göre (araba ağırlıklıysa ulaşım, elektrik ağırlıklıysa enerji
   odaklı) anlamlı 3 öneri üreten deterministik koç.
6. **Veri dışa aktarma (CSV/JSON).** Kullanıcı verisinin taşınabilirliği.
7. **Climatiq canlı katsayı opsiyonu.** Dokümanda "veya" olarak geçen iki
   kaynak, otomatik fallback'li tek akışta birleştirildi.
8. **Kayıt silme + tarih seçerek geçmişe giriş.** Fatura dönemi gibi geçmiş
   tarihli veriler girilebilir.
9. **13 testlik otomatik test paketi + Dockerfile.** "Temiz kod/mimari"
   (15 p) ve "canlıya alınabilir" (10 p) ekstra puan kalemlerini hedefler.
10. **Swagger dokümantasyonu.** `/docs` altında tüm API otomatik belgelenir.

## 5. Değerlendirme Kriterleriyle Eşleşme

| Kriter | Karşılık |
|---|---|
| Yarışmaya hazır, çalışan proje (10) | Tek komutla çalışıyor; anahtar gerektirmeyen demo modu |
| Özgünlük (10) | Bütçe halkası, streak, eşdeğerler, TR-özel katsayılar |
| Ürün tamamlanma (10) | MVP kapsamının tamamı + stretch goal (geçmiş görüntüleme) |
| Pazara uygunluk (10) | Hedef kitleye uygun sade Türkçe arayüz, mobil uyumlu |
| YZ modeli seçimi/kullanımı (20) | Gemini/OpenAI prompt mühendisliği, JSON şema zorlaması |
| Agent kullanımı, hafıza, orkestrasyon (15) | 3 ajan + orkestratör, SQLite hafıza, hata sınırları |
| Mimari/temiz kod (15) | Katmanlı yapı, tip ipuçları, docstring'ler, 13 test |
| Canlıya alınabilirlik (10) | Dockerfile, .env yapılandırması, PORT değişkeni |

## 6. Test Sonuçları

`python -m pytest tests/ -v` → **13 geçti, 0 hata.** Kapsam: ulaşım/elektrik
hesap doğruluğu, geçersiz girdi reddi, haftalık değişim tespiti, kural tabanlı
koçun her koşulda 3 öneri üretmesi, LLM çıktısı JSON ayıklama, tam pipeline
akışı, API doğrulama hataları (422), CSV dışa aktarma, görev tamamlama/streak,
bütçe güncelleme. Ayrıca canlı sunucu üzerinde uçtan uca duman testi yapıldı
(giriş → pipeline → dashboard → arayüz 200 OK).

## 7. Bilinen Sınırlar ve Sprint 3 Önerileri

- **Kimlik doğrulama yok:** kullanıcı ayrımı isimle yapılıyor. Bootcamp
  kapsamı için yeterli; canlı üründe basit bir oturum/token katmanı eklenmeli.
- **Gıda/alışveriş kategorileri** MVP dışı bırakıldı (dokümandaki karara uygun);
  `emission_factors.py` yapısı yeni kategori eklemeye hazır.
- **Ses arayüzü** stretch goal olarak duruyor; Web Speech API ile frontend'e
  eklenebilir.
- Sprint 3 için öncelik önerim: (1) deploy (Render/Railway — ekstra 10 puan),
  (2) demo videosu senaryosunda bütçe halkası + koç yenileme akışını gösterin,
  (3) README'ye sprint review ekran görüntülerini ekleyin.

## 8. Çalıştırma Talimatı (özet)

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
# http://localhost:8000
```

LLM'li mod için `.env` dosyasına `GEMINI_API_KEY` veya `OPENAI_API_KEY` girin;
girmezseniz yerleşik koç otomatik devrededir.

---

*Rapor sonu — CarbOn, YZTA Bootcamp 2026, Takım 17*
