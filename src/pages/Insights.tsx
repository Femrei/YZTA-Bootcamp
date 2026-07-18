import { useEffect, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { analyze } from '../lib/insight'
import { TRANSPORT_FACTORS } from '../lib/emissionFactors'
import type { Insight } from '../types'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function Insights() {
  const [insight, setInsight] = useState<Insight | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyze()
      .then(setInsight)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-spinner">Yükleniyor…</div>
  if (!insight) return <div className="empty-state">Veriler yüklenemedi.</div>

  const trend = insight.trend
  const chartData = {
    labels: trend.map((t) => t.date.slice(5)),
    datasets: [
      {
        label: 'Ulaşım',
        data: trend.map((t) => t.transport),
        backgroundColor: '#2E8759',
        borderRadius: 4,
        stack: 'a',
      },
      {
        label: 'Elektrik',
        data: trend.map((t) => t.electricity),
        backgroundColor: '#E39A2D',
        borderRadius: 4,
        stack: 'a',
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { boxWidth: 12, font: { family: 'Manrope' } },
      },
    },
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: {
        stacked: true,
        title: { display: true, text: 'kg CO₂e' },
      },
    },
  }

  const subsEntries = Object.entries(insight.by_subtype)
  const topSubLabel = insight.top_subtype && insight.top_subtype in TRANSPORT_FACTORS
    ? TRANSPORT_FACTORS[insight.top_subtype as keyof typeof TRANSPORT_FACTORS].label
    : insight.top_subtype
  const change = insight.week_change_pct

  return (
    <div className="stack stagger">
      <div className="card">
        <div className="card-head">
          <div>
            <h3>Özet</h3>
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
          </div>
          <div className="metric">
            <div className="v">{insight.month_total_kg}</div>
            <div className="k">son 30 gün · kg</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h3>30 Günlük Trend</h3>
            <span className="card-sub">Kategori kırılımlı günlük emisyon</span>
          </div>
        </div>
        {trend.length === 0 ? (
          <div className="empty-state">Henüz trend verisi yok.</div>
        ) : (
          <div style={{ maxHeight: 300 }}>
            <Bar data={chartData} options={chartOptions} />
          </div>
        )}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Eşdeğerler</h3>
              <span className="card-sub">Somutlaştırma</span>
            </div>
          </div>
          {insight.week_total_kg > 0 ? (
            <div className="chips" style={{ marginTop: 8 }}>
              <div className="chip">🌳 <b>{insight.equivalents.trees_year}</b> ağacın yıllık emdiği CO₂</div>
              <div className="chip">🚗 <b>{insight.equivalents.car_km}</b> km araba yolculuğu</div>
              <div className="chip">☕ <b>{insight.equivalents.coffee_cups}</b> fincan kahve</div>
            </div>
          ) : (
            <div className="empty-state">Veri girdikçe eşdeğerler burada görünecek.</div>
          )}
          <div style={{ marginTop: 18, fontSize: '.85rem', color: 'var(--ink-soft)', lineHeight: 1.6 }}>
            Türkiye günlük ortalaması: <b style={{ color: 'var(--ink)' }}>{insight.turkey_daily_avg_kg} kg</b> CO₂e
            {insight.daily_avg_kg > 0 && (
              <span> · Siz: <b style={{ color: 'var(--leaf-deep)' }}>%{insight.vs_turkey_pct}</b> seviyesindesiniz</span>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3>Kategori Kırılımı</h3>
              <span className="card-sub">Bu hafta nereden geliyor?</span>
            </div>
          </div>
          {subsEntries.length === 0 ? (
            <div className="empty-state">Bu hafta veri yok.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
              {subsEntries.map(([key, val]) => {
                const label = key in TRANSPORT_FACTORS
                  ? TRANSPORT_FACTORS[key as keyof typeof TRANSPORT_FACTORS].label
                  : key === 'grid' ? 'Elektrik (şebeke)' : key
                const pct = insight.week_total_kg ? Math.round((val / insight.week_total_kg) * 100) : 0
                const isTransport = key in TRANSPORT_FACTORS
                return (
                  <div key={key} className="bar-row">
                    <div className="bar-row-head">
                      <span className="lbl">{label}</span>
                      <span className="val">{val} kg · %{pct}</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{
                        width: `${pct}%`,
                        background: isTransport ? 'var(--leaf)' : 'var(--amber)',
                      }} />
                    </div>
                  </div>
                )
              })}
              {topSubLabel && (
                <div style={{ fontSize: '.82rem', color: 'var(--ink-soft)', marginTop: 4 }}>
                  Öne çıkan kalem: <b style={{ color: 'var(--ink)' }}>{topSubLabel}</b>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
