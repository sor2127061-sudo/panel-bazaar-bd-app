export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('bn-BD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('bn-BD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function timeRemaining(iso) {
  const diff = new Date(iso) - new Date()
  if (diff <= 0) return null
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const parts = []
  if (d) parts.push(`${d} দিন`)
  if (h) parts.push(`${h} ঘন্টা`)
  if (!d && m) parts.push(`${m} মিনিট`)
  return parts.join(' ') || '< 1 মিনিট'
}

export function isExpired(iso) {
  return new Date(iso) <= new Date()
}

export function cheapestPrice(packages) {
  if (!packages?.length) return 0
  return Math.min(...packages.map((p) => p.price))
}

export function initials(email) {
  return (email || 'U').charAt(0).toUpperCase()
}

export function categoryColor(cat) {
  const map = {
    ROOT: 'text-accent bg-accent/10 border border-accent/20',
    NON_ROOT: 'text-blue-400 bg-blue-400/10 border border-blue-400/20',
    VIP: 'text-accent2 bg-accent2/10 border border-accent2/20',
  }
  return map[cat] || 'text-muted bg-white/5'
}

export function statusColor(status) {
  const map = {
    COMPLETED: 'text-accent bg-accent/10',
    PENDING: 'text-warning bg-warning/10',
    FAILED: 'text-danger bg-danger/10',
  }
  return map[status] || 'text-muted bg-white/5'
}
