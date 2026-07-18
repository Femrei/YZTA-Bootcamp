import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trackTransport, trackElectricity } from '../lib/tracking'
import { TRANSPORT_FACTORS, type TransportKey } from '../lib/emissionFactors'
import { analyze } from '../lib/insight'
import { generateTips } from '../lib/coach'

type Mode = 'transport' | 'electricity'

export default function AddEntry() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('transport')
  const [vehicle, setVehicle] = useState<TransportKey>('car_petrol')
  const [km, setKm] = useState('')
  const [kwh, setKwh] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const vehicleKeys = Object.keys(TRANSPORT_FACTORS) as TransportKey[]
  const previewKg = mode === 'transport'
    ? (parseFloat(km) || 0) * TRANSPORT_FACTORS[vehicle].kg_per_km
    : (parseFloat(kwh) || 0) * 0.478

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      let entry
      if (mode === 'transport') {
        const kmNum = parseFloat(km)
        if (!kmNum || kmNum <= 0) throw new Error('Geçerli bir mesafe girin.')
        entry = await trackTransport(vehicle, kmNum, date)
      } else {
        const kwhNum = parseFloat(kwh)
        if (!kwhNum || kwhNum <= 0) throw new Error('Geçerli bir tüketim girin.')
        entry = await trackElectricity(kwhNum, date)
      }

      const insight = await analyze()
      await generateTips(insight)

      setResult({
        ok: true,
        msg: `${entry.co2_kg} kg CO₂e eklendi (${mode === 'transport' ? TRANSPORT_FACTORS[vehicle as TransportKey].label : 'Elektrik'}, ${entry.amount} ${entry.unit}). Koçunuz önerilerini güncelledi.`,
      })
      setKm('')
      setKwh('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bir hata oluştu'
      setResult({ ok: false, msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 580 }}>
      <div className="card">
        <div className="card-head">
          <div>
            <h3>Veri Girişi</h3>
            <span className="card-sub">Takip Ajanı hesaplar, koç yorumlar</span>
          </div>
        </div>

        <div className="segment">
          <button
            className={mode === 'transport' ? 'on' : ''}
            onClick={() => setMode('transport')}
          >🚌 Ulaşım</button>
          <button
            className={mode === 'electricity' ? 'on' : ''}
            onClick={() => setMode('electricity')}
          >⚡ Elektrik</button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'transport' && (
            <>
              <label className="field-label" htmlFor="vehicle">Araç tipi</label>
              <select
                id="vehicle"
                className="field-select"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value as TransportKey)}
              >
                {vehicleKeys.map((k) => (
                  <option key={k} value={k}>
                    {TRANSPORT_FACTORS[k].label} — {TRANSPORT_FACTORS[k].kg_per_km} kg/km
                  </option>
                ))}
              </select>

              <label className="field-label" htmlFor="km">Mesafe (km)</label>
              <input
                id="km"
                className="field-input"
                type="number"
                min="0.1"
                step="0.1"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                placeholder="örn. 12.5"
                required
              />
            </>
          )}

          {mode === 'electricity' && (
            <>
              <label className="field-label" htmlFor="kwh">Tüketim (kWh)</label>
              <input
                id="kwh"
                className="field-input"
                type="number"
                min="0.1"
                step="0.1"
                value={kwh}
                onChange={(e) => setKwh(e.target.value)}
                placeholder="faturadaki kWh değeri"
                required
              />
            </>
          )}

          <label className="field-label" htmlFor="edate">Tarih</label>
          <input
            id="edate"
            className="field-input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          {previewKg > 0 && (
            <div style={{
              marginTop: 16, padding: '12px 16px',
              background: 'var(--card-soft)', border: '1px solid var(--line-soft)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '.88rem', color: 'var(--ink-soft)',
            }}>
              Tahmini emisyon: <b style={{ color: 'var(--leaf-deep)', fontFamily: 'Fraunces, serif', fontSize: '1.1rem' }}>
                {(Math.round(previewKg * 100) / 100)} kg CO₂e
              </b>
            </div>
          )}

          <button
            className="btn-primary"
            style={{ width: '100%', marginTop: 20 }}
            disabled={loading}
          >
            {loading ? 'Hesaplanıyor…' : 'Hesapla ve kaydet'}
          </button>
        </form>

        {result && (
          <div className={`result-banner ${result.ok ? '' : 'err'}`}>
            {result.ok ? '✅' : '⚠️'} {result.msg}
          </div>
        )}

        {result?.ok && (
          <button
            className="btn-secondary"
            style={{ marginTop: 12 }}
            onClick={() => navigate('/insights')}
          >İçgörüleri gör →</button>
        )}
      </div>
    </div>
  )
}
