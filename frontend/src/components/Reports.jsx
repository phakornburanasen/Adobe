import { useEffect, useMemo, useRef, useState } from 'react'
import SideBar from './SideBar.jsx'
import { API_BASE } from '../config.js'
import adobeLogo from '../assets/adobe-logo.png'
import './Homepage.css'

export default function Reports({ navigate, user, onLogout }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      const saved = localStorage.getItem('o365_sidebar_collapsed')
      if (saved != null) return saved === 'true'
    } catch {}
    return window.innerWidth <= 1024
  })
  const [currentTime, setCurrentTime] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const searchRef = useRef(null)
  const [rows, setRows] = useState([])
  const [departments, setDepartments] = useState([])
  const [departId, setDepartId] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortBy, setSortBy] = useState('emp_id')
  const [sortDir, setSortDir] = useState('asc') // 'asc' | 'desc'
  const [groupByCost, setGroupByCost] = useState(true)

  useEffect(() => { document.title = 'Adobe Licenses' }, [])
  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 60000); return () => clearInterval(t) }, [])

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

  // Ensure Reports shows #Reports in URL by default
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        if (window.location.hash !== '#Reports') {
          window.location.hash = '#Reports'
        }
      }
    } catch {}
  }, [])

  const formatTime = (d) => d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (d) => d.toLocaleDateString('th-TH', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })

  // Load departments for filter
  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/departments?limit=2000`)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'ดึงข้อมูลแผนกไม่สำเร็จ')
        if (!ignore) setDepartments(Array.isArray(data.items) ? data.items : [])
      } catch {}
    })()
    return () => { ignore = true }
  }, [])

  // Load reports data from backend with optional department filter and search
  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const params = new URLSearchParams()
        params.set('limit', '10000')
        if (departId) params.set('depart_id', departId)
        if (search) params.set('q', search)
        const url = `${API_BASE}/api/reports/licenses?${params.toString()}`
        const res = await fetch(url, { signal: controller.signal })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || `ดึงข้อมูลไม่สำเร็จ (HTTP ${res.status})`)
        const items = Array.isArray(data.items) ? data.items : []
        setRows(items)
        setPage(1)
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล')
      } finally {
        setLoading(false)
      }
    }
    const timer = setTimeout(load, 300)
    return () => { clearTimeout(timer); controller.abort() }
  }, [departId, search])

  const nf = useMemo(() => new Intl.NumberFormat('th-TH'), [])

  // Sorting and pagination (client-side)
  const sortedRows = useMemo(() => {
    const arr = Array.isArray(rows) ? [...rows] : []
    const dir = sortDir === 'desc' ? -1 : 1
    const get = (r) => {
      const v = r?.[sortBy]
      return v == null ? '' : v
    }
    arr.sort((a, b) => {
      const va = get(a)
      const vb = get(b)
      // numeric-aware compare if both are numbers
      const na = typeof va === 'number'
      const nb = typeof vb === 'number'
      if (na && nb) return (va - vb) * dir
      return String(va).localeCompare(String(vb)) * dir
    })
    return arr
  }, [rows, sortBy, sortDir])

  // Grouping support: pre-sort by cost center and build counts
  const { groupedRows, groupCounts } = useMemo(() => {
    if (!groupByCost) return { groupedRows: null, groupCounts: null }
    const copy = [...sortedRows]
    copy.sort((a, b) => String(a.cost_center || '').localeCompare(String(b.cost_center || '')) || String(a.full_name||'').localeCompare(String(b.full_name||'')))
    const counts = new Map()
    for (const r of copy) {
      const key = r.cost_center || 'ไม่ระบุ'
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    return { groupedRows: copy, groupCounts: counts }
  }, [sortedRows, groupByCost])

  const baseRows = groupByCost && groupedRows ? groupedRows : sortedRows
  const total = baseRows.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const pagedRows = useMemo(() => {
    const start = (Math.max(1, page) - 1) * pageSize
    return baseRows.slice(start, start + pageSize)
  }, [baseRows, page, pageSize])

  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ col }) => (
    <span aria-hidden style={{ marginLeft: 6, opacity: sortBy === col ? 1 : 0.35 }}>
      {sortBy === col ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
    </span>
  )

  // Ensure SheetJS is available
  const ensureXLSX = async () => {
    if (window.XLSX) return
    await new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
      s.async = true
      s.onload = resolve
      s.onerror = reject
      document.body.appendChild(s)
    })
  }

  const exportExcel = () => {
  window.location.href =
    "http://10.0.32.71:8000/api/ReportAdobe/api/export/licenses";
};



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
          active="reports"
          collapsed={sidebarCollapsed}
          onNavigate={(key) => {
            if (typeof navigate === 'function') {
              if (key === 'dashboard') { navigate('/ADOBE'); try { window.location.hash = '#Dashboard' } catch {} }
              if (key === 'licenses')  { navigate('/ADOBE'); try { window.location.hash = '#Licenses' }  catch {} }
              if (key === 'reports')   { navigate('/ADOBE'); try { window.location.hash = '#Reports' }   catch {} }
              if (key === 'settings')  { navigate('/ADOBE'); try { window.location.hash = '#Settings' }  catch {} }
            }
          }}
        />

        <main className="main-content fade-in" style={{ paddingTop: '0.5rem' }}>
          <header className="content-header" style={{ marginTop: 0, paddingBottom: '0.5rem', borderBottom: '1px solid var(--border, #e5e7eb)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ margin: 0 }}>รายงานรายการไลเซนส์ (ตามแผนก)</h2>
                <div className="muted" style={{ fontSize: '0.85rem' }}>ดึงจากตาราง listLicense_Adobe (รวมชื่อแผนกและประเภทไลเซนส์)</div>
              </div>
              <div className="header-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <label className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  แผนก:
                  <select className="select" value={departId} onChange={(e)=>setDepartId(e.target.value)} style={{ minWidth: 220 }}>
                    <option value="">ทั้งหมด</option>
                    {departments.map(d => (
                      <option key={d.depart_id} value={d.depart_id}>{d.depart_name}</option>
                    ))}
                  </select>
                </label>
                <label className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} title="จัดกลุ่มตามคอสเซ็นเตอร์">
                  <input type="checkbox" checked={groupByCost} onChange={(e)=>{ setGroupByCost(e.target.checked); setPage(1) }} /> จัดกลุ่มคอสเซ็นเตอร์
                </label>
                <div className="search">
                  <span className="search-icon" aria-hidden>🔎</span>
                  <input
                    type="text"
                    placeholder="ค้นหา..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    ref={searchRef}
                  />
                  {search && (
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
                <button className="btn small" onClick={exportExcel} title="ส่งออก Excel (.xlsx)">
                  <span className="btn-icon" aria-hidden>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="3" width="14" height="18" rx="2" ry="2" fill="#107C10" opacity="0.12"/>
                      <path d="M8 4h6l3 3v13a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="#107C10" stroke-width="1.2" fill="none"/>
                      <path d="M15 4v3h3" stroke="#107C10" stroke-width="1.2" fill="none"/>
                      <path d="M12 11v6" stroke="#107C10" stroke-width="1.6" stroke-linecap="round"/>
                      <path d="M9.5 14.5L12 17l2.5-2.5" stroke="#107C10" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M7.75 9.25l1.9 3.3m0 0l-1.9 3.2m1.9-3.2 1.9-3.3m-1.9 3.3 1.9 3.2" stroke="#107C10" stroke-width="1.2" stroke-linecap="round"/>
                    </svg>
                  </span>
                  Export Excel
                </button>
                <span className="badge" style={{ background: '#F3F4F6', color: '#111827', padding: '6px 10px', borderRadius: 8 }} title="จำนวนรายการที่แสดง">
                  {total} items
                </span>
              </div>
            </div>
          </header>

          <section className="panel license-table" style={{ marginTop: '0.75rem' }}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 70 }}>#</th>
                    <th role="button" onClick={() => toggleSort('emp_id')}>รหัสพนักงาน<SortIcon col="emp_id" /></th>
                    <th role="button" onClick={() => toggleSort('name_email')}>อีเมล<SortIcon col="name_email" /></th>
                    <th role="button" onClick={() => toggleSort('license_name')}>ประเภท<SortIcon col="license_name" /></th>
                    <th role="button" onClick={() => toggleSort('full_name')}>ชื่อ-นามสกุล<SortIcon col="full_name" /></th>
                    <th role="button" onClick={() => toggleSort('disp_name')}>ติดตั้งที่เครื่อง<SortIcon col="disp_name" /></th>
                    <th role="button" onClick={() => toggleSort('nick_name')}>ชื่อเล่น<SortIcon col="nick_name" /></th>
                    <th role="button" onClick={() => toggleSort('depart_name')}>แผนก<SortIcon col="depart_name" /></th>
                    <th role="button" onClick={() => toggleSort('cost_center')}>คอสเซ็นเตอร์<SortIcon col="cost_center" /></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="9" className="empty">กำลังโหลด...</td></tr>
                  ) : error ? (
                    <tr><td colSpan="9" className="empty">{error}</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan="9" className="empty">ไม่พบข้อมูล</td></tr>
                  ) : groupByCost && groupedRows ? (
                    // Render paginated rows but inject a group header when cost_center changes or at page start
                    (() => {
                      const startIndex = (Math.max(1, page) - 1) * pageSize
                      const prevCost = startIndex > 0 ? baseRows[startIndex - 1]?.cost_center || 'ไม่ระบุ' : null
                      let lastCost = prevCost
                      const frags = []
                      pagedRows.forEach((r, idx) => {
                        const cost = r.cost_center || 'ไม่ระบุ'
                        if (idx === 0 || cost !== lastCost) {
                          frags.push(
                            <tr key={`g-${page}-${idx}`}>
                              <td colSpan="9" style={{ background: 'rgba(0,120,212,0.06)', fontWeight: 700, color: '#0b5cab' }}>
                                คอสเซ็นเตอร์: {cost} — {groupCounts?.get(cost) || 0} รายการ
                              </td>
                            </tr>
                          )
                        }
                        frags.push(
                          <tr key={`${r.emp_id}-${r.name_email}-${startIndex+idx}`}>
                            <td>{startIndex + idx + 1}</td>
                            <td>{r.emp_id}</td>
                            <td className="muted">{r.name_email}</td>
                            <td>{r.license_name}</td>
                            <td>{r.full_name}</td>
                            <td>{r.disp_name}</td>
                            <td>{r.nick_name}</td>
                            <td>{r.depart_name}</td>
                            <td>{r.cost_center}</td>
                          </tr>
                        )
                        lastCost = cost
                      })
                      return frags
                    })()
                  ) : (
                    pagedRows.map((r, idx) => (
                      <tr key={`${r.emp_id}-${r.name_email}-${idx}`}>
                        <td>{idx + 1 + (Math.max(1, page) - 1) * pageSize}</td>
                        <td>{r.emp_id}</td>
                        <td className="muted">{r.name_email}</td>
                        <td>{r.license_name}</td>
                        <td>{r.full_name}</td>
                        <td>{r.disp_name}</td>
                        <td>{r.nick_name}</td>
                        <td>{r.depart_name}</td>
                        <td>{r.cost_center}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination (Homepage style) */}
            {(() => {
              const windowSize = 5
              let start = Math.max(1, page - Math.floor(windowSize / 2))
              let end = Math.min(pageCount, start + windowSize - 1)
              start = Math.max(1, Math.min(start, Math.max(1, end - windowSize + 1)))
              const pages = []
              for (let p = start; p <= end; p++) pages.push(p)
              const canPrev = page > 1
              const canNext = page < pageCount
              return (
                <div className="pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <div className="size-group">
                    <span className="muted">แถวต่อหน้า</span>
                    <select className="select" value={pageSize} onChange={(e)=>{ setPageSize(parseInt(e.target.value)||10); setPage(1) }}>
                      {[10,20,50,100,200].map(sz => <option key={sz} value={sz}>{sz}</option>)}
                    </select>
                    <span className="muted d-none-mobile">ทั้งหมด {total} แถว</span>
                    <span className="muted d-none-mobile">หน้า {page} / {pageCount}</span>
                  </div>
                  <div className="page-group">
                    <button className="btn small ghost page-num" onClick={() => setPage(1)} disabled={!canPrev} title="หน้าแรก">&laquo;</button>
                    <button className="btn small ghost page-num" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!canPrev} title="ก่อนหน้า">‹</button>
                    {start > 1 && <span className="muted">…</span>}
                    {pages.map((p) => (
                      <button
                        key={p}
                        className="btn small ghost page-num"
                        onClick={() => setPage(p)}
                        aria-current={p === page ? 'page' : undefined}
                      >
                        {p}
                      </button>
                    ))}
                    {end < pageCount && <span className="muted">…</span>}
                    <button className="btn small ghost page-num" onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={!canNext} title="ถัดไป">›</button>
                    <button className="btn small ghost page-num" onClick={() => setPage(pageCount)} disabled={!canNext} title="หน้าสุดท้าย">&raquo;</button>
                  </div>
                </div>
              )
            })()}
          </section>
        </main>
        {!sidebarCollapsed && (
          <div className="sidebar-backdrop" onClick={() => setSidebarCollapsed(true)} />
        )}
      </div>

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
