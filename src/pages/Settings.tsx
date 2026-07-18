import { useState, useEffect } from 'react'
import { fetchProfile, saveBudget } from '../lib/profile'
import { DEFAULT_DAILY_BUDGET_KG } from '../lib/emissionFactors'

export default function Settings() {
  const [budget, setBudget] = useState(String(DEFAULT_DAILY_BUDGET_KG))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProfile()
      .then((p) => setBudget(String(p.daily_budget_kg)))
      .catch(console.error)
  }, [])

  async function handleSaveBudget(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    const n = parseFloat(budget)
    if (!n || n <= 0 || n > 1000) {
      setError('1 ile 1000 arasında bir değer girin.')
      setSaving(false)
      return
    }
    try {
      await saveBudget(n)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <div className="card">
        <div className="card-head">
          <div>
            <h3>Karbon Bütçesi</h3>
            <span className="card-sub">Günlük hedef kg CO₂e</span>
          </div>
        </div>
        <p style={{ fontSize: '.88rem', color: 'var(--ink-soft)', marginBottom: 18, lineHeight: 1.6 }}>
          Türkiye kişi başı günlük ortalama <b style={{ color: 'var(--ink)' }}>~14.8 kg</b> CO₂e.
          Hedefinizi buna göre ayarlayın; bütçe aşılırsa paneldeki halka kırmızıya döner.
        </p>
        <form onSubmit={handleSaveBudget}>
          <label className="field-label" htmlFor="budget">Günlük bütçe (kg CO₂e)</label>
          <input
            id="budget"
            className="field-input"
            type="number"
            min="1"
            max="1000"
            step="0.5"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
          {error && <div className="result-banner err" style={{ marginTop: 14 }}>{error}</div>}
          {saved && <div className="result-banner" style={{ marginTop: 14 }}>✅ Bütçe güncellendi.</div>}
          <button
            className="btn-primary"
            style={{ marginTop: 18, width: '100%' }}
            disabled={saving}
          >
            {saving ? 'Kaydediliyor…' : 'Bütçeyi kaydet'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h3>Veri & Gizlilik</h3>
            <span className="card-sub">Verileriniz nerede saklanır?</span>
          </div>
        </div>
        <p style={{ fontSize: '.88rem', color: 'var(--ink-soft)', lineHeight: 1.65 }}>
          Tüm karbon verileriniz Supabase üzerinde güvenli şekilde saklanır.
          Hesap gerektirmez; tek cihaz/tek profil senaryosu için tasarlanmıştır.
        </p>
        <div style={{
          marginTop: 16, padding: '14px 16px',
          background: 'var(--card-soft)', border: '1px solid var(--line-soft)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '.82rem', color: 'var(--ink-muted)', lineHeight: 1.6,
        }}>
          <b style={{ color: 'var(--ink-soft)' }}>Elektrik katsayısı:</b> 0.478 kg CO₂e/kWh (ETKB/EVÇED)<br/>
          <b style={{ color: 'var(--ink-soft)' }}>Ulaşım katsayıları:</b> DEFRA 2024 yaklaşık değerleri<br/>
          <b style={{ color: 'var(--ink-soft)' }}>Karşılaştırma:</b> Türkiye kişi başı ~14.8 kg/gün
        </div>
      </div>
    </div>
  )
}
