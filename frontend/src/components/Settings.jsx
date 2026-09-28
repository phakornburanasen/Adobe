import { useEffect, useMemo, useRef, useState } from 'react'
import SideBar from './SideBar.jsx'
import { API_BASE } from '../config.js'
import adobeLogo from '../assets/adobe-logo.png';
import './Homepage.css'

export default function Settings({ navigate, user, onLogout }) {
  const [activeTab, setActiveTab] = useState('users') // users | departments | license_types | costcenters
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      const saved = localStorage.getItem('o365_sidebar_collapsed')
      if (saved != null) return saved === 'true'
    } catch {}
    return window.innerWidth <= 1024
  })
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => { document.title = 'Adobe Licenses' }, [])
  // Handle responsive behavior: auto-collapse on small screens; do not auto-expand on large screens
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth <= 1024) setSidebarCollapsed(true)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  // Persist sidebar preference
  useEffect(() => {
    try { localStorage.setItem('o365_sidebar_collapsed', sidebarCollapsed ? 'true' : 'false') } catch {}
  }, [sidebarCollapsed])
  // Ensure Settings shows #Settings in URL by default
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        if (window.location.hash !== '#Settings') {
          window.location.hash = '#Settings'
        }
      }
    } catch {}
  }, [])
  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 60000); return () => clearInterval(t) }, [])
  const formatTime = (d) => d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (d) => d.toLocaleDateString('th-TH', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })

  // Simple in-memory state placeholders (wire to API later)
  const [search, setSearch] = useState('')
  const searchRef = useRef(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Toast notification
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' })
  const showToast = (message, type = 'success') => {
    setToast({ show: true, type, message })
    window.clearTimeout(showToast._t)
    showToast._t = window.setTimeout(() => setToast((s) => ({ ...s, show: false })), 2500)
  }
  // Confirm dialog
  const [confirmState, setConfirmState] = useState({ open: false, title: '', message: '', onConfirm: null, submitting: false })
  const openConfirm = (title, message, onConfirm) => setConfirmState({ open: true, title, message, onConfirm, submitting: false })
  const closeConfirm = () => setConfirmState((s) => ({ ...s, open: false }))
  // Departments modal state
  const [showDeptForm, setShowDeptForm] = useState(false)
  const [deptSubmitting, setDeptSubmitting] = useState(false)
  const [editingDept, setEditingDept] = useState(null) // null = create, object = edit
  const [deptForm, setDeptForm] = useState({ depart_id: '', depart_name: '' })
  // Users modal state
  const [showUserForm, setShowUserForm] = useState(false)
  const [userSubmitting, setUserSubmitting] = useState(false)
  const [editingUser, setEditingUser] = useState(null) // null = create, object = edit
  const [userForm, setUserForm] = useState({ username: '', password: '', display: '', role: 'viewer' })
  const [showPassword, setShowPassword] = useState(false)
  // License Types modal state
  const [showLTForm, setShowLTForm] = useState(false)
  const [ltSubmitting, setLTSubmitting] = useState(false)
  const [editingLT, setEditingLT] = useState(null) // null=create
  const [ltForm, setLTForm] = useState({ license_id: '', license_name: '' })
  // Cost Centers modal state
  const [showCCForm, setShowCCForm] = useState(false)
  const [ccSubmitting, setCCSubmitting] = useState(false)
  const [editingCC, setEditingCC] = useState(null)
  const [ccForm, setCCForm] = useState({ cost_id: '', cost_name: '' })

  // Minimal fetch mockup by tab
  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        // API endpoints proposal (to implement in backend):
        // users_login, departments, license_type, costcenter
        const map = {
          users: 'users_login',
          departments: 'departments',
          license_types: 'license_types',
          costcenters: 'costcenters'
        }
        const path = map[activeTab]
        const url = `${API_BASE}/api/${path}?page=1&pageSize=100&search=${encodeURIComponent(search)}`
        const res = await fetch(url, { signal: controller.signal })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'ดึงข้อมูลไม่สำเร็จ')
        setItems(Array.isArray(data.items) ? data.items : [])
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล')
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [activeTab, search])

  const tabTitle = useMemo(() => {
    switch (activeTab) {
      case 'users': return 'Users'
      case 'departments': return 'Departments'
      case 'license_types': return 'License Types'
      case 'costcenters': return 'Cost Centers'
      default: return 'Settings'
    }
  }, [activeTab])

  return (
    <>
      {/* Top Navbar */}
      <header className="header">
        <div className="header-content">
          <div className="brand-section">
            <button
              className="sidebar-toggle"
              aria-label={sidebarCollapsed ? 'ขยายแถบเมนู' : 'ยุบแถบเมนู'}
              title={sidebarCollapsed ? 'ขยายแถบเมนู' : 'ยุบแถบเมนู'}
              onClick={() => setSidebarCollapsed((v) => !v)}
            >
              <span aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" fill="currentColor"/>
                </svg>
              </span>
            </button>
            <div className="logo" aria-label="Adobe">
              <img 
                src={adobeLogo}
                alt="Adobe Logo" 
                width="60" 
                height="60"
                style={{ display: 'block' }}
              />
            </div>
            <h1>Adobe Creative Cloud</h1>
          </div>
          <div className="user-section">
            <div className="time-info">
              <div className="time">{formatTime(currentTime)}</div>
              <div className="date">{formatDate(currentTime)}</div>
            </div>
            <div className="user-info">
              <div className="user-avatar">{(user?.display || user?.username || 'U').charAt(0)}</div>
              <div className="user-details">
                <div className="user-row">
                  <div className="username">{user?.display || user?.username || 'ผู้ใช้'}</div>
                  <button
                    className="logout-btn power"
                    onClick={onLogout}
                    aria-label="ออกจากระบบ"
                    title="ออกจากระบบ"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13 3h-2v10h2V3z" fill="currentColor"/>
                      <path d="M17.83 5.17l-1.41 1.41A7 7 0 1112 19a7 7 0 01-4.41-12.42L6.17 5.17A9 9 0 1021 12a8.96 8.96 0 00-3.17-6.83z" fill="currentColor"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className={`layout ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <SideBar
          active="settings"
          collapsed={sidebarCollapsed}
          onNavigate={(key) => {
            if (typeof navigate === 'function') {
              if (key === 'dashboard') { navigate('/ADOBE/'); try { window.location.hash = '#Dashboard' } catch {} }
              if (key === 'licenses')  { navigate('/ADOBE/'); try { window.location.hash = '#Licenses' }  catch {} }
              if (key === 'reports')   { navigate('/ADOBE/'); try { window.location.hash = '#Reports' }   catch {} }
              if (key === 'settings')  { navigate('/ADOBE/'); try { window.location.hash = '#Settings' }  catch {} }
            }
          }}
        />
        <main className="main-content fade-in" style={{ paddingTop: '0.5rem' }}>
          <header className="content-header" style={{ marginTop: 0, paddingBottom: '0.5rem', borderBottom: '1px solid var(--border, #e5e7eb)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span aria-hidden style={{ display: 'inline-flex', width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#0b5cab,#2563EB)', color: 'white', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 00.12-.64l-1.92-3.32a.5.5 0 00-.6-.22l-2.39.96a7.07 7.07 0 00-1.63-.94l-.36-2.54A.5.5 0 0014.3 1h-4.6a.5.5 0 00-.49.42l-.36 2.54c-.58.22-1.12.52-1.63.94l-2.39-.96a.5.5 0 00-.6.22L2.32 7.08a.5.5 0 00.12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 00-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.42 1.05.75 1.63.98l.36 2.52c.05.25.26.42.49.42h4.6c.24 0 .45-.17.49-.42l.36-2.52c.58-.23 1.12-.56 1.63-.98l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 00-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1115.5 12 3.5 3.5 0 0112 15.5z" fill="currentColor"/></svg>
                </span>
                <div>
                  <h1 style={{ margin: 0, lineHeight: 1.2 }}>Settings</h1>
                  <div style={{ color: 'var(--muted, #6b7280)', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span>ปรับแต่งระบบและข้อมูลอ้างอิง</span>
                    <span>•</span>
                    <span>{formatDate(currentTime)}</span>
                    <span className="badge" style={{ background: '#EEF2FF', color: '#4F46E5', padding: '2px 8px', borderRadius: 999 }}>{formatTime(currentTime)}</span>
                  </div>
                </div>
              </div>
              <div className="header-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className="badge" style={{ background: '#F3F4F6', color: '#111827', padding: '6px 10px', borderRadius: 8 }} title="จำนวนรายการที่แสดง">
                  {items.length} items
                </span>
              </div>
            </div>
          </header>

          {/* Tabs */}
          <section className="panel settings-controls" style={{ marginTop: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {[
                { key: 'users', label: 'Users' },
                { key: 'departments', label: 'Departments' },
                { key: 'license_types', label: 'License Types' },
                { key: 'costcenters', label: 'Cost Centers' },
              ].map(t => (
                <button
                  key={t.key}
                  className={`btn small ${activeTab === t.key ? 'primary' : ''}`}
                  onClick={() => setActiveTab(t.key)}
                >{t.label}</button>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="search">
                  <span className="search-icon" aria-hidden>🔎</span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ค้นหา..."
                    ref={searchRef}
                  />
                  {!!search && (
                    <button
                      type="button"
                      className="btn small icon-round"
                      aria-label="ล้างคำค้นหา"
                      title="ล้างคำค้นหา"
                      onClick={() => { setSearch(''); setTimeout(() => searchRef.current && searchRef.current.focus(), 0) }}
                    >
                      <span className="btn-icon" aria-hidden>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.17 12l6.72-7.71 1.41 1.42z" fill="currentColor"/>
                          <path d="M5.71 5.71 12 12l-6.29 6.29 1.41 1.42L13.83 12 7.12 5.29 5.71 5.71z" fill="currentColor"/>
                        </svg>
                      </span>
                    </button>
                  )}
                </div>
                
                <button
                  className="btn small primary"
                  onClick={() => {
                    if (activeTab === 'departments') {
                      setEditingDept(null)
                      setDeptForm({ depart_id: '', depart_name: '' })
                      setShowDeptForm(true)
                    } else if (activeTab === 'license_types') {
                      setEditingLT(null)
                      setLTForm({ license_id: '', license_name: '' })
                      setShowLTForm(true)
                    } else if (activeTab === 'users') {
                      setEditingUser(null)
                      setUserForm({ username: '', password: '', display: '', role: 'viewer' })
                      setShowUserForm(true)
                    } else if (activeTab === 'costcenters') {
                      setEditingCC(null)
                      setCCForm({ cost_id: '', cost_name: '' })
                      setShowCCForm(true)
                    } else {
                      alert('เพิ่มใหม่สำหรับแท็บนี้จะถูกเปิดใช้งานภายหลัง')
                    }
                  }}
                >เพิ่มใหม่</button>
              </div>
            </div>
          </section>

          {/* Table placeholder */}
          <section className="panel license-table">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    {activeTab === 'users' && (<>
                      <th>Username</th>
                      <th>Display</th>
                      <th>Role</th>
                      <th style={{ width: 140 }}>Actions</th>
                    </>)}
                    {activeTab === 'departments' && (<>
                      <th>Department ID</th>
                      <th>Department Name</th>
                      <th style={{ width: 120 }}>Actions</th>
                    </>)}
                    {activeTab === 'license_types' && (<>
                      <th>License ID</th>
                      <th>License Name</th>
                      <th style={{ width: 120 }}>Actions</th>
                    </>)}
                    {activeTab === 'costcenters' && (<>
                      <th>Cost ID</th>
                      <th>Cost Name</th>
                      <th style={{ width: 120 }}>Actions</th>
                    </>)}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" className="empty">กำลังโหลด...</td></tr>
                  ) : error ? (
                    <tr><td colSpan="7" className="empty">{error}</td></tr>
                  ) : items.length === 0 ? (
                    <tr><td colSpan="7" className="empty">ไม่พบข้อมูล</td></tr>
                  ) : (
                    items.map((row, idx) => (
                      <tr key={row.id || idx}>
                        {activeTab === 'users' && (<>
                          <td>{row.username}</td>
                          <td>{row.display ?? row.display_name}</td>
                          <td>{row.role}</td>
                          <td>
                            <div className="action-buttons">
                              <button className="btn small icon-round" title="แก้ไขผู้ใช้" aria-label="แก้ไขผู้ใช้" onClick={() => {
                                setEditingUser(row)
                                setUserForm({ username: row.username || '', password: '', display: row.display ?? row.display_name ?? '', role: row.role || 'viewer' })
                                setShowUserForm(true)
                              }}>
                                <span className="btn-icon" aria-hidden>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/><path d="M20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
                                </span>
                              </button>
                              <button className="btn small icon-round danger" title="ลบผู้ใช้" aria-label="ลบผู้ใช้" onClick={() => {
                                if (!row?.username) return
                                openConfirm('ยืนยันการลบ', `ต้องการลบผู้ใช้ \"${row.username}\" ใช่หรือไม่?`, async () => {
                                  try {
                                    setConfirmState((s) => ({ ...s, submitting: true }))
                                    const res = await fetch(`${API_BASE}/api/users_login/${encodeURIComponent(row.username)}`, { method: 'DELETE' })
                                    const data = await res.json().catch(()=>({}))
                                    if (!res.ok) throw new Error(data?.error || 'ลบไม่สำเร็จ')
                                    setItems(items.filter(it => it.username !== row.username))
                                    showToast('ลบข้อมูลเรียบร้อย', 'success')
                                    closeConfirm()
                                  } catch (e) {
                                    alert(e.message || 'เกิดข้อผิดพลาดในการลบ')
                                  } finally {
                                    setConfirmState((s) => ({ ...s, submitting: false }))
                                  }
                                })
                              }}>
                                <span className="btn-icon" aria-hidden>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 7h12v2H6V7zm1 4h10l-1 9H8l-1-9zM9 4h6l1 2H8l1-2z" fill="currentColor"/></svg>
                                </span>
                              </button>
                            </div>
                          </td>
                        </>)}
                        {activeTab === 'departments' && (<>
                          <td>{row.depart_id}</td>
                          <td>{row.depart_name}</td>
                          <td>
                            <div className="action-buttons">
                              <button className="btn small icon-round" title="แก้ไขแผนก" aria-label="แก้ไขแผนก" onClick={() => {
                                setEditingDept(row)
                                setDeptForm({ depart_id: row.depart_id || '', depart_name: row.depart_name || '' })
                                setShowDeptForm(true)
                              }}>
                                <span className="btn-icon" aria-hidden>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/><path d="M20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
                                </span>
                              </button>
                              <button className="btn small icon-round danger" title="ลบแผนก" aria-label="ลบแผนก" onClick={() => {
                                if (!row?.depart_id) return
                                const name = row.depart_name || row.depart_id
                                openConfirm('ยืนยันการลบ', `ต้องการลบแผนก \"${name}\" ใช่หรือไม่?`, async () => {
                                  try {
                                    setConfirmState((s) => ({ ...s, submitting: true }))
                                    const res = await fetch(`${API_BASE}/api/departments/${encodeURIComponent(row.depart_id)}`, { method: 'DELETE' })
                                    const data = await res.json().catch(()=>({}))
                                    if (!res.ok) throw new Error(data?.error || 'ลบไม่สำเร็จ')
                                    setItems(items.filter(it => it.depart_id !== row.depart_id))
                                    showToast('ลบข้อมูลเรียบร้อย', 'success')
                                    closeConfirm()
                                  } catch (e) {
                                    alert(e.message || 'เกิดข้อผิดพลาดในการลบ')
                                  } finally {
                                    setConfirmState((s) => ({ ...s, submitting: false }))
                                  }
                                })
                              }}>
                                <span className="btn-icon" aria-hidden>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 7h12v2H6V7zm1 4h10l-1 9H8l-1-9zM9 4h6l1 2H8l1-2z" fill="currentColor"/></svg>
                                </span>
                              </button>
                            </div>
                          </td>
                        </>)}
                        {activeTab === 'license_types' && (<>
                          <td>{row.license_id}</td>
                          <td>{row.license_name}</td>
                          <td>
                            <div className="action-buttons">
                              <button className="btn small icon-round" title="แก้ไขประเภทไลเซนส์" aria-label="แก้ไขประเภทไลเซนส์" onClick={() => {
                                setEditingLT(row)
                                setLTForm({ license_id: row.license_id || '', license_name: row.license_name || '' })
                                setShowLTForm(true)
                              }}>
                                <span className="btn-icon" aria-hidden>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/><path d="M20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
                                </span>
                              </button>
                              <button className="btn small icon-round danger" title="ลบประเภทไลเซนส์" aria-label="ลบประเภทไลเซนส์" onClick={() => {
                                if (!row?.license_id) return
                                const name = row.license_name || row.license_id
                                openConfirm('ยืนยันการลบ', `ต้องการลบประเภทไลเซนส์ \"${name}\" ใช่หรือไม่?`, async () => {
                                  try {
                                    setConfirmState((s) => ({ ...s, submitting: true }))
                                    const res = await fetch(`${API_BASE}/api/license_types/${encodeURIComponent(row.license_id)}`, { method: 'DELETE' })
                                    const data = await res.json().catch(()=>({}))
                                    if (!res.ok) throw new Error(data?.error || 'ลบไม่สำเร็จ')
                                    setItems(items.filter(it => it.license_id !== row.license_id))
                                    showToast('ลบข้อมูลเรียบร้อย', 'success')
                                    closeConfirm()
                                  } catch (e) {
                                    alert(e.message || 'เกิดข้อผิดพลาดในการลบ')
                                  } finally {
                                    setConfirmState((s) => ({ ...s, submitting: false }))
                                  }
                                })
                              }}>
                                <span className="btn-icon" aria-hidden>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 7h12v2H6V7zm1 4h10l-1 9H8l-1-9zM9 4h6l1 2H8l1-2z" fill="currentColor"/></svg>
                                </span>
                              </button>
                            </div>
                          </td>
                        </>)}
                        {activeTab === 'costcenters' && (<>
                          <td>{row.cost_id}</td>
                          <td>{row.cost_name}</td>
                          <td>
                            <div className="action-buttons">
                              <button className="btn small icon-round" title="แก้ไข Cost Center" aria-label="แก้ไข Cost Center" onClick={() => {
                                setEditingCC(row)
                                setCCForm({ cost_id: row.cost_id || '', cost_name: row.cost_name || '' })
                                setShowCCForm(true)
                              }}>
                                <span className="btn-icon" aria-hidden>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/><path d="M20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
                                </span>
                              </button>
                              <button className="btn small icon-round danger" title="ลบ Cost Center" aria-label="ลบ Cost Center" onClick={() => {
                                if (!row?.cost_id) return
                                const name = row.cost_name || row.cost_id
                                openConfirm('ยืนยันการลบ', `ต้องการลบ Cost Center \"${name}\" ใช่หรือไม่?`, async () => {
                                  try {
                                    setConfirmState((s) => ({ ...s, submitting: true }))
                                    const res = await fetch(`${API_BASE}/api/costcenters/${encodeURIComponent(row.cost_id)}`, { method: 'DELETE' })
                                    const data = await res.json().catch(()=>({}))
                                    if (!res.ok) throw new Error(data?.error || 'ลบไม่สำเร็จ')
                                    setItems(items.filter(it => it.cost_id !== row.cost_id))
                                    showToast('ลบข้อมูลเรียบร้อย', 'success')
                                    closeConfirm()
                                  } catch (e) {
                                    alert(e.message || 'เกิดข้อผิดพลาดในการลบ')
                                  } finally {
                                    setConfirmState((s) => ({ ...s, submitting: false }))
                                  }
                                })
                              }}>
                                <span className="btn-icon" aria-hidden>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 7h12v2H6V7zm1 4h10l-1 9H8l-1-9zM9 4h6l1 2H8l1-2z" fill="currentColor"/></svg>
                                </span>
                              </button>
                            </div>
                          </td>
                        </>)}
                      </tr>
                    ))
                  )}

      {/* License Types: Add/Edit Modal */}
      {showLTForm && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="lt-modal-title">
          <div className="modal">
            <div className="modal-header">
              <h3 id="lt-modal-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 3H5c-1.1 0-2 .9-2 2v12a4 4 0 004 4h12c1.1 0 2-.9 2-2V5a2 2 0 00-2-2zm0 14H7a2 2 0 01-2-2V5h14v12z" fill="#0b5cab"/></svg>
                </span>
                {editingLT ? 'แก้ไขประเภทไลเซนส์' : 'เพิ่มประเภทไลเซนส์'}
              </h3>
              <button className="logout-btn power" onClick={() => setShowLTForm(false)} aria-label="ปิด" title="ปิด">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 3h-2v10h2V3z" fill="currentColor"/><path d="M17.83 5.17l-1.41 1.41A7 7 0 1112 19a7 7 0 01-4.41-12.42L6.17 5.17A9 9 0 1021 12a8.96 8.96 0 00-3.17-6.83z" fill="currentColor"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <label>
                  <span>License ID (license_id)</span>
                  <div className="input-with-icon" style={{ position: 'relative' }}>
                    <span className="prefix-icon">🔑</span>
                    <input
                      value={ltForm.license_id}
                      onChange={(e)=> setLTForm(s => ({ ...s, license_id: e.target.value }))}
                      placeholder="เช่น AO00..."
                      disabled={!!editingLT}
                    />
                  </div>
                </label>
                <label>
                  <span>License Name (license_name)</span>
                  <div className="input-with-icon">
                    <span className="prefix-icon">🏷️</span>
                    <input
                      value={ltForm.license_name}
                      onChange={(e)=> setLTForm(s => ({ ...s, license_name: e.target.value }))}
                      placeholder="เช่น Adobe..."
                    />
                  </div>
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowLTForm(false)} title="ยกเลิก">
                <span className="btn-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 11H7.83l5.58-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>
                </span>
                ยกเลิก
              </button>
              <button
                className="btn primary"
                disabled={ltSubmitting}
                onClick={async () => {
                  const id = (ltForm.license_id || '').trim()
                  const name = (ltForm.license_name || '').trim()
                  if (!id) { alert('กรุณากรอก License ID'); return }
                  if (!name) { alert('กรุณากรอก License Name'); return }
                  try {
                    setLTSubmitting(true)
                    if (editingLT) {
                      const res = await fetch(`${API_BASE}/api/license_types/${encodeURIComponent(id)}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ license_name: name })
                      })
                      const data = await res.json().catch(()=>({}))
                      if (!res.ok) throw new Error(data?.error || 'อัปเดตไม่สำเร็จ')
                      setItems(prev => prev.map(it => it.license_id === id ? { ...it, license_name: name } : it))
                      showToast('บันทึกข้อมูลเรียบร้อย', 'success')
                    } else {
                      const res = await fetch(`${API_BASE}/api/license_types`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ license_id: id, license_name: name })
                      })
                      const data = await res.json().catch(()=>({}))
                      if (!res.ok) throw new Error(data?.error || 'บันทึกไม่สำเร็จ')
                      const created = data?.item || { license_id: id, license_name: name }
                      setItems(prev => [created, ...prev])
                      showToast('บันทึกข้อมูลเรียบร้อย', 'success')
                    }
                    setShowLTForm(false)
                    setEditingLT(null)
                  } catch (e) {
                    alert(e.message || 'เกิดข้อผิดพลาดในการบันทึก')
                  } finally {
                    setLTSubmitting(false)
                  }
                }}
              >
                <span className="btn-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#ffffff"/></svg>
                </span>
                {ltSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cost Centers: Add/Edit Modal */}
      {showCCForm && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="cc-modal-title">
          <div className="modal">
            <div className="modal-header">
              <h3 id="cc-modal-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3h18v2H3V3zm2 4h14v14H5V7zm4 3v8h2v-8H9zm4 4v4h2v-4h-2z" fill="#0b5cab"/></svg>
                </span>
                {editingCC ? 'แก้ไข Cost Center' : 'เพิ่ม Cost Center'}
              </h3>
              <button className="logout-btn power" onClick={() => setShowCCForm(false)} aria-label="ปิด" title="ปิด">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 3h-2v10h2V3z" fill="currentColor"/><path d="M17.83 5.17l-1.41 1.41A7 7 0 1112 19a7 7 0 01-4.41-12.42L6.17 5.17A9 9 0 1021 12a8.96 8.96 0 00-3.17-6.83z" fill="currentColor"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <label>
                  <span>Cost ID (cost_id)</span>
                  <div className="input-with-icon">
                    <span className="prefix-icon">#</span>
                    <input
                      value={ccForm.cost_id}
                      onChange={(e)=> setCCForm(s => ({ ...s, cost_id: e.target.value }))}
                      placeholder="ใส่ cost center ตามจริง..."
                      disabled={!!editingCC}
                    />
                  </div>
                </label>
                <label>
                  <span>Cost Name (cost_name)</span>
                  <div className="input-with-icon">
                    <span className="prefix-icon">🏷️</span>
                    <input
                      value={ccForm.cost_name}
                      onChange={(e)=> setCCForm(s => ({ ...s, cost_name: e.target.value }))}
                      placeholder="ใส่ชื่อ cost ตามจริง..."
                    />
                  </div>
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowCCForm(false)} title="ยกเลิก">
                <span className="btn-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 11H7.83l5.58-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>
                </span>
                ยกเลิก
              </button>
              <button
                className="btn primary"
                disabled={ccSubmitting}
                onClick={async () => {
                  const id = (ccForm.cost_id || '').trim()
                  const name = (ccForm.cost_name || '').trim()
                  if (!id) { alert('กรุณากรอก Cost ID'); return }
                  if (!name) { alert('กรุณากรอก Cost Name'); return }
                  try {
                    setCCSubmitting(true)
                    if (editingCC) {
                      const res = await fetch(`${API_BASE}/api/costcenters/${encodeURIComponent(id)}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cost_name: name })
                      })
                      const data = await res.json().catch(()=>({}))
                      if (!res.ok) throw new Error(data?.error || 'อัปเดตไม่สำเร็จ')
                      setItems(prev => prev.map(it => it.cost_id === id ? { ...it, cost_name: name } : it))
                      showToast('บันทึกข้อมูลเรียบร้อย', 'success')
                    } else {
                      const res = await fetch(`${API_BASE}/api/costcenters`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cost_id: id, cost_name: name })
                      })
                      const data = await res.json().catch(()=>({}))
                      if (!res.ok) throw new Error(data?.error || 'บันทึกไม่สำเร็จ')
                      const created = data?.item || { cost_id: id, cost_name: name }
                      setItems(prev => [created, ...prev])
                      showToast('บันทึกข้อมูลเรียบร้อย', 'success')
                    }
                    setShowCCForm(false)
                    setEditingCC(null)
                  } catch (e) {
                    alert(e.message || 'เกิดข้อผิดพลาดในการบันทึก')
                  } finally {
                    setCCSubmitting(false)
                  }
                }}
              >
                <span className="btn-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#ffffff"/></svg>
                </span>
                {ccSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users: Add/Edit Modal */}
      {showUserForm && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
          <div className="modal">
            <div className="modal-header">
              <h3 id="user-modal-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#0b5cab"/></svg>
                </span>
                {editingUser ? 'แก้ไข User Login' : 'เพิ่ม User Login'}
              </h3>
              <button className="logout-btn power" onClick={() => setShowUserForm(false)} aria-label="ปิด" title="ปิด">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 3h-2v10h2V3z" fill="currentColor"/><path d="M17.83 5.17l-1.41 1.41A7 7 0 1112 19a7 7 0 01-4.41-12.42L6.17 5.17A9 9 0 1021 12a8.96 8.96 0 00-3.17-6.83z" fill="currentColor"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <label>
                  <span>Username</span>
                  <div className="input-with-icon">
                    <span className="prefix-icon">👤</span>
                    <input
                      value={userForm.username}
                      onChange={(e)=> setUserForm(s => ({ ...s, username: e.target.value }))}
                      placeholder="ใส่รหัสพนักงาน T9XXX"
                      disabled={!!editingUser}
                    />
                  </div>
                </label>
                <label>
                  <span>Password{editingUser ? ' (ว่างได้ถ้าไม่ต้องการเปลี่ยน)' : ''}</span>
                  <div className="input-with-icon" style={{ position: 'relative' }}>
                    <span className="prefix-icon">🔒</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={userForm.password}
                      onChange={(e)=> setUserForm(s => ({ ...s, password: e.target.value }))}
                      placeholder={editingUser ? 'เว้นว่างหากไม่เปลี่ยนรหัสผ่าน' : 'อย่างน้อย 6 ตัวอักษร'}
                      style={{ paddingRight: '28px' }}
                    />
                    <button
                      type="button"
                      className="reveal-btn"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                      title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                      aria-pressed={showPassword}
                      style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      <span className="btn-icon" aria-hidden>
                        {showPassword ? (
                          // eye-off
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2 12s3.5-7 10-7c2.05 0 3.8.58 5.23 1.47" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M22 12s-3.5 7-10 7c-2.05 0-3.8-.58-5.23-1.47" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" fill="currentColor"/>
                            <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                          </svg>
                        ) : (
                          // eye-open
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="12" cy="12" r="3" fill="currentColor"/>
                          </svg>
                        )}
                      </span>
                    </button>
                  </div>
                </label>
                <label>
                  <span>Display</span>
                  <div className="input-with-icon">
                    <span className="prefix-icon">🏷️</span>
                    <input
                      value={userForm.display}
                      onChange={(e)=> setUserForm(s => ({ ...s, display: e.target.value }))}
                      placeholder="ชื่อที่แสดง"
                    />
                  </div>
                </label>
                <label>
                  <span>Role</span>
                  <select className="select" value={userForm.role} onChange={(e)=> setUserForm(s => ({ ...s, role: e.target.value }))}>
                    {['admin','manager','viewer'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowUserForm(false)} title="ยกเลิก">
                <span className="btn-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 11H7.83l5.58-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>
                </span>
                ยกเลิก
              </button>
              <button
                className="btn primary"
                disabled={userSubmitting}
                onClick={async () => {
                  // Basic validation
                  const username = (userForm.username || '').trim()
                  const display = (userForm.display || '').trim()
                  const role = (userForm.role || 'viewer').trim()
                  if (!username) { alert('กรุณากรอก Username'); return }
                  if (!editingUser && (!userForm.password || userForm.password.length < 6)) { alert('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return }
                  try {
                    setUserSubmitting(true)
                    if (editingUser) {
                      // Update
                      const body = { display, role }
                      if (userForm.password) body.password = userForm.password
                      const res = await fetch(`${API_BASE}/api/users_login/${encodeURIComponent(username)}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                      })
                      const data = await res.json().catch(()=>({}))
                      if (!res.ok) throw new Error(data?.error || 'อัปเดตไม่สำเร็จ')
                      setItems(prev => prev.map(it => it.username === username ? { ...it, display, role } : it))
                      showToast('บันทึกข้อมูลเรียบร้อย', 'success')
                    } else {
                      // Create
                      const res = await fetch(`${API_BASE}/api/users_login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password: userForm.password, display, role })
                      })
                      const data = await res.json().catch(()=>({}))
                      if (!res.ok) throw new Error(data?.error || 'บันทึกไม่สำเร็จ')
                      const created = data?.item || { username, display, role }
                      setItems(prev => [created, ...prev])
                      showToast('บันทึกข้อมูลเรียบร้อย', 'success')
                    }
                    setShowUserForm(false)
                    setEditingUser(null)
                  } catch (e) {
                    alert(e.message || 'เกิดข้อผิดพลาดในการบันทึก')
                  } finally {
                    setUserSubmitting(false)
                  }
                }}
              >
                <span className="btn-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#ffffff"/></svg>
                </span>
                {userSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
        {!sidebarCollapsed && (
          <div className="sidebar-backdrop" onClick={() => setSidebarCollapsed(true)} />
        )}
      </div>

      {/* Departments: Add/Edit Modal */}
      {showDeptForm && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="dept-modal-title">
          <div className="modal">
            <div className="modal-header">
              <h3 id="dept-modal-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" fill="#0b5cab"/></svg>
                </span>
                {editingDept ? 'แก้ไขแผนก' : 'เพิ่มแผนก'}
              </h3>
              <button className="logout-btn power" onClick={() => setShowDeptForm(false)} aria-label="ปิด" title="ปิด">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 3h-2v10h2V3z" fill="currentColor"/><path d="M17.83 5.17l-1.41 1.41A7 7 0 1112 19a7 7 0 01-4.41-12.42L6.17 5.17A9 9 0 1021 12a8.96 8.96 0 00-3.17-6.83z" fill="currentColor"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <label>
                  <span>Department ID (depart_id)</span>
                  <div className="input-with-icon">
                    <span className="prefix-icon">#</span>
                    <input
                      value={deptForm.depart_id}
                      onChange={(e)=> setDeptForm(s => ({ ...s, depart_id: e.target.value }))}
                      placeholder="ใส่รหัสแผนกหรือ cost center"
                      disabled={!!editingDept}
                    />
                  </div>
                </label>
                <label>
                  <span>Department Name (depart_name)</span>
                  <div className="input-with-icon">
                    <span className="prefix-icon">🏢</span>
                    <input
                      value={deptForm.depart_name}
                      onChange={(e)=> setDeptForm(s => ({ ...s, depart_name: e.target.value }))}
                      placeholder="เช่น Accounting"
                    />
                  </div>
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowDeptForm(false)} title="ยกเลิก">
                <span className="btn-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 11H7.83l5.58-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>
                </span>
                ยกเลิก
              </button>
              <button
                className="btn primary"
                disabled={deptSubmitting}
                onClick={async () => {
                  // Basic validation
                  const id = (deptForm.depart_id || '').trim()
                  const name = (deptForm.depart_name || '').trim()
                  if (!id) { alert('กรุณากรอก Department ID'); return }
                  if (!name) { alert('กรุณากรอก Department Name'); return }
                  try {
                    setDeptSubmitting(true)
                    if (editingDept) {
                      // Update
                      const res = await fetch(`${API_BASE}/api/departments/${encodeURIComponent(id)}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ depart_name: name })
                      })
                      const data = await res.json().catch(()=>({}))
                      if (!res.ok) throw new Error(data?.error || 'อัปเดตไม่สำเร็จ')
                      setItems(prev => prev.map(it => it.depart_id === id ? { ...it, depart_name: name } : it))
                      showToast('บันทึกข้อมูลเรียบร้อย', 'success')
                    } else {
                      // Create
                      const res = await fetch(`${API_BASE}/api/departments`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ depart_id: id, depart_name: name })
                      })
                      const data = await res.json().catch(()=>({}))
                      if (!res.ok) throw new Error(data?.error || 'บันทึกไม่สำเร็จ')
                      const created = data?.item || { depart_id: id, depart_name: name }
                      setItems(prev => [created, ...prev])
                      showToast('บันทึกข้อมูลเรียบร้อย', 'success')
                    }
                    setShowDeptForm(false)
                    setEditingDept(null)
                  } catch (e) {
                    alert(e.message || 'เกิดข้อผิดพลาดในการบันทึก')
                  } finally {
                    setDeptSubmitting(false)
                  }
                }}
              >
                <span className="btn-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#ffffff"/></svg>
                </span>
                {deptSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmState.open && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 id="confirm-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="#D13438"/></svg>
                </span>
                {confirmState.title || 'ยืนยันการทำรายการ'}
              </h3>
              <button className="logout-btn power" onClick={closeConfirm} aria-label="ปิด" title="ปิด">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 3h-2v10h2V3z" fill="currentColor"/><path d="M17.83 5.17l-1.41 1.41A7 7 0 1112 19a7 7 0 01-4.41-12.42L6.17 5.17A9 9 0 1021 12a8.96 8.96 0 00-3.17-6.83z" fill="currentColor"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0 }}>{confirmState.message || 'ต้องการดำเนินการต่อหรือไม่?'}</p>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={closeConfirm} disabled={confirmState.submitting} title="ยกเลิก">
                <span className="btn-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 11H7.83l5.58-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>
                </span>
                ยกเลิก
              </button>
              <button
                className="btn danger"
                onClick={() => confirmState.onConfirm && confirmState.onConfirm()}
                disabled={confirmState.submitting}
                title="ยืนยันการลบ"
              >
                <span className="btn-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 7h12v2H6V7zm1 4h10l-1 9H8l-1-9zM9 4h6l1 2H8l1-2z" fill="currentColor"/></svg>
                </span>
                {confirmState.submitting ? 'กำลังดำเนินการ...' : 'ยืนยันการลบ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div className={`toast ${toast.type}`}>{toast.message}</div>
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <p>&copy; 2025 TNLX.CO.TH. สงวนลิขสิทธิ์</p>
          <div className="footer-links">
            <a href="#" onClick={(e) => e.preventDefault()}>ความเป็นส่วนตัว</a>
            <a href="#" onClick={(e) => e.preventDefault()}>เงื่อนไขการใช้งาน</a>
            <a href="#" onClick={(e) => e.preventDefault()}>ช่วยเหลือ</a>
          </div>
        </div>
      </footer>
    </>
  )
}
