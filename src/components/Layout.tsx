import { useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { to: '/', label: 'Panel', icon: '◐' },
  { to: '/add', label: 'Veri Girişi', icon: '＋' },
  { to: '/insights', label: 'İçgörüler', icon: '◔' },
  { to: '/coach', label: 'Koç', icon: '✦' },
  { to: '/history', label: 'Geçmiş', icon: '☰' },
  { to: '/settings', label: 'Ayarlar', icon: '⚙' },
]

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Panel', subtitle: 'Karbon ayak izinize genel bakış' },
  '/add': { title: 'Veri Girişi', subtitle: 'Ulaşım veya elektrik verisi ekleyin' },
  '/insights': { title: 'İçgörüler', subtitle: 'Trendler, metrikler ve eşdeğerler' },
  '/coach': { title: 'Koç', subtitle: 'Size özel yeşil görevler' },
  '/history': { title: 'Geçmiş', subtitle: 'Tüm kayıtlarınız ve dışa aktarma' },
  '/settings': { title: 'Ayarlar', subtitle: 'Bütçe ve profil ayarları' },
}

export default function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, signOut } = useAuth()
  const location = useLocation()
  const page = PAGE_TITLES[location.pathname] || { title: 'CarbOn', subtitle: '' }

  return (
    <div className="app-layout">
      <div className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <h1><span className="dot">●</span> CarbOn</h1>
        </div>
        <ul className="nav-list">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="icon">{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <div className="user-email">{user?.email}</div>
          <button className="logout-btn" onClick={() => signOut()}>Çıkış yap</button>
        </div>
      </aside>

      <div className="main-area">
        <div className="mobile-header">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>
          <h1><span style={{ color: 'var(--leaf)' }}>●</span> CarbOn</h1>
          <div style={{ width: 40 }} />
        </div>
        <div className="page-header">
          <h2>{page.title}</h2>
          <p>{page.subtitle}</p>
        </div>
        <div className="page-content fade-in" key={location.pathname}>
          {children}
        </div>
      </div>
    </div>
  )
}
