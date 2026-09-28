import { useState } from 'react'
import adobeLogo from '../assets/adobe-logo.png';
import './Login.css'

export default function Login({ onSubmit }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Simple client-side validation
    if (!username || !password) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน')
      return
    }

    setLoading(true)
    try {
      // Hook for parent or future API call
      if (onSubmit) {
        await onSubmit({ username, password, remember })
      } else {
        // Simulate login delay
        await new Promise((r) => setTimeout(r, 800))
        alert('ล็อกอินสำเร็จ (ตัวอย่าง)')
      }
    } catch (err) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card" data-loading={loading}>
        <div className="brand">
          <div className="logo" aria-label="Adobe">
            <img 
              src={adobeLogo}
              alt="Adobe Logo" 
              width="70" 
              height="70"
              style={{ display: 'block' }}
            />
          </div>
          <h1>Adobe Licenses</h1>
          <p className="subtitle">ยินดีต้อนรับ! กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ</p>
        </div>

        {error && <div className="alert">{error}</div>}

        <form onSubmit={handleSubmit} className="form">
          <div className="field">
            <label htmlFor="username">ชื่อผู้ใช้</label>
            <div className="input-wrap">
              <span className="prefix" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 12a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M4 20c0-3.3137 3.5817-6 8-6s8 2.6863 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </span>
              <input
                id="username"
                type="text"
                placeholder=" username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toUpperCase())}
                autoComplete="off"
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="password">รหัสผ่าน</label>
            <div className="input-wrap">
              <span className="prefix" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M8 10V8a4 4 0 118 0v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder=" ••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="suffix-btn"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? (
                  // Eye closed icon
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M10.58 10.58a3 3 0 104.24 4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M6.7 6.7C4.4 8.02 2.74 9.94 2 12c1.8 4.8 7 8 10 8 1.55 0 3.31-.53 4.98-1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M20.82 16.6C21.77 15.55 22.53 14.34 23 13c-1.8-4.8-7-8-10-8-1.1 0-2.29.22-3.45.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                ) : (
                  // Eye open icon
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path d="M2 12c1.8-4.8 7-8 10-8s8.2 3.2 10 8c-1.8 4.8-7 8-10 8s-8.2-3.2-10-8z" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button className="submit" type="submit" disabled={loading} aria-busy={loading}>
            {loading ? (
              <>
                <span className="btn-icon" aria-hidden>
                  <svg className="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </span>
                กำลังเข้าสู่ระบบ...
              </>
            ) : (
              <>
                <span className="btn-icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M8 10V8a4 4 0 1 1 8 0v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </span>
                เข้าสู่ระบบ
              </>
            )}
          </button>
        </form>

      </div>

      <div className="bg-blob blob1" />
      <div className="bg-blob blob2" />
    </div>
  )
}
