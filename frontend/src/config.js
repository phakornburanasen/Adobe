// Frontend runtime API base configuration
// API_BASE is the existing Flask backend for business data.
// AUTH_API_BASE is the dedicated Go auth service for login/logout.
const rawBase = (import.meta?.env?.VITE_API_BASE || `http://${window.location.hostname}:8000/api/adobe`).trim()
const rawAuthBase = (import.meta?.env?.VITE_AUTH_API_BASE || `http://${window.location.hostname}:8000/api/adobe_auth`).trim()

export const API_BASE = rawBase.replace(/\/$/, '')
export const AUTH_API_BASE = rawAuthBase.replace(/\/$/, '')
