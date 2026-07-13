import { Routes, Route } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AddEntry from './pages/AddEntry'
import Insights from './pages/Insights'
import Coach from './pages/Coach'
import History from './pages/History'
import Settings from './pages/Settings'

export default function App() {
  const { loading } = useAuth()
  if (loading) return <div className="loading-spinner">Yükleniyor…</div>

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/add" element={<AddEntry />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/coach" element={<Coach />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}
