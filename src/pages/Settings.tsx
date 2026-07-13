import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { DEFAULT_DAILY_BUDGET_KG } from '../lib/emissionFactors'

export default function Settings() {
  const { profile, refreshProfile, user, signOut } = useAuth()
  const [budget, setBudget] = useState(String(profile?.daily_budget_kg || DEFAULT_DAILY_BUDGET_KG))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

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
      const { error } = await supabase
        .from('profiles')
        .update({ daily_budget_kg: n })
        .eq('id', user!.id)
      if (error) throw error
      await refreshProfile()
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
        <h3>Profil <span className="card-sub">Hesap bilgileri</span></h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.9rem' }}>
          <div>
            <span style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>E-posta: </span>
            <span>{user?.email}</span>
          </div>
          <div>
            <span style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>Hesap tarihi: </span>
            <span>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('tr-TR') : '–'}</span>
          </div>
        </div>
        <button
          className="btn-secondary"
          style={{ marginTop: 20, color: 'var(--clay)', borderColor: 'var(--error-400)' }}
          onClick={() => signOut()}
        >
          Çıkış yap
        </button>
      </div>

      <div className="card">
        <h3>Veri & Gizlilik</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', lineHeight: 1.6 }}>
          Tüm karbon verileriniz Supabase üzerinde güvenli şekilde saklanır ve sadece
          kendi hesabınızdan erişilebilir. Hesabınızı silerseniz tüm verileriniz
          otomatik olarak kaldırılır.
        </p>
        <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: 12 }}>
          CarbOn · YZTA Bootcamp 2026 — Takım 17 · Elektrik katsayısı: 0.478 kg CO₂e/kWh (ETKB/EVÇED)
        </p>
      </div>
    </div>
  )
}
