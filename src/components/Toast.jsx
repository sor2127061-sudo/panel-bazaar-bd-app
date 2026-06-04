import { useStore } from '../lib/store.js'

const icons = {
  success: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

const styles = {
  success: 'border-accent/30 bg-accent/10 text-accent',
  error: 'border-danger/30 bg-danger/10 text-danger',
  info: 'border-blue-400/30 bg-blue-400/10 text-blue-400',
}

export default function Toast() {
  const { toast, clearToast } = useStore()
  if (!toast) return null

  return (
    <div
      key={toast.id}
      onClick={clearToast}
      className={`fixed bottom-20 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-card border cursor-pointer animate-slide-in shadow-lg max-w-xs ${styles[toast.type] || styles.info}`}
    >
      {icons[toast.type]}
      <span className="text-sm font-body font-medium">{toast.message}</span>
    </div>
  )
}
