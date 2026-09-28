import { useState, useEffect, useMemo, useRef } from 'react'
import AddLicense from './AddLicense.jsx'
import { API_BASE } from '../config.js'
import SideBar from './SideBar.jsx'
import adobeCC from '../assets/adobe-creative-cloud.png';
import adobePS from '../assets/adobe-photoshop.png';
import adobeAI from '../assets/adobe-illustrator.png';
import adobeLogo from '../assets/adobe-logo.png'
import './Homepage.css'

// --- Inline components for the License Management UI ---
function LicenseDashboard({ stats }) {
  const items = [
    {
      label: 'Total',
      value: stats.total,
      color: '#0078D4',
      icon: (
        <img 
          src={adobeLogo}
          alt="Adobe Logo" 
          width="40" 
          height="40"
          style={{ display: 'block' }}
        />
      ),
    },
    {
      label: 'Adobe Photoshop & Illustrator',
      value: stats.PSAICount,
      color: '#217346',
      icon: (
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
      ),
    },
    {
      label: 'Adobe Creative Cloud',
      value: stats.CloudCount,
      color: '#2B579A',
      icon: (
        <img 
          src={adobeCC}
          alt="Adobe Logo" 
          width="40" 
          height="40"
          style={{ display: 'block' }}
        />
      ),
    },
  ]
  return (
    <section className="license-stats">
      {items.map((it, idx) => (
        <div key={idx} className="stat-card" style={{ '--card-color': it.color }}>
          <div className="stat-icon" aria-hidden>{it.icon}</div>
          <div className="stat-info">
            <div className="stat-value">{it.value}</div>
            <div className="stat-label">{it.label}</div>
          </div>
        </div>
      ))}
    </section>
  )
}

