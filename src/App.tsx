import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import AddEntry from './pages/AddEntry'
import Insights from './pages/Insights'
import Coach from './pages/Coach'
import History from './pages/History'
import Settings from './pages/Settings'

function ProtectedRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-spinner">Yükleniyor…</div>
  if (!user) return <Navigate to="/login" replace />
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/add" element={<AddEntry />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/coach" element={<Coach />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-spinner">Yükleniyor…</div>

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  )
}
