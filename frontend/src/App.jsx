import { useEffect, useState } from 'react'
import { API_BASE, AUTH_API_BASE } from './config.js'
import Login from './components/Login.jsx'
import Homepage from './components/Homepage.jsx'
import Dashboard from './components/Dashboard.jsx'
import Settings from './components/Settings.jsx'
import Reports from './components/Reports.jsx'
import ReportFileManager from './components/ReportFileManager.jsx'

const SYSTEM_CODE = 'ADOBE-Management'

function createSessionUser(data, remember) {
  return {
    username: data?.username || '',
    display: data?.displayName || data?.display || data?.username || '',
    role: data?.role || 'user',
    remember,
  }
}

function getActionParam() {
  try {
    return new URLSearchParams(window.location.search).get('action')?.trim() || ''
  } catch {
    return ''
  }
}

function isLoginHash(value) {
  return value === '#login'
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [hydrated, setHydrated] = useState(false)
  const [path, setPath] = useState(() => window.location.pathname)
  const [hash, setHash] = useState(() => window.location.hash)
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [lastAutoLoginAction, setLastAutoLoginAction] = useState('')

  const BASE = '/ADOBE'
  const BASE_ROOT = `${BASE}/`
  const LOGIN = '#login'

  const completeLogin = (data, remember) => {
    const newUser = createSessionUser(data, remember)
    setUser(newUser)
    try { localStorage.setItem('o365_user', JSON.stringify(newUser)) } catch {}

    setIsLoggedIn(true)
    setLoginError('')
    window.history.pushState({}, '', BASE_ROOT)
    setPath(BASE_ROOT)
    window.location.hash = '#Dashboard'
    setHash('#Dashboard')
  }

  const navigate = (to) => {
    // Normalize base path to include trailing slash
    if (to === BASE) to = BASE_ROOT
    if (window.location.pathname !== to) {
      window.history.pushState({}, '', to)
      setPath(to)
    } else {
      setPath(to)
    }
  }

  // Navigate to BASE with a specific section via hash
  const navigateHash = (section) => {
    if (window.location.pathname !== BASE_ROOT) {
      window.history.pushState({}, '', BASE_ROOT)
      setPath(BASE_ROOT)
    }
    const desired = `#${section}`
    if (window.location.hash !== desired) {
      window.location.hash = desired
    } else {
      setHash(desired)
    }
  }

  const navigateLogin = () => {
    if (window.location.pathname !== BASE_ROOT) {
      window.history.pushState({}, '', BASE_ROOT)
      setPath(BASE_ROOT)
    } else {
      setPath(BASE_ROOT)
    }
    if (!isLoginHash(window.location.hash)) {
      window.location.hash = LOGIN
    } else {
      setHash(LOGIN)
    }
  }

  // Sync UI with browser navigation (back/forward)
  useEffect(() => {
    const onPopState = () => {
      setPath(window.location.pathname)
      setHash(window.location.hash)
    }
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('popstate', onPopState)
    window.addEventListener('hashchange', onHashChange)
    return () => {
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])

  // Hydrate auth state from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem('o365_user')
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved && saved.username) {
          setUser(saved)
          setIsLoggedIn(true)
        }
      }
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated || isLoggedIn) return
    const action = getActionParam()
    const canAutoLoginFromPath = path === BASE_ROOT || path === BASE || path === `${BASE}/login`
    if (!canAutoLoginFromPath) return
    if (!action || lastAutoLoginAction === action) return

    setLastAutoLoginAction(action)
    setLoginError('')
    setLoginLoading(true)

    ;(async () => {
      try {
        const res = await fetch(`${AUTH_API_BASE}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            SystemCode: SYSTEM_CODE,
          }),
        })

        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.error || 'เข้าสู่ระบบไม่สำเร็จ')
        }

        completeLogin(data, true)
      } catch (err) {
        setLoginError(err?.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ')
      } finally {
        setLoginLoading(false)
      }
    })()
  }, [hydrated, isLoggedIn, lastAutoLoginAction, path])

  // Initial route normalization
  useEffect(() => {
    if (!hydrated) return
    const p = window.location.pathname
    const action = getActionParam()
    if (!isLoggedIn) {
      if (p === `${BASE}/login`) {
        navigateLogin()
        return
      }
      if (action) {
        if (p !== BASE_ROOT && p !== BASE) navigateLogin()
        return
      }
      if (p !== BASE_ROOT || !isLoginHash(window.location.hash || hash)) navigateLogin()
      return
    }
    // Redirect legacy path routes to hash routes under '/ADOBE/'
    const legacyToHash = new Map([
      [`${BASE}/Dashboard`, '#Dashboard'],
      [`${BASE}/Licenses`,  '#Licenses'],
      [`${BASE}/Reports`,   '#Reports'],
      [`${BASE}/PriceRenewHistory`, '#PriceRenewHistory'],
      [`${BASE}/RenewalSummary`, '#RenewalSummary'],
      [`${BASE}/Settings`,  '#Settings'],
    ])
    if (legacyToHash.has(p)) {
      const hashFrag = legacyToHash.get(p)
      window.history.replaceState({}, '', `${BASE}/`)
      window.location.hash = hashFrag
      setPath(`${BASE}/`)
      setHash(hashFrag)
      return
    }
    // If logged in: prefer hash-based routing
      const h = window.location.hash || hash
    const allowedHashes = new Set(['#Dashboard', '#Licenses', '#Reports', '#PriceRenewHistory', '#RenewalSummary', '#Settings'])
    if (allowedHashes.has(h)) {
      // Stay where we are; rendering below will choose by hash
      return
    }
    // Default to Dashboard via BASE + hash
    if (p !== BASE_ROOT || window.location.hash !== '#Dashboard') {
      window.history.replaceState({}, '', BASE_ROOT)
      window.location.hash = '#Dashboard'
      setPath(BASE_ROOT)
      setHash('#Dashboard')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, hydrated])

  const handleLogin = async (credentials) => {
    setLoginError('')
    setLoginLoading(true)

    try {
      const res = await fetch(`${AUTH_API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: credentials.username,
          SystemCode: SYSTEM_CODE,
          password: credentials.password,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'เข้าสู่ระบบไม่สำเร็จ')
      }

      completeLogin(data, credentials.remember)
    } catch (err) {
      setLoginError(err?.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ')
      throw err
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      if (user?.username) {
        await fetch(`${AUTH_API_BASE}/api/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user.username }),
        })
      }
    } catch {}
    try { localStorage.removeItem('o365_user') } catch {}
    setUser(null)
    setIsLoggedIn(false)
    setLoginError('')
    setLoginLoading(false)
    navigateLogin()
  }

  // Render by current route
  if (!hydrated) {
    return null
  }
  if ((!isLoggedIn && (isLoginHash(hash) || !!getActionParam())) || !isLoggedIn) {
    return <Login onSubmit={handleLogin} externalError={loginError} externalLoading={loginLoading} />
  }

  // Hash-based routing (preferred and only)
  if (isLoggedIn) {
    const currentHash = window.location.hash || hash
    if (currentHash === '#Licenses') {
      return <Homepage onLogout={handleLogout} user={user} navigate={navigate} />
    }
    if (currentHash === '#Dashboard') {
      return <Dashboard navigate={navigate} user={user} onLogout={handleLogout} />
    }
    if (currentHash === '#Settings') {
      return <Settings navigate={navigate} user={user} onLogout={handleLogout} />
    }
    if (currentHash === '#Reports') {
      return <Reports navigate={navigate} user={user} onLogout={handleLogout} />
    }
    if (currentHash === '#PriceRenewHistory') {
      return <ReportFileManager navigate={navigate} user={user} onLogout={handleLogout} reportKey="price-renew-history" activeMenu="priceRenewHistory" title="Price & Renew History" subtitle="จัดการประวัติราคาและไฟล์ต่ออายุ" hashKey="#PriceRenewHistory" includePriceType />
    }
    if (currentHash === '#RenewalSummary') {
      return <ReportFileManager navigate={navigate} user={user} onLogout={handleLogout} reportKey="renewal-summary" activeMenu="renewalSummary" title="Renewal Summary" subtitle="จัดการไฟล์สรุปการต่ออายุ" hashKey="#RenewalSummary" />
    }
  }

  // Fallback: redirect based on auth state
  if (isLoggedIn) {
    // Go to BASE + #Dashboard by default (with trailing slash)
    window.history.replaceState({}, '', BASE_ROOT)
    setPath(BASE_ROOT)
    if (window.location.hash !== '#Dashboard') {
      window.location.hash = '#Dashboard'
      setHash('#Dashboard')
    }
    return null
  } else {
    navigateLogin()
    return null
  }
}

export default App
