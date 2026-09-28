import { useEffect, useMemo, useRef, useState } from 'react'
import { API_BASE } from '../config.js'
import adobeLogo from '../assets/adobe-logo.png';
import adobeCC from '../assets/adobe-creative-cloud.png';
import adobePS from '../assets/adobe-photoshop.png';
import adobeAI from '../assets/adobe-illustrator.png';
import SideBar from './SideBar.jsx'
import './Homepage.css'

export default function Dashboard({ navigate, user, onLogout }) {
  const [licenses, setLicenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      const saved = localStorage.getItem('o365_sidebar_collapsed')
      if (saved != null) return saved === 'true'
    } catch {}
    return window.innerWidth <= 1024
  })
  const [currentTime, setCurrentTime] = useState(new Date())
  const [lastUpdated, setLastUpdated] = useState(null)
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [percentMode, setPercentMode] = useState(false)

  useEffect(() => {
    document.title = 'Adobe Licenses'
  }, [])

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

  // Ensure Dashboard shows #Dashboard in URL by default
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        if (window.location.hash !== '#Dashboard') {
          window.location.hash = '#Dashboard'
        }
      }
    } catch {}
  }, [])

  // update time every minute
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const formatTime = (d) => d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (d) => d.toLocaleDateString('th-TH', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const params = new URLSearchParams()
        params.set('limit', '5000')
        const res = await fetch(`${API_BASE}/api/licenses?${params.toString()}`, { signal: controller.signal })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || `ดึงข้อมูลไม่สำเร็จ (HTTP ${res.status})`)
        setLicenses(Array.isArray(data.items) ? data.items : [])
        setLastUpdated(new Date())
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล')
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [])

  // Unique department list for filters
  const departmentList = useMemo(() => {
    const set = new Set()
    licenses.forEach(l => set.add(l.depart_name || 'ไม่ระบุแผนก'))
    return ['all', ...Array.from(set).sort((a,b) => a.localeCompare(b))]
  }, [licenses])

  // Filtered licenses by current filters
  const filteredLicenses = useMemo(() => {
    return licenses.filter(l => {
      const depOk = selectedDepartment === 'all' || (l.depart_name || 'ไม่ระบุแผนก') === selectedDepartment
      const typeOk = selectedType === 'all' || (l.license_name || 'ไม่ระบุไลเซนส์') === selectedType
      return depOk && typeOk
    })
  }, [licenses, selectedDepartment, selectedType])

  const totals = useMemo(() => {
    const total = filteredLicenses.length;
    const illustrator = filteredLicenses.filter(l => 
      l.license_name && l.license_name.toLowerCase().includes('illustrator')
    ).length;
    //const photoshop = filteredLicenses.filter(l => 
    //  l.license_name && l.license_name.toLowerCase().includes('photoshop')
    //).length;
    const creativeCloud = filteredLicenses.filter(l => 
      l.license_name && l.license_name.toLowerCase().includes('creative cloud')
    ).length;
    
    return { 
      total, 
      illustrator, 
      //photoshop,
      creativeCloud,
      // Keep backward compatibility
      Illustrator: illustrator,
      Cloud: creativeCloud
    };
  }, [filteredLicenses])

  const nf = useMemo(() => new Intl.NumberFormat('th-TH'), [])

  const byDepartment = useMemo(() => {
    const map = new Map()
    for (const l of filteredLicenses) {
      const dep = l.depart_name || 'ไม่ระบุแผนก'
      const entry = map.get(dep) || { count: 0, byType: new Map() }
      entry.count += 1
      const type = l.license_name || 'ไม่ระบุไลเซนส์'
      entry.byType.set(type, (entry.byType.get(type) || 0) + 1)
      map.set(dep, entry)
    }
    // sort departments by name asc
    const rows = Array.from(map.entries()).map(([depart, v]) => ({
      depart,
      count: v.count,
      types: Array.from(v.byType.entries()).sort((a,b) => a[0].localeCompare(b[0]))
    }))
    rows.sort((a,b) => a.depart.localeCompare(b.depart))
    return rows
  }, [filteredLicenses])

  // List of all license types across departments (sorted), used for consistent stacking and legend
  const licenseTypeList = useMemo(() => {
    const set = new Set()
    for (const row of byDepartment) {
      for (const [t] of row.types) set.add(t)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [byDepartment])

  // Totals across all departments for each license type and grand total
  const overallCounts = useMemo(() => {
    const typeTotals = new Map()
    let grand = 0
    for (const row of byDepartment) {
      grand += row.count || 0
      for (const [t, c] of row.types) {
        typeTotals.set(t, (typeTotals.get(t) || 0) + (c || 0))
      }
    }
    return { typeTotals, grand }
  }, [byDepartment])

  // Deterministic modern color mapping for license types (semi-transparent fills + solid borders)
  const COLORS = useMemo(() => {
    const palette = [
      { bg: 'rgba(99, 102, 241, 0.85)', border: 'rgba(99, 102, 241, 1)' },   // indigo-500
      { bg: 'rgba(14, 165, 233, 0.85)', border: 'rgba(14, 165, 233, 1)' },   // sky-500
      { bg: 'rgba(16, 185, 129, 0.85)', border: 'rgba(16, 185, 129, 1)' },   // emerald-500
      { bg: 'rgba(245, 158, 11, 0.85)', border: 'rgba(245, 158, 11, 1)' },   // amber-500
      { bg: 'rgba(239, 68, 68, 0.85)', border: 'rgba(239, 68, 68, 1)' },     // red-500
      { bg: 'rgba(168, 85, 247, 0.85)', border: 'rgba(168, 85, 247, 1)' },   // violet-500
      { bg: 'rgba(20, 184, 166, 0.85)', border: 'rgba(20, 184, 166, 1)' },   // teal-500
      { bg: 'rgba(249, 115, 22, 0.85)', border: 'rgba(249, 115, 22, 1)' },   // orange-500
      { bg: 'rgba(132, 204, 22, 0.85)', border: 'rgba(132, 204, 22, 1)' },   // lime-500
      { bg: 'rgba(236, 72, 153, 0.85)', border: 'rgba(236, 72, 153, 1)' },   // pink-500
    ]
    const map = new Map()
    licenseTypeList.forEach((t, i) => map.set(t, palette[i % palette.length]))
    return map
  }, [licenseTypeList])

  // Export department summary as CSV
  const handleExportCSV = () => {
    if (!byDepartment.length) return
    const header = ['Department','Total', ...licenseTypeList]
    const lines = [header]
    for (const row of byDepartment) {
      const m = new Map(row.types)
      const counts = licenseTypeList.map(t => m.get(t) || 0)
      lines.push([row.depart, row.count, ...counts])
    }
    const csv = lines.map(r => r.map(v => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g,'""') + '"' : s
    }).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dashboard_department_summary.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Modern stacked bar chart (Chart.js via CDN)
  const chartCanvasRef = useRef(null)
  const chartInstanceRef = useRef(null)

  useEffect(() => {
    const ensureChartLib = async () => {
      if (window.Chart) return
      await new Promise((resolve, reject) => {
        const s = document.createElement('script')
        s.src = 'https://cdn.jsdelivr.net/npm/chart.js'
        s.async = true
        s.onload = resolve
        s.onerror = reject
        document.body.appendChild(s)
      })
    }

    const renderChart = () => {
      if (!chartCanvasRef.current || !window.Chart) return
      // Destroy previous
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
        chartInstanceRef.current = null
      }
      const labels = byDepartment.map(r => r.depart)
      const datasets = licenseTypeList.map(type => {
        const color = COLORS.get(type) || { bg: 'rgba(99, 102, 241, 0.85)', border: 'rgba(99, 102, 241, 1)' }
        return {
          label: type,
          data: byDepartment.map(r => {
            const m = new Map(r.types)
            const raw = m.get(type) || 0
            if (!percentMode) return raw
            const total = r.count || 1
            return Math.round((raw / total) * 100)
          }),
          backgroundColor: color.bg,
          borderColor: color.border,
          borderWidth: 1,
          borderRadius: 6,
        }
      })

      chartInstanceRef.current = new window.Chart(chartCanvasRef.current.getContext('2d'), {
        type: 'bar',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 12, boxHeight: 12, usePointStyle: true, pointStyle: 'rectRounded' } },
            tooltip: { mode: 'index', intersect: false },
            title: { display: false },
          },
          scales: {
            x: { stacked: true, ticks: { maxRotation: 0, autoSkip: true } },
            y: { stacked: true, beginAtZero: true, suggestedMax: percentMode ? 100 : undefined, title: { display: true, text: percentMode ? 'เปอร์เซ็นต์ (%)' : 'จำนวน (licenses)' } },
          },
        },
      })
    }

    (async () => {
      try {
        await ensureChartLib()
        renderChart()
      } catch (e) {
        // swallow chart load errors silently
      }
    })()

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
        chartInstanceRef.current = null
      }
    }
  }, [byDepartment, licenseTypeList, COLORS, percentMode])

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
              {/* Hamburger icon */}
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
          active="dashboard"
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
          <header className="content-header" style={{ marginTop: 0 }}>
            
            <div className="header-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              
            </div>
          </header>

          {error && <div className="alert error">{error}</div>}

          <section className="license-stats">
            <div className="stat-card" style={{ '--card-color': '#0078D4' }}>
              <div className="stat-icon" aria-hidden>
                <img 
                  src={adobeLogo}
                  alt="Adobe Logo" 
                  width="40" 
                  height="40"
                  style={{ display: 'block' }}
                />
              </div>
              <div className="stat-info">
                <div className="stat-value">{nf.format(totals.total)}</div>
                <div className="stat-label">Total</div>
              </div>
            </div>
            <div className="stat-card" style={{ '--card-color': '#217346' }}>
            <div 
              className="stat-icon" 
              aria-hidden 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '4px' 
              }}
            >
              <img 
                src={adobePS}
                alt="Adobe Photoshop" 
                width="28" 
                height="28"
                style={{ display: 'block' }}
              />
              <img 
                src={adobeAI}
                alt="Adobe Illustrator"
                width="28"
                height="28"
                style={{ display: 'block' }}
              />
            </div>
              <div className="stat-info">
                <div className="stat-value">{nf.format(totals.illustrator )}</div>
                <div className="stat-label">Adobe Photoshop & Illustrator</div>
              </div>
            </div>
            <div className="stat-card" style={{ '--card-color': '#2B579A' }}>
              <div className="stat-icon" aria-hidden>
                <img 
                  src={adobeCC}
                  alt="Adobe Logo" 
                  width="40" 
                  height="40"
                  style={{ display: 'block' }}
                />
              </div>
              <div className="stat-info">
                <div className="stat-value">{nf.format(totals.creativeCloud)}</div>
                <div className="stat-label">Adobe Creative Cloud</div>
              </div>
            </div>
          </section>

          {/* Controls + Department-wise stacked bar chart (Chart.js) */}
          <section className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <div style={{ flex: '1 1 auto', minWidth: 240 }}>
                <h2 style={{ margin: 0, lineHeight: 1.2 }}>กราฟสรุปตามแผนก</h2>
                <div className="muted" style={{ fontSize: '0.85rem', marginTop: '2px' }}>แบ่งตามประเภทไลเซนส์ (stacked)</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', flex: '0 1 auto' }}>
                <label className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  แผนก:
                  <select className="select" value={selectedDepartment} onChange={(e)=>setSelectedDepartment(e.target.value)} aria-label="เลือกแผนก" style={{ minWidth: 180 }}>
                    {departmentList.map(dep => <option key={dep} value={dep}>{dep === 'all' ? 'ทั้งหมด' : dep}</option>)}
                  </select>
                </label>
                <label className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  ประเภทไลเซนส์:
                  <select className="select" value={selectedType} onChange={(e)=>setSelectedType(e.target.value)} aria-label="เลือกประเภทไลเซนส์" style={{ minWidth: 200 }}>
                    {['all', ...licenseTypeList].map(t => <option key={t} value={t}>{t === 'all' ? 'ทั้งหมด' : t}</option>)}
                  </select>
                </label>
                <label className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} title="แสดงเป็นเปอร์เซ็นต์ต่อแผนก">
                  <input type="checkbox" checked={percentMode} onChange={(e)=>setPercentMode(e.target.checked)} /> %
                </label>
                <button className="btn small" onClick={() => { setSelectedDepartment('all'); setSelectedType('all'); setPercentMode(false); }} title="ล้างตัวกรอง">ล้างตัวกรอง</button>
              </div>
            </div>
            <div style={{ position: 'relative', height: 360 }}>
              {loading ? (
                <div className="empty">⏳ กำลังโหลด...</div>
              ) : byDepartment.length === 0 ? (
                <div className="empty">ℹ️ ไม่พบข้อมูล</div>
              ) : (
                <>
                  <canvas ref={chartCanvasRef} />
                </>
              )}
            </div>
          </section>

          {/* Department x License Type table */}
          <section className="panel license-table">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <div>
                <h2 style={{ margin: 0, lineHeight: 1.2 }}>ตารางสรุปจำนวน Adobe Licenses ตามแผนก</h2>
                <div className="muted" style={{ fontSize: '0.85rem', marginTop: '2px' }}>
                  แสดงจำนวนรวมของแต่ละแผนก และแยกตามประเภทไลเซนส์ในคอลัมน์ถัดไป
                </div>
              </div>
              <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge" style={{ background: '#F3F4F6', color: '#111827', padding: '6px 10px', borderRadius: 8 }}>
                  ทั้งหมด {byDepartment.length} แผนก
                </span>
              </div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>#</th>
                    <th>แผนก</th>
                    {licenseTypeList.map((t) => (
                      <th key={t} style={{ textAlign: 'right' }}>{t}</th>
                    ))}
                    <th style={{ width: 100, textAlign: 'right' }}>รวม</th>
                  </tr>
                </thead>
                <tbody>
                  {byDepartment.length === 0 ? (
                    <tr><td className="empty" colSpan={3 + licenseTypeList.length}>ไม่พบข้อมูล</td></tr>
                  ) : (
                    byDepartment.map((row, idx) => {
                      const typeMap = new Map(row.types)
                      return (
                        <tr key={row.depart}>
                          <td>{idx + 1}</td>
                          <td>{row.depart}</td>
                          {licenseTypeList.map((t) => (
                            <td key={t} style={{ textAlign: 'right' }}>{nf.format(typeMap.get(t) || 0)}</td>
                          ))}
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{nf.format(row.count)}</td>
                        </tr>
                      )
                    })
                  )}
                  {byDepartment.length > 0 && (
                    <tr>
                      <td></td>
                      <td style={{ fontWeight: 700 }}>รวมทั้งหมด</td>
                      {licenseTypeList.map((t) => (
                        <td key={`sum-${t}`} style={{ textAlign: 'right', fontWeight: 700 }}>
                          {nf.format(overallCounts.typeTotals.get(t) || 0)}
                        </td>
                      ))}
                      <td style={{ textAlign: 'right', fontWeight: 800 }}>{nf.format(overallCounts.grand)}</td>
                    </tr>
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
