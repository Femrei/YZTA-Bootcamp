import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { analyze } from '../lib/insight'
import { fetchTasksForDay } from '../lib/coach'
import { fetchEntries } from '../lib/tracking'
import { fetchProfile, type Profile } from '../lib/profile'
import BudgetRing from '../components/BudgetRing'
import type { Insight, Task, Entry } from '../types'

export default function Dashboard() {
  const [insight, setInsight] = useState<Insight | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [recentEntries, setRecentEntries] = useState<Entry[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [ins, tsk, entries, prof] = await Promise.all([
          analyze(),
          fetchTasksForDay(),
          fetchEntries(10),
          fetchProfile(),
        ])
        setInsight(ins)
        setTasks(tsk)
        setRecentEntries(entries)
        setProfile(prof)
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
  const change = insight.week_change_pct
  const changeDeltaClass = change === null ? 'flat' : change > 5 ? 'up' : change < -5 ? 'down' : 'flat'

  return (
    <div className="stack stagger">
      <div className="grid-dashboard">
        <div className="card">
          <BudgetRing
            todayKg={insight.today_total_kg || 0}
            budget={budget}
            weekAvg={insight.daily_avg_kg || 0}
          />
          {insight.streak_days > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
              <span className="streak-badge">🔥 {insight.streak_days} günlük seri</span>
            </div>
          )}
          {insight.daily_avg_kg > 0 && (
            <div style={{ textAlign: 'center', marginTop: 12, fontSize: '.85rem', color: 'var(--ink-soft)' }}>
              Türkiye ortalamasının <b style={{ color: 'var(--ink)' }}>%{insight.vs_turkey_pct}</b> seviyesindesiniz
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3>İçgörü</h3>
              <span className="card-sub">İçgörü Ajanı'nın haftalık analizi</span>
            </div>
          </div>
          <div className="summary-box">{insight.summary}</div>
          <div className="metrics-grid">
            <div className="metric">
              <div className="v">{insight.week_total_kg}</div>
              <div className="k">bu hafta · kg</div>
            </div>
            <div className="metric">
              <div className="v">{insight.daily_avg_kg}</div>
              <div className="k">günlük ort. · kg</div>
            </div>
            <div className="metric">
              <div className="v" style={{
                color: change !== null && change > 0 ? 'var(--clay)' : 'var(--leaf-deep)'
              }}>
                {change === null ? '–' : (change > 0 ? '+' : '') + change + '%'}
              </div>
              <div className="k">haftalık değişim</div>
              {change !== null && (
                <span className={`delta ${changeDeltaClass}`}>
                  {change > 5 ? 'yükseliş' : change < -5 ? 'düşüş' : 'stabil'}
                </span>
              )}
            </div>
            <div className="metric">
              <div className="v">{insight.month_total_kg}</div>
              <div className="k">son 30 gün · kg</div>
            </div>
          </div>
          {insight.week_total_kg > 0 && (
            <div className="chips">
              <div className="chip">🌳 <b>{insight.equivalents.trees_year}</b> ağaç/yıl</div>
              <div className="chip">🚗 <b>{insight.equivalents.car_km}</b> km araba</div>
              <div className="chip">☕ <b>{insight.equivalents.coffee_cups}</b> fincan kahve</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Bugünün Yeşil Görevleri</h3>
              <span className="card-sub">Koç Ajanı'ndan</span>
            </div>
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
          <div className="card-head">
            <h3>Son Kayıtlar</h3>
            <Link to="/history" className="btn-secondary">Geçmiş</Link>
          </div>
          {recentEntries.length === 0 ? (
            <div className="empty-state">
              Henüz kayıt yok. <Link to="/add">İlk kaydınızı ekleyin →</Link>
            </div>
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
                    <td>
                      <span className={`pill ${r.category === 'transport' ? '' : 'amber'}`}>
                        {r.category === 'transport' ? '🚌 Ulaşım' : '⚡ Elektrik'}
                      </span>
                    </td>
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
