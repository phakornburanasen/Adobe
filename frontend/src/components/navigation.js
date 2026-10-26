export const MENU_HASHES = {
  dashboard: '#Dashboard',
  licenses: '#Licenses',
  reports: '#Reports',
  priceRenewHistory: '#PriceRenewHistory',
  renewalSummary: '#RenewalSummary',
  settings: '#Settings',
}

export function navigateByMenuKey(navigate, key) {
  const hash = MENU_HASHES[key]
  if (typeof navigate !== 'function' || !hash) return
  navigate('/ADOBE/')
  try { window.location.hash = hash } catch {}
}
