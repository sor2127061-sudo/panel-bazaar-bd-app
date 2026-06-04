const API_BASE = import.meta.env.VITE_API_BASE || 'https://marketplace-backend.sor2127061.workers.dev'

function getToast() {
  return window.__pbbd_toast__
}

async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const data = await res.json().catch(() => ({}))

    if (res.status === 401) {
      window.location.href = '/login'
      return null
    }

    if (res.status === 403) {
      getToast()?.('আপনার এই কাজের অনুমতি নেই', 'error')
      return null
    }

    return { ok: res.ok, status: res.status, data }
  } catch {
    getToast()?.('নেটওয়ার্ক সমস্যা হয়েছে', 'error')
    return null
  }
}

export { API_BASE, apiFetch }
