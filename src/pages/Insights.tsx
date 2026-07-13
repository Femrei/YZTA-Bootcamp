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
        backgroundColor: '#2E7D4F',
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

  return (
    <div className="stack">
      <div className="card">
        <h3>Özet <span className="card-sub">İçgörü Ajanı'nın haftalık analizi</span></h3>
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
      </div>

      <div className="card">
        <h3>30 Günlük Trend</h3>
        {trend.length === 0 ? (
          <div className="empty-state">Henüz trend verisi yok.</div>
        ) : (
          <div style={{ maxHeight: 280 }}>
            <Bar data={chartData} options={chartOptions} />
          </div>
        )}
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Eşdeğerler <span className="card-sub">Somutlaştırma</span></h3>
          {insight.week_total_kg > 0 ? (
            <div className="chips" style={{ marginTop: 8 }}>
              <div className="chip">🌳 <b>{insight.equivalents.trees_year}</b> ağacın yıllık emdiği CO₂</div>
              <div className="chip">🚗 <b>{insight.equivalents.car_km}</b> km araba yolculuğu</div>
              <div className="chip">☕ <b>{insight.equivalents.coffee_cups}</b> fincan kahve</div>
            </div>
          ) : (
            <div className="empty-state">Veri girdikçe eşdeğerler burada görünecek.</div>
          )}
          <div style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
            Türkiye günlük ortalaması: <b>{insight.turkey_daily_avg_kg} kg</b> CO₂e
            {insight.daily_avg_kg > 0 && (
              <span> · Siz: <b>{insight.vs_turkey_pct}%</b> seviyesindesiniz</span>
            )}
          </div>
        </div>

        <div className="card">
          <h3>Kategori Kırılımı <span className="card-sub">Bu hafta nereden geliyor?</span></h3>
          {subsEntries.length === 0 ? (
            <div className="empty-state">Bu hafta veri yok.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              {subsEntries.map(([key, val]) => {
                const label = key in TRANSPORT_FACTORS
                  ? TRANSPORT_FACTORS[key as keyof typeof TRANSPORT_FACTORS].label
                  : key === 'grid' ? 'Elektrik (şebeke)' : key
                const pct = insight.week_total_kg ? Math.round((val / insight.week_total_kg) * 100) : 0
                return (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: 4 }}>
                      <span>{label}</span>
                      <span style={{ fontWeight: 700 }}>{val} kg · %{pct}</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--neutral-100)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: key.startsWith('car') || key === 'motorcycle' || key === 'bus' || key === 'minibus' || key === 'metro' || key === 'train' || key === 'plane_domestic' || key === 'walk_bike'
                          ? 'var(--leaf)' : 'var(--amber)',
                        borderRadius: 999,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
              {topSubLabel && (
                <div style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', marginTop: 4 }}>
                  Öne çıkan kalem: <b>{topSubLabel}</b>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
