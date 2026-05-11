import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, LogIn, ShieldCheck, User } from 'lucide-react'
import api from '../services/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.post('/auth/login', {
        username,
        password
      })

      localStorage.setItem('smart_k3_user', JSON.stringify(res.data.user))
      navigate('/dashboard')
    } catch (error) {
      const message =
        error.response?.data?.message || 'Login gagal. Periksa username dan password.'

      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-shell">
        <div className="login-left">
          <div className="login-left-overlay" />

          <div className="login-left-content">
            <div className="login-icon-box">
              <ShieldCheck size={38} />
            </div>

            <h1>Smart K3 Vision</h1>
            <p>
              Sistem Monitoring K3 Smart-Factory berbasis Computer Vision untuk
              meningkatkan standar keselamatan dan disiplin kerja di PT.
              Indonesia Epson Industry.
            </p>

            <div className="login-feature-row">
              <div className="login-feature">
                <strong>Computer Vision</strong>
                <span>Real-time Detection</span>
              </div>

              <div className="login-feature">
                <strong>Insight & Analytics</strong>
                <span>Data-driven Decisions</span>
              </div>

              <div className="login-feature">
                <strong>Safety & Compliance</strong>
                <span>Standar K3 Terjaga</span>
              </div>
            </div>
          </div>
        </div>

        <div className="login-right">
          <div className="login-form-card">
            <div className="login-logo-wrap">
              <div className="login-logo-icon">
                <ShieldCheck size={58} />
              </div>

              <h2>Smart K3 Vision</h2>
              <p>
                <p>
                  Akses dashboard monitoring K3 untuk memantau kepatuhan APD dan laporan pelanggaran secara realtime.
                </p>
              </p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <label>
                Username
                <div className="login-input">
                  <User size={22} />
                  <input
                    type="text"
                    value={username}
                    placeholder="Masukkan username"
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </label>

              <label>
                Password
                <div className="login-input">
                  <Lock size={22} />
                  <input
                    type="password"
                    value={password}
                    placeholder="Masukkan password"
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </label>

              {error && <div className="login-error">{error}</div>}

              <button type="submit" className="login-main-btn" disabled={loading}>
                <LogIn size={24} />
                {loading ? 'LOGIN...' : 'LOGIN'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  )
}