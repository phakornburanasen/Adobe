import { useEffect, useState } from 'react'
import { API_BASE } from './config.js'
import Login from './components/Login.jsx'
import Homepage from './components/Homepage.jsx'
import Dashboard from './components/Dashboard.jsx'
import Settings from './components/Settings.jsx'
import Reports from './components/Reports.jsx'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [hydrated, setHydrated] = useState(false)
  const [path, setPath] = useState(() => window.location.pathname)
  const [hash, setHash] = useState(() => window.location.hash)

  const BASE = '/ADOBE'
  const LOGIN = `${BASE}/login`

  const navigate = (to) => {
    // Normalize base path to include trailing slash
    if (to === '/ADOBE') to = '/ADOBE/'
    if (window.location.pathname !== to) {
      window.history.pushState({}, '', to)
      setPath(to)
    } else {
      setPath(to)
    }
  }

  // Navigate to BASE with a specific section via hash
  const navigateHash = (section) => {
    const BASE_ROOT = '/ADOBE/'
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

  // Initial route normalization
  useEffect(() => {
    if (!hydrated) return
    const p = window.location.pathname
    if (!isLoggedIn) {
      if (p !== LOGIN) navigate(LOGIN)
      return
    }
    // Redirect legacy path routes to hash routes under '/ADOBE/'
    const legacyToHash = new Map([
      [`${BASE}/Dashboard`, '#Dashboard'],
      [`${BASE}/Licenses`,  '#Licenses'],
      [`${BASE}/Reports`,   '#Reports'],
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
    const allowedHashes = new Set(['#Dashboard', '#Licenses', '#Reports', '#Settings'])
    if (allowedHashes.has(h)) {
      // Stay where we are; rendering below will choose by hash
      return
    }
    // Default to Dashboard via BASE + hash
    const BASE_ROOT = '/ADOBE/'
    if (p !== BASE_ROOT || window.location.hash !== '#Dashboard') {
      window.history.replaceState({}, '', BASE_ROOT)
      window.location.hash = '#Dashboard'
      setPath(BASE_ROOT)
      setHash('#Dashboard')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, hydrated])

  const handleLogin = async (credentials) => {
    // Call backend API
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data?.error || 'เข้าสู่ระบบไม่สำเร็จ')
    }

    // Set user data from backend
    const newUser = {
      username: data.username,
      display: data.display,
      role: data.role,
      remember: credentials.remember,
    }
    setUser(newUser)
    try { localStorage.setItem('o365_user', JSON.stringify(newUser)) } catch {}

    setIsLoggedIn(true)
    // Navigate to Dashboard using hash routing (BASE with trailing slash)
    window.history.pushState({}, '', '/ADOBE/')
    setPath('/ADOBE/')
    window.location.hash = '#Dashboard'
    setHash('#Dashboard')
  }

  const handleLogout = async () => {
    try {
      if (user?.username) {
        await fetch(`${API_BASE}/api/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user.username }),
        })
      }
    } catch {}
    try { localStorage.removeItem('o365_user') } catch {}
    setUser(null)
    setIsLoggedIn(false)
    navigate(LOGIN)
  }

  // Render by current route
  if (!hydrated) {
    return null
  }
  if (path === LOGIN || !isLoggedIn) {
    return <Login onSubmit={handleLogin} />
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
  }

  // Fallback: redirect based on auth state
  if (isLoggedIn) {
    // Go to BASE + #Dashboard by default (with trailing slash)
    window.history.replaceState({}, '', '/ADOBE/')
    setPath('/ADOBE/')
    if (window.location.hash !== '#Dashboard') {
      window.location.hash = '#Dashboard'
      setHash('#Dashboard')
    }
    return null
  } else {
    navigate(LOGIN)
    return null
  }
}

export default App
