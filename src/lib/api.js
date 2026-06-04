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
      // Fire event — App.jsx clears user → React Router redirects to /login
      // Never use window.location.href here (causes infinite reload on /login)
      window.dispatchEvent(new CustomEvent('pbbd:logout'))
      return null
    }

    if (res.status === 403) {
      getToast()?.('আপনার এই কাজের অনুমতি নেই', 'error')
      return null
    }

    return { ok: res.ok, status: res.status, data }
  } catch {
    // Network error — don't toast on session check (called silently on load)
    return null
  }
}

export { API_BASE, apiFetch }
