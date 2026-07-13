import { useEffect, useState } from 'react'
import { fetchEntries, deleteEntry } from '../lib/tracking'
import { TRANSPORT_FACTORS } from '../lib/emissionFactors'
import { supabase } from '../lib/supabaseClient'
import type { Entry } from '../types'

export default function History() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const data = await fetchEntries(500)
      setEntries(data)
    } catch (err) {
      console.error('History load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDelete(id: string) {
    try {
      await deleteEntry(id)
      setEntries((prev) => prev.filter((e) => e.id !== id))
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  async function handleExport(fmt: 'csv' | 'json') {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500)

    if (error || !data) return

    if (fmt === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'carbon_export.json'
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const headers = ['id', 'entry_date', 'category', 'subtype', 'amount', 'unit', 'co2_kg', 'created_at']
      const rows = [headers.join(',')]
      for (const r of data) {
        rows.push(headers.map((h) => `"${String((r as Record<string, unknown>)[h] || '')}"`).join(','))
      }
      const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'carbon_export.csv'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  if (loading) return <div className="loading-spinner">Yükleniyor…</div>

  return (
    <div className="stack">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h3 style={{ margin: 0 }}>Tüm Kayıtlar</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" onClick={() => handleExport('csv')}>CSV indir</button>
            <button className="btn-secondary" onClick={() => handleExport('json')}>JSON</button>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="empty-state">Henüz kayıt yok.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Tür</th>
                  <th>Alt Tip</th>
                  <th className="num">Miktar</th>
                  <th className="num">kg CO₂e</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((r) => (
                  <tr key={r.id}>
                    <td>{r.entry_date}</td>
                    <td>{r.category === 'transport' ? '🚌 Ulaşım' : '⚡ Elektrik'}</td>
                    <td>{r.subtype === 'grid' ? 'Şebeke' :
                      r.subtype in TRANSPORT_FACTORS ? TRANSPORT_FACTORS[r.subtype as keyof typeof TRANSPORT_FACTORS].label : r.subtype}</td>
                    <td className="num">{r.amount} {r.unit}</td>
                    <td className="num"><b>{r.co2_kg}</b></td>
                    <td>
                      <button className="del-btn" onClick={() => handleDelete(r.id)} title="Sil" aria-label="Kaydı sil">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
