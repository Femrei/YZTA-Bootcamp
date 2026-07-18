import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

type NavItem = { to: string; label: string; icon: string }

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Genel',
    items: [
      { to: '/', label: 'Panel', icon: '◐' },
      { to: '/add', label: 'Veri Girişi', icon: '＋' },
      { to: '/insights', label: 'İçgörüler', icon: '◔' },
    ],
  },
  {
    label: 'Koçluk',
    items: [
      { to: '/coach', label: 'Koç', icon: '✦' },
      { to: '/history', label: 'Geçmiş', icon: '☰' },
      { to: '/settings', label: 'Ayarlar', icon: '⚙' },
    ],
  },
]

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Panel', subtitle: 'Karbon ayak izinize genel bakış' },
  '/add': { title: 'Veri Girişi', subtitle: 'Ulaşım veya elektrik verisi ekleyin' },
  '/insights': { title: 'İçgörüler', subtitle: 'Trendler, metrikler ve eşdeğerler' },
  '/coach': { title: 'Koç', subtitle: 'Size özel yeşil görevler' },
  '/history': { title: 'Geçmiş', subtitle: 'Tüm kayıtlarınız ve dışa aktarma' },
  '/settings': { title: 'Ayarlar', subtitle: 'Bütçe ve profil ayarları' },
}

const COLLAPSE_KEY = 'carbon.sidebar.collapsed'

export default function Layout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const saved = window.localStorage.getItem(COLLAPSE_KEY)
    if (saved !== null) return saved === '1'
    return window.innerWidth < 1100
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const page = PAGE_TITLES[location.pathname] || { title: 'CarbOn', subtitle: '' }

  useEffect(() => {
    window.localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <div className="app-shell">
      <div
        className={`sidebar-scrim ${mobileOpen ? 'show' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden
      />

      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-head">
          <div className="sidebar-brand">
            <div className="mark">C</div>
            <div>
              <div className="name">Carb<b>On</b></div>
              <div className="tag">karbon koçu</div>
            </div>
          </div>
        </div>

        <button
          className="collapse-btn"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Kenar çubuğunu genişlet' : 'Kenar çubuğunu daralt'}
          title={collapsed ? 'Genişlet' : 'Daralt'}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M6.5 1.5L3 5L6.5 8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <nav className="nav-list">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <div className="nav-section-label">{section.label}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-foot-card">
            <div className="sidebar-foot-text">
              <b>0.478</b> kg/kWh<br/>
              Türkiye şebeke faktörü
            </div>
          </div>
        </div>
      </aside>

      <div className={`main-area ${collapsed ? 'expanded' : ''}`}>
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileOpen(true)}
              aria-label="Menüyü aç"
            >
              ☰
            </button>
            <div className="topbar-title">
              <h2>{page.title}</h2>
              <p>{page.subtitle}</p>
            </div>
          </div>
          <div className="topbar-actions">
            <span className="topbar-chip">
              <span className="dot" />
              YZTA Bootcamp · Takım 17
            </span>
          </div>
        </header>

        <main className="page-content fade-in" key={location.pathname}>
          {children}
        </main>
      </div>
    </div>
  )
}
