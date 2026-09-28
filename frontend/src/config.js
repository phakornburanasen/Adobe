// Frontend runtime API base configuration
// Prefer Vite env VITE_API_BASE (should be origin only), else fall back to backend origin
// Example .env: VITE_API_BASE=http://10.0.32.71:5000
// NOTE: Do NOT include '/api' or other paths here; the app appends '/api/...'
const rawBase = (import.meta?.env?.VITE_API_BASE || `http://${window.location.hostname}:8000/api/adobe`).trim()
export const API_BASE = rawBase.replace(/\/$/, '')
