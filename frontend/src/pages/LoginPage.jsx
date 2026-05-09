import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera,
  Eye,
  Lock,
  LogIn,
  ShieldCheck,
  User,
  BarChart3
} from 'lucide-react'
import { login } from '../utils/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()

    const user = login(identifier, password)

    if (!user) {
      setError('Email/username atau password salah')
      return
    }

    navigate('/dashboard')
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
              Sistem Monitoring K3 Smart-Factory Berbasis Computer Vision untuk
              Meningkatkan Standar Keselamatan dan Disiplin Kerja di PT.
              Indonesia Epson Industry.
            </p>

            <div className="login-feature-row">
              <div className="login-feature">
                <Camera size={22} />
                <div>
                  <strong>Computer Vision</strong>
                  <span>Real-time Detection</span>
                </div>
              </div>

              <div className="login-feature">
                <BarChart3 size={22} />
                <div>
                  <strong>Insight & Analytics</strong>
                  <span>Data-driven Decisions</span>
                </div>
              </div>

              <div className="login-feature">
                <ShieldCheck size={22} />
                <div>
                  <strong>Safety & Compliance</strong>
                  <span>Standar K3 Terjaga</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="login-right">
          <div className="login-form-card">
            <div className="login-logo-wrap">
              <div className="login-logo-icon">
                <ShieldCheck size={56} />
              </div>
              <h2>Smart K3 Vision</h2>
              <p>
                Sistem Monitoring K3 Smart-Factory Berbasis Computer Vision untuk
                meningkatkan standar keselamatan dan disiplin kerja.
              </p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <label>
                Email / Username
                <div className="login-input">
                  <User size={22} />
                  <input
                    type="text"
                    value={identifier}
                    placeholder="Masukkan email atau username"
                    onChange={(e) => setIdentifier(e.target.value)}
                  />
                </div>
              </label>

              <label>
                Password
                <div className="login-input">
                  <Lock size={22} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    placeholder="Masukkan password"
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <Eye size={20} />
                  </button>
                </div>
              </label>

              <div className="login-forgot">
                <button type="button">Lupa Password?</button>
              </div>

              {error && <div className="login-error">{error}</div>}

              <button type="submit" className="login-main-btn">
                <LogIn size={24} />
                LOGIN
              </button>

              <div className="login-divider">
                <span />
                <p>atau masuk dengan</p>
                <span />
              </div>

              <button type="button" className="login-google-btn">
                <span className="google-icon">G</span>
                Masuk dengan Google
              </button>

              <p className="login-register-text">
                Belum punya akun? <button type="button">Buat akun baru</button>
              </p>
            </form>
          </div>
        </div>
      </section>
    </main>
  )
}