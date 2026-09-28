import { useState, useEffect } from 'react'

export default function AddLicense({ open, onClose, onSave, saving, departments = [], licenseTypes = [] }) {
  const [form, setForm] = useState({
    emp_id: '',
    full_name: '',
    disp_name: '',
    name_email: '',
    depart_id: '',
    cost_center: '',
    license_id: '',
    nick_name: '',
  })

  useEffect(() => {
    if (!open) {
      setForm({
        emp_id: '',
        full_name: '',
        disp_name: '',
        name_email: '',
        depart_id: '',
        cost_center: '',
        license_id: '',
        nick_name: '',
      })
    }
  }, [open])

  if (!open) return null

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    // Minimal required validation
    if (!form.emp_id || !form.name_email) {
      alert('กรุณากรอก รหัสพนักงาน และ อีเมล')
      return
    }
    onSave(form)
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3>
            <span className="hdr-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 13H5v-2h14v2zm0 6H5v-2h14v2zM5 7h14V5H5v2z" fill="currentColor"/>
              </svg>
            </span>
            เพิ่มไลเซนส์
          </h3>
          <button className="logout-btn power" onClick={onClose} disabled={saving} title="ปิด" aria-label="ปิด">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 3h-2v8h2V3z" fill="currentColor"/>
              <path d="M12 21a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 110-12 6 6 0 010 12z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body grid-2">
            <label>
              <span>รหัสพนักงาน (จำเป็น)</span>
              <div className="input-with-icon">
                <span className="prefix-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" fill="currentColor"/>
                    <path d="M4 20c0-2.76 3.58-5 8-5s8 2.24 8 5v1H4v-1z" fill="currentColor"/>
                  </svg>
                </span>
                <input type="text" value={form.emp_id} onChange={(e)=>update('emp_id', e.target.value)} disabled={saving} />
              </div>
            </label>
            <label>
              <span>ชื่อ-สกุล</span>
              <div className="input-with-icon">
                <span className="prefix-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" fill="currentColor"/>
                    <path d="M4 20c0-2.76 3.58-5 8-5s8 2.24 8 5v1H4v-1z" fill="currentColor"/>
                  </svg>
                </span>
                <input type="text" value={form.full_name} onChange={(e)=>update('full_name', e.target.value)} disabled={saving} />
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
                <input type="text" value={form.disp_name} onChange={(e)=>update('disp_name', e.target.value)} disabled={saving} />
              </div>
            </label>
            <label>
              <span>อีเมล (จำเป็น)</span>
              <div className="input-with-icon">
                <span className="prefix-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" fill="currentColor"/>
                  </svg>
                </span>
                <input type="email" value={form.name_email} onChange={(e)=>update('name_email', e.target.value)} disabled={saving} />
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
                  value={form.depart_id}
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
                <input type="text" value={form.cost_center} onChange={(e)=>update('cost_center', e.target.value)} disabled={saving} />
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
                  value={form.license_id}
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
                <input type="text" value={form.nick_name} onChange={(e)=>update('nick_name', e.target.value)} disabled={saving} />
              </div>
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose} disabled={saving}>ยกเลิก</button>
            <button type="submit" className="btn primary" disabled={saving} aria-busy={saving}>
              <span className="btn-icon" aria-hidden>{saving ? '⏳' : '💾'}</span>
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
