import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { analyze } from '../lib/insight'
import { fetchTasksForDay } from '../lib/coach'
import { fetchEntries } from '../lib/tracking'
import BudgetRing from '../components/BudgetRing'
import type { Insight, Task, Entry } from '../types'

export default function Dashboard() {
  const { profile } = useAuth()
  const [insight, setInsight] = useState<Insight | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [recentEntries, setRecentEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [ins, tsk, entries] = await Promise.all([
          analyze(),
          fetchTasksForDay(),
          fetchEntries(10),
        ])
        setInsight(ins)
        setTasks(tsk)
        setRecentEntries(entries)
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="loading-spinner">Yükleniyor…</div>
  if (!insight) return <div className="empty-state">Veriler yüklenemedi.</div>

  const budget = profile?.daily_budget_kg || 15

  return (
    <div className="stack">
      <div className="grid-2" style={{ gridTemplateColumns: '380px 1fr' }}>
        <div className="card">
          <BudgetRing
            todayKg={insight.today_total_kg || 0}
            budget={budget}
            weekAvg={insight.daily_avg_kg || 0}
          />
          {insight.streak_days > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
              <span className="streak-badge">🔥 {insight.streak_days} günlük seri</span>
            </div>
          )}
          {insight.daily_avg_kg > 0 && (
            <div style={{ textAlign: 'center', marginTop: 10, fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
              Türkiye ortalamasının %{insight.vs_turkey_pct} seviyesindesiniz
            </div>
          )}
        </div>

        <div className="card">
          <h3>İçgörü <span className="card-sub">İçgörü Ajanı'nın haftalık analizi</span></h3>
          <div className="summary-box">{insight.summary}</div>
          <div className="metrics-grid">
            <div className="metric">
              <div className="v">{insight.week_total_kg}</div>
              <div className="k">bu hafta (kg)</div>
            </div>
            <div className="metric">
              <div className="v">{insight.daily_avg_kg}</div>
              <div className="k">günlük ort. (kg)</div>
            </div>
            <div className="metric">
              <div className="v" style={{
                color: insight.week_change_pct !== null && insight.week_change_pct > 0
                  ? 'var(--clay)' : 'var(--leaf-deep)'
              }}>
                {insight.week_change_pct === null ? '–' :
                  (insight.week_change_pct > 0 ? '+' : '') + insight.week_change_pct + '%'}
              </div>
              <div className="k">haftalık değişim</div>
            </div>
            <div className="metric">
              <div className="v">{insight.month_total_kg}</div>
              <div className="k">son 30 gün (kg)</div>
            </div>
          </div>
          {insight.week_total_kg > 0 && (
            <div className="chips">
              <div className="chip">🌳 <b>{insight.equivalents.trees_year}</b> ağacın yıllık emdiği CO₂</div>
              <div className="chip">🚗 <b>{insight.equivalents.car_km}</b> km araba yolculuğu</div>
              <div className="chip">☕ <b>{insight.equivalents.coffee_cups}</b> fincan kahve</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Bugünün Yeşil Görevleri <span className="card-sub">Koç Ajanı'ndan</span></h3>
            <Link to="/coach" className="btn-secondary">Tümü</Link>
          </div>
          {tasks.length === 0 ? (
            <div className="empty-state">Veri girdiğinizde koçunuz size özel görevler hazırlar.</div>
          ) : (
            tasks.slice(0, 3).map((t) => (
              <div key={t.id} className={`task-item ${t.done ? 'done' : ''}`}>
                <input type="checkbox" checked={t.done} disabled />
                <span>{t.text}</span>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Son Kayıtlar</h3>
            <Link to="/history" className="btn-secondary">Geçmiş</Link>
          </div>
          {recentEntries.length === 0 ? (
            <div className="empty-state">Henüz kayıt yok. <Link to="/add">İlk kaydınızı ekleyin →</Link></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Tür</th>
                  <th className="num">Miktar</th>
                  <th className="num">kg CO₂e</th>
                </tr>
              </thead>
              <tbody>
                {recentEntries.slice(0, 5).map((r) => (
                  <tr key={r.id}>
                    <td>{r.entry_date}</td>
                    <td>{r.category === 'transport' ? '🚌' : '⚡'} {r.subtype === 'grid' ? 'Elektrik' : r.subtype}</td>
                    <td className="num">{r.amount} {r.unit}</td>
                    <td className="num"><b>{r.co2_kg}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
