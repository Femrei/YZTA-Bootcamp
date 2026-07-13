import { useEffect, useState } from 'react'
import { analyze } from '../lib/insight'
import { generateTips, fetchTasksForDay, completeTask } from '../lib/coach'
import { streakDays } from '../lib/insight'
import type { Insight, Task } from '../types'

export default function Coach() {
  const [insight, setInsight] = useState<Insight | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [provider, setProvider] = useState<string>('')

  async function loadAll() {
    try {
      const [ins, tsk, s] = await Promise.all([
        analyze(),
        fetchTasksForDay(),
        streakDays(),
      ])
      setInsight(ins)
      setTasks(tsk)
      setStreak(s)
    } catch (err) {
      console.error('Coach load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const ins = await analyze()
      setInsight(ins)
      const result = await generateTips(ins)
      setTasks(result.tips)
      setProvider(result.provider)
      const s = await streakDays()
      setStreak(s)
    } catch (err) {
      console.error('Coach refresh error:', err)
    } finally {
      setRefreshing(false)
    }
  }

  async function handleComplete(taskId: string) {
    try {
      await completeTask(taskId)
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, done: true } : t))
      const s = await streakDays()
      setStreak(s)
    } catch (err) {
      console.error('Task complete error:', err)
    }
  }

  if (loading) return <div className="loading-spinner">Yükleniyor…</div>

  const providerLabel: Record<string, string> = {
    gemini: 'Gemini',
    openai: 'OpenAI',
    rule_based: 'yerleşik koç (LLM anahtarı tanımlı değil)',
  }

  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Bugünün Yeşil Görevleri <span className="card-sub">Koç Ajanı'ndan</span></h3>
          <button
            className="btn-secondary"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Düşünüyor…' : 'Yenile'}
          </button>
        </div>

        {streak > 0 && (
          <div style={{ marginBottom: 12 }}>
            <span className="streak-badge">🔥 {streak} günlük seri</span>
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="empty-state">
            Veri girdiğinizde koçunuz size özel görevler hazırlar.
            {insight && insight.week_total_kg === 0 && (
              <div style={{ marginTop: 8 }}>
                Önce <a href="/add">veri girişi</a> yapın, ardından yenileyin.
              </div>
            )}
          </div>
        ) : (
          tasks.map((t) => (
            <div key={t.id} className={`task-item ${t.done ? 'done' : ''}`}>
              <input
                type="checkbox"
                checked={t.done}
                disabled={t.done}
                onChange={() => handleComplete(t.id)}
              />
              <span>{t.text}</span>
            </div>
          ))
        )}

        {provider && (
          <div className="provider-note">
            Öneri kaynağı: {providerLabel[provider] || provider}
          </div>
        )}
      </div>

      {insight && insight.week_total_kg > 0 && (
        <div className="card">
          <h3>Bu Haftaki Durum</h3>
          <div className="summary-box" style={{ fontSize: '0.92rem' }}>{insight.summary}</div>
          <div className="metrics-grid">
            <div className="metric">
              <div className="v">{insight.week_total_kg}</div>
              <div className="k">bu hafta (kg)</div>
            </div>
            <div className="metric">
              <div className="v">{insight.daily_avg_kg}</div>
              <div className="k">günlük ort. (kg)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
