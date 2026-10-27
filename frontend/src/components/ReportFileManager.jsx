import { useEffect, useMemo, useRef, useState } from 'react'
import SideBar from './SideBar.jsx'
import { API_BASE } from '../config.js'
import { navigateByMenuKey } from './navigation.js'
import adobeLogo from '../assets/adobe-logo.png'
import './Homepage.css'

function inferFileType(fileName = '') {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.pdf')) return 'pdf'
  if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) return 'excel'
  return ''
}

function createInitialForm(includePriceType) {
  return {
    price: '',
    type: 'new',
    detail: '',
    year: '',
    file_type: '',
    note: '',
    file: null,
    includePriceType,
  }
}

function FieldIcon({ type }) {
  const paths = {
    price: <><circle cx="12" cy="12" r="8"/><path d="M12 7v10M15 9.5c-.6-.5-1.4-.8-2.5-.8-1.4 0-2.5.7-2.5 1.8s1 1.5 2.5 1.8 2.5.7 2.5 1.8-1.1 1.8-2.5 1.8c-1.1 0-2-.3-2.7-.9"/></>,
    type: <><path d="M7 7h10M7 12h10M7 17h6"/><path d="M17 4l3 3-3 3"/></>,
    detail: <><path d="M5 6h14M5 12h14M5 18h9"/></>,
    year: <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></>,
    file: <><path d="M7 3h7l4 4v14H7a2 2 0 01-2-2V5a2 2 0 012-2z"/><path d="M14 3v5h5"/></>,
    note: <><path d="M5 5h14v14H5z"/><path d="M8 9h8M8 13h8M8 17h5"/></>,
  }
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[type]}</svg>
}

