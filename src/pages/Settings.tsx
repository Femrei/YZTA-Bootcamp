import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { DEFAULT_DAILY_BUDGET_KG } from '../lib/emissionFactors'

export default function Settings() {
  const [budget, setBudget] = useState(String(DEFAULT_DAILY_BUDGET_KG))
  const [profileId, setProfileId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)
        .maybeSingle()
      if (data) {
        setProfileId(data.id)
        setBudget(String(data.daily_budget_kg))
      }
    }
    loadProfile()
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
      if (profileId) {
        const { error } = await supabase
          .from('profiles')
          .update({ daily_budget_kg: n })
          .eq('id', profileId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .insert({ daily_budget_kg: n })
          .select()
          .single()
        if (error) throw error
        setProfileId(data.id)
      }
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
        <h3>Karbon Bütçesi <span className="card-sub">Günlük hedef kg CO₂e</span></h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginBottom: 16 }}>
          Türkiye kişi başı günlük ortalama ~14.8 kg CO₂e. Hedefinizi buna göre ayarlayın.
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
          {error && <div className="result-banner err" style={{ marginTop: 10 }}>{error}</div>}
          {saved && <div className="result-banner" style={{ marginTop: 10 }}>✅ Bütçe güncellendi.</div>}
          <button
            className="btn-primary"
            style={{ marginTop: 16 }}
            disabled={saving}
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Veri & Gizlilik</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', lineHeight: 1.6 }}>
          Tüm karbon verileriniz Supabase üzerinde güvenli şekilde saklanır.
        </p>
        <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: 12 }}>
          CarbOn · YZTA Bootcamp 2026 — Takım 17 · Elektrik katsayısı: 0.478 kg CO₂e/kWh (ETKB/EVÇED)
        </p>
      </div>
    </div>
  )
}
