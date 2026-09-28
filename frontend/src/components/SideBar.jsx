import React from 'react'

export default function SideBar({ active = 'licenses', onNavigate = () => {}, collapsed = false }) {
  const items = [
    { key: 'dashboard', label: 'Dashboard', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
      </svg>
    ) },
    { key: 'licenses', label: 'Licenses', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v12a4 4 0 004 4h12c1.1 0 2-.9 2-2V5a2 2 0 00-2-2zm0 14H7a2 2 0 01-2-2V5h14v12z" fill="currentColor"/>
        <path d="M9 7h6v2H9V7zm0 4h6v2H9v-2z" fill="currentColor"/>
      </svg>
    ) },
    { key: 'reports', label: 'Reports', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3h18v2H3V3zm2 4h14v14H5V7zm4 3v8h2v-8H9zm4 4v4h2v-4h-2z" fill="currentColor"/>
      </svg>
    ) },
    { key: 'settings', label: 'Settings', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19.14 12.94a7.994 7.994 0 000-1.88l2.03-1.58a.5.5 0 00.12-.65l-1.92-3.32a.5.5 0 00-.6-.22l-2.39.96a7.973 7.973 0 00-1.62-.94l-.36-2.54A.5.5 0 0012.5 0h-4a.5.5 0 00-.5.42l-.36 2.54a7.973 7.973 0 00-1.62.94l-2.39-.96a.5.5 0 00-.6.22L.71 6.03a.5.5 0 00.12.65l2.03 1.58c-.05.31-.08.63-.08.95s.03.64.08.95l-2.03 1.58a.5.5 0 00-.12.65l1.92 3.32c.14.24.43.34.69.22l2.39-.96c.5.38 1.04.69 1.62.94l.36 2.54c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.36-2.54c.58-.25 1.12-.56 1.62-.94l2.39.96c.26.1.55 0 .69-.22l1.92-3.32a.5.5 0 00-.12-.65l-2.03-1.58zM10.5 16a4 4 0 110-8 4 4 0 010 8z" fill="currentColor"/>
      </svg>
    ) },
  ]

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} aria-label="Side Navigation">
      <div className="sidebar-header">{collapsed ? ' ' : 'Adobe'}</div>
      <nav className="sidebar-nav">
        {items.map((it) => (
          <button
            key={it.key}
            className={`nav-item ${active === it.key ? 'active' : ''}`}
            onClick={() => onNavigate(it.key)}
            title={it.label}
          >
            <span className="nav-icon" aria-hidden>{it.icon}</span>
            <span className="nav-label">{it.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