function formatCreatedAt(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function FileFormModal({
  open,
  title,
  includePriceType,
  form,
  setForm,
  submitting,
  onClose,
  onSubmit,
}) {
  if (!open) return null

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal report-modal">
        <div className="modal-header">
          <h3>
            <span className="hdr-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4h16v16H4V4zm3 3v10h10V7H7zm2 2h6v2H9V9zm0 4h6v2H9v-2z" fill="currentColor"/>
              </svg>
            </span>
            {title}
          </h3>
          <button type="button" className="logout-btn power" onClick={onClose} aria-label="ปิด" title="ปิด">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 3h-2v10h2V3z" fill="currentColor"/><path d="M17.83 5.17l-1.41 1.41A7 7 0 1112 19a8.96 8.96 0 01-4.41-12.42L6.17 5.17A9 9 0 1021 12a8.96 8.96 0 00-3.17-6.83z" fill="currentColor"/></svg>
          </button>
        </div>
        <form className="modal-body report-modal-body" onSubmit={onSubmit}>
          <div className="modal-section-title">รายละเอียดรายการ</div>
          <div className="grid-2">
            {includePriceType && (
              <>
                <label>
                  <span>Price</span>
                  <div className="input-with-icon"><span className="prefix-icon"><FieldIcon type="price" /></span><input type="number" step="0.01" value={form.price} onChange={(e) => updateField('price', e.target.value)} /></div>
                </label>
                <label>
                  <span>Type</span>
                  <div className="input-with-icon"><span className="prefix-icon"><FieldIcon type="type" /></span><select className="select" value={form.type} onChange={(e) => updateField('type', e.target.value)}>
                    <option value="new">new</option>
                    <option value="renew">renew</option>
                  </select></div>
                </label>
              </>
            )}
            <label className="grid-span-2">
              <span>Detail</span>
              <div className="input-with-icon textarea-wrap"><span className="prefix-icon"><FieldIcon type="detail" /></span><textarea value={form.detail} onChange={(e) => updateField('detail', e.target.value)} rows={3} /></div>
            </label>
            <label>
                <span>Year</span>
                <div className="input-with-icon"><span className="prefix-icon"><FieldIcon type="year" /></span><input type="number" value={form.year} onChange={(e) => updateField('year', e.target.value)} /></div>
            </label>
            <label>
                <span>File Type</span>
                <div className="input-with-icon"><span className="prefix-icon"><FieldIcon type="file" /></span><select className="select" value={form.file_type} onChange={(e) => updateField('file_type', e.target.value)}>
                  <option value="">เลือกประเภทไฟล์</option>
                  <option value="pdf">pdf</option>
                  <option value="excel">excel</option>
                </select></div>
            </label>
            <label className="grid-span-2">
              <span>Note</span>
              <div className="input-with-icon textarea-wrap"><span className="prefix-icon"><FieldIcon type="note" /></span><textarea value={form.note} onChange={(e) => updateField('note', e.target.value)} rows={2} /></div>
            </label>
          </div>
          <div className="modal-section-title file-section-title">ไฟล์แนบ</div>
          <label className="file-picker">
            <span className="file-picker-icon"><FieldIcon type="file" /></span>
            <span><strong>{form.file ? form.file.name : 'เลือกไฟล์สำหรับอัปโหลด'}</strong><small>รองรับ PDF, XLS และ XLSX</small></span>
            <input type="file" accept=".pdf,.xls,.xlsx" onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  setForm((prev) => ({
                    ...prev,
                    file,
                    file_type: file ? (inferFileType(file.name) || prev.file_type) : prev.file_type,
                  }))
                }} />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose} disabled={submitting}>ยกเลิก</button>
            <button type="submit" className="btn primary" disabled={submitting}>{submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ReportFileManager({
  navigate,
  user,
  onLogout,
  reportKey,
  activeMenu,
  title,
  subtitle,
  hashKey,
  includePriceType = false,
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      const saved = localStorage.getItem('o365_sidebar_collapsed')
      if (saved != null) return saved === 'true'
    } catch { /* ignore saved sidebar preference */ }
    return window.innerWidth <= 1024
  })
  const [currentTime, setCurrentTime] = useState(new Date())
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(() => createInitialForm(includePriceType))
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' })
  const searchRef = useRef(null)

  const priceFormatter = useMemo(
    () => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    []
  )

  const showToast = (message, type = 'success') => {
    setToast({ show: true, type, message })
    window.clearTimeout(showToast._t)
    showToast._t = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }))
    }, 2500)
  }

  useEffect(() => { document.title = `Adobe Licenses - ${title}` }, [title])
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth <= 1024) setSidebarCollapsed(true)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  useEffect(() => {
    try { localStorage.setItem('o365_sidebar_collapsed', sidebarCollapsed ? 'true' : 'false') } catch { /* ignore storage errors */ }
  }, [sidebarCollapsed])
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.location.hash !== hashKey) {
        window.location.hash = hashKey
      }
    } catch { /* ignore hash update errors */ }
  }, [hashKey])
  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        setLoading(true)
        setError('')
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          search,
        })
        const res = await fetch(`${API_BASE}/api/report-files/${reportKey}?${params.toString()}`, {
          signal: controller.signal,
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'ดึงข้อมูลไม่สำเร็จ')
        setItems(Array.isArray(data.items) ? data.items : [])
        setTotal(Number(data.total || 0))
      } catch (e) {
        if (e.name !== 'AbortError') {
          setError(e.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล')
          setItems([])
          setTotal(0)
        }
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [page, pageSize, reportKey, search])

  const pageCount = Math.max(1, Math.ceil((total || 0) / pageSize))
  const canPrev = page > 1
  const canNext = page < pageCount
  const windowSize = 5
  let start = Math.max(1, page - Math.floor(windowSize / 2))
  let end = Math.min(pageCount, start + windowSize - 1)
  start = Math.max(1, Math.min(start, Math.max(1, end - windowSize + 1)))
  const pages = []
  for (let p = start; p <= end; p += 1) pages.push(p)

  const formatTime = (d) => d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (d) => d.toLocaleDateString('th-TH', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })

  const openCreateModal = () => {
    setEditingItem(null)
    setForm(createInitialForm(includePriceType))
    setShowForm(true)
  }

  const openEditModal = (item) => {
    setEditingItem(item)
    setForm({
      ...createInitialForm(includePriceType),
      price: item?.price ?? '',
      type: item?.type || 'new',
      detail: item?.detail || '',
      year: item?.year ?? '',
      file_type: item?.file_type || '',
      note: item?.note || '',
      file: null,
    })
    setShowForm(true)
  }

  const closeModal = () => {
    setShowForm(false)
    setEditingItem(null)
    setForm(createInitialForm(includePriceType))
  }

  const reloadItems = async () => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      search,
    })
    const res = await fetch(`${API_BASE}/api/report-files/${reportKey}?${params.toString()}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || 'ดึงข้อมูลไม่สำเร็จ')
    setItems(Array.isArray(data.items) ? data.items : [])
    setTotal(Number(data.total || 0))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!editingItem && !form.file) {
      showToast('กรุณาเลือกไฟล์ก่อนบันทึก', 'error')
      return
    }
    if (!form.file_type) {
      showToast('กรุณาระบุประเภทไฟล์', 'error')
      return
    }

    try {
      setSubmitting(true)
      const payload = new FormData()
      if (includePriceType) {
        payload.append('price', form.price ?? '')
        payload.append('type', form.type || 'new')
      }
      payload.append('detail', form.detail ?? '')
      payload.append('year', form.year ?? '')
      payload.append('file_type', form.file_type ?? '')
      payload.append('note', form.note ?? '')
      if (form.file) payload.append('file', form.file)

      const url = editingItem
        ? `${API_BASE}/api/report-files/${reportKey}/${editingItem.id}`
        : `${API_BASE}/api/report-files/${reportKey}`
      const method = editingItem ? 'PUT' : 'POST'

      const res = await fetch(url, { method, body: payload })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'บันทึกข้อมูลไม่สำเร็จ')

      closeModal()
      await reloadItems()
      showToast(editingItem ? 'อัปเดตรายการเรียบร้อยแล้ว' : 'เพิ่มรายการเรียบร้อยแล้ว')
    } catch (err) {
      showToast(err.message || 'บันทึกข้อมูลไม่สำเร็จ', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (item) => {
    const confirmed = window.confirm(`ต้องการลบรายการ ${item.id} ใช่หรือไม่?`)
    if (!confirmed) return

    try {
      const res = await fetch(`${API_BASE}/api/report-files/${reportKey}/${item.id}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'ลบข้อมูลไม่สำเร็จ')
      if (items.length === 1 && page > 1) {
        setPage((prev) => Math.max(1, prev - 1))
      } else {
        await reloadItems()
      }
      showToast('ลบรายการเรียบร้อยแล้ว')
    } catch (err) {
      showToast(err.message || 'ลบข้อมูลไม่สำเร็จ', 'error')
    }
  }

  return (
    <>
      <header className="header">
        <div className="header-content">
          <div className="brand-section">
            <button
              className="sidebar-toggle"
              aria-label={sidebarCollapsed ? 'ขยายแถบเมนู' : 'ยุบแถบเมนู'}
              title={sidebarCollapsed ? 'ขยายแถบเมนู' : 'ยุบแถบเมนู'}
              onClick={() => setSidebarCollapsed((prev) => !prev)}
            >
              <span aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" fill="currentColor" />
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
                  <button className="logout-btn power" onClick={onLogout} aria-label="ออกจากระบบ" title="ออกจากระบบ">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13 3h-2v10h2V3z" fill="currentColor" />
                      <path d="M17.83 5.17l-1.41 1.41A7 7 0 1112 19a7 7 0 01-4.41-12.42L6.17 5.17A9 9 0 1021 12a8.96 8.96 0 00-3.17-6.83z" fill="currentColor" />
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
          active={activeMenu}
          collapsed={sidebarCollapsed}
          onNavigate={(key) => navigateByMenuKey(navigate, key)}
        />

        <main className="main-content fade-in" style={{ paddingTop: '0.5rem' }}>
          <header className="content-header" style={{ marginTop: 0, paddingBottom: '0.5rem', borderBottom: '1px solid var(--border, #e5e7eb)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ margin: 0 }}>{title}</h2>
                <div className="muted" style={{ fontSize: '0.85rem' }}>{subtitle}</div>
              </div>
              <div className="header-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
                      onClick={() => {
                        setSearch('')
                        setTimeout(() => searchRef.current && searchRef.current.focus(), 0)
                      }}
                    >
                      <span className="btn-icon" aria-hidden>x</span>
                    </button>
                  )}
                </div>
                <button className="btn small primary" onClick={openCreateModal}>
                  เพิ่มรายการ
                </button>
                <span className="badge" style={{ background: '#F3F4F6', color: '#111827', padding: '6px 10px', borderRadius: 8 }}>
                  {total} items
                </span>
              </div>
            </div>
          </header>

          {toast.show && (
            <div className={`toast ${toast.type}`} role="status" style={{ marginTop: '0.75rem' }}>
              {toast.message}
            </div>
          )}

          <section className="panel license-table" style={{ marginTop: '0.75rem' }}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 70 }}>#</th>
                    {includePriceType && <th>Price</th>}
                    {includePriceType && <th>Type</th>}
                    <th>Detail</th>
                    <th style={{ width: 100 }}>Year</th>
                    <th style={{ width: 100 }}>File Type</th>
                    <th>Note</th>
                    <th style={{ width: 180 }}>Created At</th>
                    <th style={{ width: 200 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={includePriceType ? 9 : 7} className="empty">กำลังโหลด...</td></tr>
                  ) : error ? (
                    <tr><td colSpan={includePriceType ? 9 : 7} className="empty">{error}</td></tr>
                  ) : items.length === 0 ? (
                    <tr><td colSpan={includePriceType ? 9 : 7} className="empty">ไม่พบข้อมูล</td></tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={item.id}>
                        <td>{idx + 1 + (page - 1) * pageSize}</td>
                        {includePriceType && <td>{item.price != null ? priceFormatter.format(item.price) : '-'}</td>}
                        {includePriceType && <td>{item.type || '-'}</td>}
                        <td>{item.detail || '-'}</td>
                        <td>{item.year ?? '-'}</td>
                        <td>{item.file_type || '-'}</td>
                        <td>{item.note || '-'}</td>
                        <td>{formatCreatedAt(item.created_at)}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="btn small icon-round"
                              title="ดาวน์โหลดไฟล์"
                              onClick={() => {
                                if (item.download_url) {
                                  window.open(`${API_BASE}${item.download_url}`, '_blank')
                                }
                              }}
                              disabled={!item.download_url}
                            >
                              <span className="btn-icon" aria-hidden>↓</span>
                            </button>
                            <button type="button" className="btn small icon-round" title="แก้ไข" onClick={() => openEditModal(item)}>
                              <span className="btn-icon" aria-hidden>✎</span>
                            </button>
                            <button type="button" className="btn small icon-round danger" title="ลบ" onClick={() => handleDelete(item)}>
                              <span className="btn-icon" aria-hidden>🗑</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <div className="size-group">
                <span className="muted">แถวต่อหน้า</span>
                <select className="select" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value, 10) || 10); setPage(1) }}>
                  {[10, 20, 50, 100].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                <span className="muted d-none-mobile">ทั้งหมด {total} แถว</span>
                <span className="muted d-none-mobile">หน้า {page} / {pageCount}</span>
              </div>
              <div className="page-group">
                <button className="btn small ghost page-num" onClick={() => setPage(1)} disabled={!canPrev} title="หน้าแรก">&laquo;</button>
                <button className="btn small ghost page-num" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={!canPrev} title="ก่อนหน้า">‹</button>
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
                <button className="btn small ghost page-num" onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))} disabled={!canNext} title="ถัดไป">›</button>
                <button className="btn small ghost page-num" onClick={() => setPage(pageCount)} disabled={!canNext} title="หน้าสุดท้าย">&raquo;</button>
              </div>
            </div>
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

      <FileFormModal
        open={showForm}
        title={editingItem ? `แก้ไข ${title}` : `เพิ่ม ${title}`}
        includePriceType={includePriceType}
        form={form}
        setForm={setForm}
        submitting={submitting}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </>
  )
}