function LicenseToolbar({ filterText, setFilterText, onSync, rowCount, onAdd }) {
  const inputRef = useRef(null)
  return (
    <section className="license-toolbar">
      <div className="left">
        <div className="search">
          <span className="search-icon" aria-hidden>🔎</span>
          <input
            type="text"
            placeholder="ค้นหา..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            ref={inputRef}
          />
          {filterText && (
            <button
              type="button"
              className="btn small icon-round"
              aria-label="ล้างคำค้นหา"
              title="ล้างคำค้นหา"
              onClick={() => { setFilterText(''); setTimeout(() => inputRef.current && inputRef.current.focus(), 0) }}
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
      </div>
      <div className="right">
        <span className="row-count">ทั้งหมด {rowCount} แถว</span>
        <button className="btn small primary" onClick={onSync} title="ซิงค์ข้อมูล" disabled={!onSync}>
          <span className="btn-icon" aria-hidden>🔄</span>
          <span className="d-none-mobile" style={{fontSize: '0.9rem'}}>ซิงค์ข้อมูล</span>
        </button>
        <button className="btn small primary" onClick={onAdd} title="เพิ่มไลเซนส์">
          <span className="btn-icon" aria-hidden>+</span>
          <span style={{fontSize: '0.9rem'}}>เพิ่มไลเซนส์</span>
        </button>
      </div>
    </section>
  )
}

function LicenseTable({ rows, loading, error, onEdit, onDelete, page, pageSize, isSearching }) {
  return (
    <section className="license-table">
      <div className="table-wrap">
        <table>
          <colgroup>
            <col style={{ width: '50px' }} />
            <col style={{ width: '110px' }} />
            <col style={{ width: '18%' }} />
            {/* <col style={{ width: '12%' }} /> */}
            <col style={{ width: '20%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '80px' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{width:'50px'}}>ลำดับ</th>
              <th>รหัสพนักงาน</th>
              <th>ชื่อ-นามสกุล</th>
              {/* <th>Display</th> */}
              <th>อีเมล</th>
              <th>แผนก</th>
              <th>คอสเซ็นเตอร์</th>
              <th>ประเภท</th>
              <th>ชื่อเล่น</th>
              <th style={{width:'80px'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" className="empty">กำลังโหลดข้อมูล...</td></tr>
            ) : error ? (
              <tr><td colSpan="9" className="empty">{error}</td></tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan="9" className="empty">ไม่พบข้อมูล</td>
              </tr>
            ) : rows.map((r, idx) => (
              <tr key={`${r.emp_id}-${r.name_email}`}>
                <td>{isSearching ? (idx + 1) : (idx + 1 + (Math.max(1, page) - 1) * pageSize)}</td>
                <td>{r.emp_id}</td>
                <td>{r.full_name}</td>
                {/* <td>{r.disp_name}</td> */}
                <td className="muted">{r.name_email}</td>
                <td>{r.depart_name}</td>
                <td>{r.cost_center}</td>
                <td>{r.license_name}</td>
                <td>{r.nick_name}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn small icon-round" title="แก้ไข" onClick={() => onEdit(r)} aria-label="แก้ไข">
                      <span className="btn-icon" aria-hidden>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/>
                          <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42L18.37 3.29a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.83z" fill="currentColor"/>
                        </svg>
                      </span>
                    </button>
                    <button 
                      className="btn small icon-round danger" 
                      title="ลบ" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(r.emp_id, r.name_email);
                      }} 
                      aria-label="ลบ"
                    >
                      <span className="btn-icon" aria-hidden>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                        </svg>
                      </span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const pageCount = Math.max(1, Math.ceil((total || 0) / pageSize))
  const canPrev = page > 1
  const canNext = page < pageCount

  // Build a small window of page numbers around current page
  const windowSize = 5
  let start = Math.max(1, page - Math.floor(windowSize / 2))
  let end = Math.min(pageCount, start + windowSize - 1)
  start = Math.max(1, Math.min(start, Math.max(1, end - windowSize + 1)))

  const pages = []
  for (let p = start; p <= end; p++) pages.push(p)

  return (
    <div className="pagination">
      <div className="size-group">
        <span className="muted">แถวต่อหน้า</span>
        <select className="select" value={pageSize} onChange={(e)=> onPageSizeChange(parseInt(e.target.value) || 10)}>
          {[10,20,50,100].map(sz => <option key={sz} value={sz}>{sz}</option>)}
        </select>
        <span className="muted d-none-mobile">ทั้งหมด {total} แถว</span>
        <span className="muted d-none-mobile">หน้า {page} / {pageCount}</span>
      </div>
      <div className="page-group">
        <button className="btn small ghost page-num" onClick={() => onPageChange(1)} disabled={!canPrev} title="หน้าแรก">&laquo;</button>
        <button className="btn small ghost page-num" onClick={() => onPageChange(page - 1)} disabled={!canPrev} title="ก่อนหน้า">‹</button>
        {start > 1 && <span className="muted">…</span>}
        {pages.map((p) => (
          <button
            key={p}
            className="btn small ghost page-num"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        ))}
        {end < pageCount && <span className="muted">…</span>}
        <button className="btn small ghost page-num" onClick={() => onPageChange(page + 1)} disabled={!canNext} title="ถัดไป">›</button>
        <button className="btn small ghost page-num" onClick={() => onPageChange(pageCount)} disabled={!canNext} title="หน้าสุดท้าย">&raquo;</button>
      </div>
    </div>
  )
}

function EditModal({ open, initial, onClose, onSave, saving, departments = [], licenseTypes = [] }) {
  const [form, setForm] = useState(() => initial || {})
  useEffect(() => { setForm(initial || {}) }, [initial])
  if (!open) return null

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3>
            <span className="hdr-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/>
                <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42L18.37 3.29a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.83z" fill="currentColor"/>
              </svg>
            </span>
            แก้ไขข้อมูลผู้ใช้
          </h3>
          <button className="logout-btn power" onClick={onClose} aria-label="ปิด" title="ปิด">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 3h-2v10h2V3z" fill="currentColor"/>
              <path d="M17.83 5.17l-1.41 1.41A7 7 0 1112 19a7 7 0 01-4.41-12.42L6.17 5.17A9 9 0 1021 12a8.96 8.96 0 00-3.17-6.83z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="grid-2">
            <label>
              <span>รหัสพนักงาน (อ่านอย่างเดียว)</span>
              <div className="input-with-icon">
                <span className="prefix-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5z" fill="currentColor"/>
                    <path d="M12 14c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z" fill="currentColor"/>
                  </svg>
                </span>
                <input type="text" value={form.emp_id || ''} readOnly disabled={saving} />
              </div>
            </label>
            <label>
              <span>ชื่อ-สกุล</span>
              <div className="input-with-icon">
                <span className="prefix-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-3 7c.83 0 1.5.67 1.5 1.5S9.83 12 9 12s-1.5-.67-1.5-1.5S8.17 9 9 9zm6 0c.83 0 1.5.67 1.5 1.5S15.83 12 15 12s-1.5-.67-1.5-1.5S14.17 9 15 9zm-9 6c1.73 2.28 4.41 3 6 3s4.27-.72 6-3H6z" fill="currentColor"/>
                  </svg>
                </span>
                <input type="text" value={form.full_name || ''} onChange={(e)=>update('full_name', e.target.value)} disabled={saving} />
              </div>
            </label>
            <label>
              <span>ติดตั้งที่เครื่อง (TNLXXXXX)</span>
              <div className="input-with-icon">
                <span className="prefix-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h12v2H3v-2z" fill="currentColor"/>
                  </svg>
                </span>
                <input type="text" value={form.disp_name || ''} onChange={(e)=>update('disp_name', e.target.value)} disabled={saving} />
              </div>
            </label>
            <label>
              <span>อีเมล</span>
              <div className="input-with-icon">
                <span className="prefix-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" fill="currentColor"/>
                  </svg>
                </span>
                <input type="email" value={form.name_email || ''} onChange={(e)=>update('name_email', e.target.value)} disabled={saving} />
              </div>
            </label>
            <label>
              <span>แผนก</span>
              <div className="input-with-icon">
                <span className="prefix-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 22h16v-2H4v2zM20 2H4c-1.1 0-2 .9-2 2v14h20V4c0-1.1-.9-2-2-2zm-2 12H6V6h12v8z" fill="currentColor"/>
                  </svg>
                </span>
              <select
                className="select"
                value={form.depart_id || ''}
                onChange={(e) => update('depart_id', e.target.value)}
                disabled={saving}
                style={{ width: '100%' }}
              >
                <option value="">— เลือกแผนก —</option>
                {departments.map((d) => (
                  <option key={d.depart_id} value={d.depart_id}>
                    {d.depart_name}
                  </option>
                ))}
              </select>
              </div>
            </label>
            <label>
              <span>COSTCENTER</span>
              <div className="input-with-icon">
                <span className="prefix-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v2h20V6c0-1.1-.9-2-2-2zM2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-6H2v6zm3-3h4v2H5v-2z" fill="currentColor"/>
                  </svg>
                </span>
                <input type="text" value={form.cost_center || ''} onChange={(e)=>update('cost_center', e.target.value)} disabled={saving} />
              </div>
            </label>
            <label>
              <span>ประเภท License</span>
              <div className="input-with-icon">
                <span className="prefix-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" fill="currentColor"/>
                  </svg>
                </span>
                <select
                  className="select"
                  value={form.license_id || ''}
                  onChange={(e) => update('license_id', e.target.value)}
                  disabled={saving}
                  style={{ width: '100%' }}
                >
                  <option value="">— เลือกประเภท License —</option>
                  {licenseTypes.map((lt) => (
                    <option key={lt.license_id} value={lt.license_id}>
                      {lt.license_name}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <label>
              <span>ชื่อเล่น</span>
              <div className="input-with-icon">
                <span className="prefix-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-3 7c.83 0 1.5.67 1.5 1.5S9.83 12 9 12s-1.5-.67-1.5-1.5S8.17 9 9 9zm6 0c.83 0 1.5.67 1.5 1.5S15.83 12 15 12s-1.5-.67-1.5-1.5S14.17 9 15 9zm-9 6c1.73 2.28 4.41 3 6 3s4.27-.72 6-3H6z" fill="currentColor"/>
                  </svg>
                </span>
                <input type="text" value={form.nick_name || ''} onChange={(e)=>update('nick_name', e.target.value)} disabled={saving} />
              </div>
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose} disabled={saving}>
              <span className="btn-icon" aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.17 12l6.72-7.71 1.41 1.42z" fill="currentColor"/>
                </svg>
              </span>
              ยกเลิก
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              <span className="btn-icon" aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 16.17 4.83 12 3.41 13.41 9 19l12-12-1.41-1.41L9 16.17z" fill="currentColor"/>
                </svg>
              </span>
              {saving ? 'กำลังบันทึก…' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Homepage({ onLogout, user, navigate }) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [filterText, setFilterText] = useState('')
  const [licenses, setLicenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      const saved = localStorage.getItem('o365_sidebar_collapsed')
      if (saved != null) return saved === 'true'
    } catch {}
    return window.innerWidth <= 1024
  })
  const [isSmallViewport, setIsSmallViewport] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 1024 : false))
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [departments, setDepartments] = useState([])
  const [licenseTypes, setLicenseTypes] = useState([])
  const [toast, setToast] = useState(null)

  // When search text changes, always reset to page 1 so results aren't hidden on later pages
  useEffect(() => {
    setPage(1)
  }, [filterText])

  // Count to display in toolbar: if searching, count filtered items locally; else use server total
  const filteredCount = useMemo(() => {
    const q = (filterText || '').trim().toLowerCase()
    if (!q) return total
    const sorted = [...licenses] // sorting not required for counting
    return sorted.filter(r =>
      (r.emp_id != null && String(r.emp_id).toLowerCase().includes(q)) ||
      (r.full_name != null && String(r.full_name).toLowerCase().includes(q)) ||
      (r.name_email != null && String(r.name_email).toLowerCase().includes(q)) ||
      (r.license_name != null && String(r.license_name).toLowerCase().includes(q)) ||
      (r.depart_name != null && String(r.depart_name).toLowerCase().includes(q)) ||
      (r.cost_center != null && String(r.cost_center).toLowerCase().includes(q))
    ).length
  }, [filterText, licenses, total])

  // Ensure Homepage shows #Licenses in URL by default
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        if (window.location.hash !== '#Licenses') {
          window.location.hash = '#Licenses'
        }
      }
    } catch {}
  }, [])

  // Compute rows to display in the table
  const displayRows = useMemo(() => {
    // Always sort by cost_center and emp_id, regardless of filter
    const sortedLicenses = [...licenses].sort((a, b) => {
      // First sort by cost_center
      const ac = a.cost_center || '';
      const bc = b.cost_center || '';
      if (ac < bc) return -1;
      if (ac > bc) return 1;
      
      // If cost_center is the same, sort by emp_id
      const ae = a.emp_id || '';
      const be = b.emp_id || '';
      if (ae < be) return -1;
      if (ae > be) return 1;
      return 0;
    });

    if (!filterText.trim()) {
      const start = (Math.max(1, page) - 1) * pageSize;
      return sortedLicenses.slice(start, start + pageSize);
    }

    const searchLower = filterText.trim().toLowerCase();
    const filtered = sortedLicenses.filter(r => 
      (r.emp_id != null && String(r.emp_id).toLowerCase().includes(searchLower)) ||
      (r.full_name != null && String(r.full_name).toLowerCase().includes(searchLower)) ||
      (r.name_email != null && String(r.name_email).toLowerCase().includes(searchLower)) ||
      (r.license_name != null && String(r.license_name).toLowerCase().includes(searchLower)) ||
      (r.depart_name != null && String(r.depart_name).toLowerCase().includes(searchLower)) ||
      (r.cost_center != null && String(r.cost_center).toLowerCase().includes(searchLower))
    );
    // When searching, show all matches on a single page (no slicing)
    return filtered;
  }, [licenses, page, pageSize, filterText])

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // Fetch departments for dropdown once
  useEffect(() => {
    let ignore = false
    const run = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/departments?limit=2000`)
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'ดึงข้อมูลแผนกไม่สำเร็จ')
        if (!ignore) setDepartments(Array.isArray(data.items) ? data.items : [])
      } catch (e) {
        // non-blocking; keep UI usable even if departments failed to load
      }
    }
    run()
    return () => { ignore = true }
  }, [])

  // Fetch license types for dropdown once
  useEffect(() => {
    let ignore = false
    const run = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/license_types`)
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'ดึงข้อมูลประเภทไลเซนส์ไม่สำเร็จ')
        if (!ignore) setLicenseTypes(Array.isArray(data.items) ? data.items : [])
      } catch (e) {
        // non-blocking
      }
    }
    run()
    return () => { ignore = true }
  }, [])

  // Handle responsive behavior of sidebar on window resize
  useEffect(() => {
    const onResize = () => {
      const small = window.innerWidth <= 1024
      setIsSmallViewport(small)
      // Auto-collapse on small screens; DO NOT auto-expand on large screens to preserve user preference
      if (small) setSidebarCollapsed(true)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Persist sidebar collapsed preference
  useEffect(() => {
    try { localStorage.setItem('o365_sidebar_collapsed', sidebarCollapsed ? 'true' : 'false') } catch {}
  }, [sidebarCollapsed])

  const stats = useMemo(() => {
    const total = licenses.length
    const lower = (s) => (s || '').toString().toLowerCase()
    let PSAICount = 0
    let CloudCount = 0
    for (const r of licenses) {
      const name = lower(r.license_name)
      if (name.includes('Photoshop & Illustrator')) PSAICount++
      if (name.includes('Adobe Creative Cloud')) CloudCount++
    }
    return { total, PSAICount, CloudCount }
  }, [licenses])

  // Shared fetch function so we can refresh after save (client-side pagination)
  // options: { silent?: boolean }
  const fetchLicenses = async (signal, options = {}) => {
    const { silent = false } = options
    try {
      if (!silent) setLoading(true)
      setError('')
      const params = new URLSearchParams()
      // Always fetch a larger chunk once, then filter/slice client-side
      params.set('limit', '5000')
      const res = await fetch(`${API_BASE}/api/licenses?${params.toString()}`, { signal })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `ดึงข้อมูลไม่สำเร็จ (HTTP ${res.status})`)
      const items = Array.isArray(data.items) ? data.items : []
      setLicenses(items)
      // Total should represent the full dataset size we loaded
      setTotal(items.length)
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message || 'เกิดข้อผิดพลาด')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  // Fetch once on load; filtering/pagination handled client-side
  useEffect(() => {
    const controller = new AbortController()
    fetchLicenses(controller.signal)
    return () => controller.abort()
  }, [])

  const handleSync = () => {
    // Explicit refresh
    fetchLicenses()
  }

  const handlePageChange = (p) => {
    setPage(() => Math.max(1, p))
  }
  const handlePageSizeChange = (sz) => {
    setPageSize(sz)
    setPage(1)
  }

  const handleOpenEdit = (row) => {
    setEditTarget(row)
    setEditOpen(true)
  }

  const handleDeleteLicense = (empId, email) => {
    setDeleteConfirm({ empId, email, name: licenses.find(l => l.emp_id === empId)?.full_name || '' })
    return false;
  }

  const handleCloseEdit = () => {
    setEditOpen(false)
    setEditTarget(null)
  }

  const handleOpenAdd = () => setAddOpen(true)
  const handleCloseAdd = () => setAddOpen(false)

  const handleSaveCreate = async (payload) => {
    try {
      setSaving(true)
      const res = await fetch(`${API_BASE}/api/licenses/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'บันทึกไม่สำเร็จ')
      // Optimistic add: push new row (derive names for display)
      setLicenses((prev) => {
        const depart = departments.find(d => String(d.depart_id) === String(payload.depart_id))
        const ltype = licenseTypes.find(lt => String(lt.license_id) === String(payload.license_id))
        const newRow = {
          emp_id: payload.emp_id,
          name_email: payload.name_email,
          full_name: payload.full_name || '',
          disp_name: payload.disp_name || '',
          depart_id: payload.depart_id || null,
          depart_name: depart ? depart.depart_name : '',
          cost_center: payload.cost_center || '',
          license_id: payload.license_id || null,
          license_name: ltype ? ltype.license_name : '',
          nick_name: payload.nick_name || '',
        }
        return Array.isArray(prev) ? [...prev, newRow] : [newRow]
      })
      setTotal((t) => (typeof t === 'number' ? t + 1 : t))
      // Silent refresh to sync server-calculated fields
      fetchLicenses(undefined, { silent: true })
      setAddOpen(false)
      // Show success toast
      setToast({ type: 'success', message: 'บันทึกข้อมูลเรียบร้อย' })
      setTimeout(() => setToast(null), 3000)
    } catch (e) {
      alert(e.message || 'เกิดข้อผิดพลาดระหว่างบันทึก')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEdit = async (updated) => {
    try {
      setSaving(true)
      const res = await fetch(`${API_BASE}/api/licenses/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'บันทึกไม่สำเร็จ')
      // Optimistic update to avoid flicker
      setLicenses((prev) => {
        if (!Array.isArray(prev)) return prev
        return prev.map((r) => {
          if (String(r.emp_id) !== String(updated.emp_id)) return r
          // If depart_id changed, derive depart_name from departments list for immediate UI sync
          let nextDepartName = r.depart_name
          if (updated.depart_id != null && updated.depart_id !== '') {
            const match = departments.find(d => String(d.depart_id) === String(updated.depart_id))
            if (match) nextDepartName = match.depart_name
          }
          return {
            ...r,
            full_name: updated.full_name ?? r.full_name,
            disp_name: updated.disp_name ?? r.disp_name,
            name_email: updated.name_email ?? r.name_email,
            cost_center: updated.cost_center ?? r.cost_center,
            nick_name: updated.nick_name ?? r.nick_name,
            depart_id: updated.depart_id ?? r.depart_id,
            license_id: updated.license_id ?? r.license_id,
            depart_name: nextDepartName,
            license_name: (() => {
              if (updated.license_id != null && updated.license_id !== '') {
                const match = licenseTypes.find(lt => String(lt.license_id) === String(updated.license_id))
                return match ? match.license_name : r.license_name
              }
              return r.license_name
            })(),
            // license_name / depart_name will be refreshed silently below
          }
        })
      })
      // Silent refresh to sync derived fields (depart_name, license_name)
      fetchLicenses(undefined, { silent: true })
      setEditOpen(false)
      setEditTarget(null)
      // Show success toast
      setToast({ type: 'success', message: 'บันทึกข้อมูลเรียบร้อย' })
      setTimeout(() => setToast(null), 3000)
    } catch (e) {
      alert(e.message || 'เกิดข้อผิดพลาดระหว่างบันทึก')
    } finally {
      setSaving(false)
    }
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('th-TH', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const apps = [
    {
      name: 'Outlook',
      icon: '📧',
      color: '#0078d4',
      description: 'อีเมลและปฏิทิน'
    },
    {
      name: 'Word',
      icon: '📝',
      color: '#2b579a',
      description: 'เอกสารและการเขียน'
    },
    {
      name: 'Excel',
      icon: '📊',
      color: '#217346',
      description: 'สเปรดชีตและข้อมูล'
    },
    {
      name: 'PowerPoint',
      icon: '📋',
      color: '#d24726',
      description: 'งานนำเสนอ'
    },
    {
      name: 'Teams',
      icon: '👥',
      color: '#6264a7',
      description: 'การประชุมและแชท'
    },
    {
      name: 'OneDrive',
      icon: '☁️',
      color: '#0078d4',
      description: 'จัดเก็บไฟล์'
    },
    {
      name: 'SharePoint',
      icon: '🔗',
      color: '#0078d4',
      description: 'การทำงานร่วมกัน'
    },
    {
      name: 'OneNote',
      icon: '📔',
      color: '#7719aa',
      description: 'จดบันทึก'
    }
  ]

  return (
    <div className="homepage">
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
              <div className="user-avatar">
                {(user?.display || user?.username || 'U').charAt(0)}
              </div>
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
          active="licenses"
          onNavigate={(key) => {
            if (typeof navigate === 'function') {
              if (key === 'dashboard') {
                navigate('/ADOBE/')
                try { window.location.hash = '#Dashboard' } catch {}
              }
              if (key === 'licenses') {
                navigate('/ADOBE/')
                try { window.location.hash = '#Licenses' } catch {}
              }
              if (key === 'reports') {
                navigate('/ADOBE/')
                try { window.location.hash = '#Reports' } catch {}
              }
              if (key === 'settings') {
                navigate('/ADOBE/')
                try { window.location.hash = '#Settings' } catch {}
              }
            }
          }}
          collapsed={sidebarCollapsed}
        />
        <main className="main-content fade-in">
          <LicenseDashboard 
            stats={{
              total: licenses.length,
              PSAICount: licenses.filter(l => l.license_name && l.license_name.includes('Illustrator')).length,
              CloudCount: licenses.filter(l => l.license_name && l.license_name.includes('Cloud')).length
            }} 
          />
          
          <LicenseToolbar 
            filterText={filterText}
            setFilterText={setFilterText}
            onSync={handleSync}
            rowCount={filteredCount}
            onAdd={handleOpenAdd}
          />
          
          <LicenseTable 
            rows={displayRows}
            loading={loading && licenses.length === 0} 
            error={error} 
            onEdit={handleOpenEdit}
            onDelete={handleDeleteLicense}
            page={page} 
            pageSize={pageSize} 
            isSearching={!!filterText.trim()}
          />

          {!filterText.trim() && (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          )}

          <EditModal
            open={editOpen}
            initial={editTarget}
            onClose={handleCloseEdit}
            onSave={handleSaveEdit}
            saving={saving}
            departments={departments}
            licenseTypes={licenseTypes}
          />

          <AddLicense
            open={addOpen}
            onClose={handleCloseAdd}
            onSave={handleSaveCreate}
            saving={saving}
            departments={departments}
            licenseTypes={licenseTypes}
          />
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

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>ยืนยันการลบข้อมูล</h3>
              <button 
                className="logout-btn power" 
                onClick={() => setDeleteConfirm(null)} 
                aria-label="ปิด" 
                title="ปิด"
                style={{ margin: 0, padding: '0.25rem' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 3h-2v10h2V3z" fill="currentColor"/>
                  <path d="M17.83 5.17l-1.41 1.41A7 7 0 1112 19a7 7 0 01-4.41-12.42L6.17 5.17A9 9 0 1021 12a8.96 8.96 0 00-3.17-6.83z" fill="currentColor"/>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '4rem', color: '#ff4d4f', marginBottom: '1rem' }}>🗑️</div>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 600 }}>ต้องการลบข้อมูลหรือไม่?</h3>
                <p style={{ color: '#595959', margin: 0 }}>คุณกำลังจะลบข้อมูลของ <strong>{deleteConfirm.name}</strong> (รหัส: {deleteConfirm.empId})</p>
                <p style={{ color: '#ff4d4f', fontSize: '0.9rem', margin: '0.5rem 0 0' }}>การกระทำนี้ไม่สามารถย้อนกลับได้</p>
              </div>
              <div className="modal-actions" style={{ justifyContent: 'center', gap: '1rem' }}>
                <button 
                  className="btn" 
                  onClick={() => setDeleteConfirm(null)}
                  style={{ padding: '0.5rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
                  </svg>
                  ยกเลิก
                </button>
                <button 
                  className="btn danger" 
                  onClick={async () => {
                    try {
                      const response = await fetch(`${API_BASE}/api/licenses/delete`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          emp_id: deleteConfirm.empId,
                          email: deleteConfirm.email
                        })
                      });
                      
                      if (!response.ok) throw new Error('Failed to delete license');
                      
                      fetchLicenses(undefined, { silent: true });
                      setToast({ type: 'success', message: 'ลบข้อมูลเรียบร้อยแล้ว' });
                      setTimeout(() => setToast(null), 3000);
                    } catch (e) {
                      console.error('Delete error:', e);
                      setToast({ type: 'error', message: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
                      setTimeout(() => setToast(null), 3000);
                    } finally {
                      setDeleteConfirm(null);
                    }
                  }}
                  style={{ padding: '0.5rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  autoFocus
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                  </svg>
                  ลบข้อมูล
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          <div className="toast-content">
            {toast.type === 'success' ? '✓' : '!'}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  )
}
