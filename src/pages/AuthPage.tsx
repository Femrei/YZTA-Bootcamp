import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
        setSuccess('Hesap oluşturuldu! Giriş yapabilirsiniz.')
        setMode('login')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bir hata oluştu'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="logo">
          <h1><span className="dot">●</span> CarbOn</h1>
          <small>çok ajanlı karbon ayak izi koçu</small>
        </div>

        <div className="auth-tabs">
          <button
            className={mode === 'login' ? 'on' : ''}
            onClick={() => { setMode('login'); setError(''); setSuccess('') }}
          >Giriş yap</button>
          <button
            className={mode === 'register' ? 'on' : ''}
            onClick={() => { setMode('register'); setError(''); setSuccess('') }}
          >Kayıt ol</button>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="email">E-posta</label>
          <input
            id="email"
            className="field-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@email.com"
            required
            autoComplete="email"
          />

          <label className="field-label" htmlFor="password">Şifre</label>
          <input
            id="password"
            className="field-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="en az 6 karakter"
            required
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          <button
            className="btn-primary"
            style={{ width: '100%', marginTop: 24 }}
            disabled={loading}
          >
            {loading ? 'Bekleyin…' : mode === 'login' ? 'Giriş yap' : 'Hesap oluştur'}
          </button>
        </form>

        <div className="auth-footer">
          CarbOn · YZTA Bootcamp 2026 — Takım 17
        </div>
      </div>
    </div>
  )
}
