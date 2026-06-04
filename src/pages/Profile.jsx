import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiFetch } from '../lib/api.js'
import { useStore } from '../lib/store.js'
import { t } from '../lib/i18n.js'
import { formatDate, initials } from '../lib/utils.js'
import LangToggle from '../components/LangToggle.jsx'

export default function Profile() {
  const { user, setUser, showToast, lang } = useStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    await apiFetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    navigate('/login', { replace: true })
  }

  if (!user) return null

  return (
    <div className="min-h-dvh bg-bg pb-24 page-enter">
      <header className="px-4 pt-6 pb-4 max-w-2xl mx-auto flex items-center justify-between">
        <h1 className="font-display font-bold text-xl text-text">{t('profile')}</h1>
        <LangToggle />
      </header>

      <div className="px-4 max-w-2xl mx-auto space-y-4">
        <div className="card flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-accent/10 border-2 border-accent/30 flex items-center justify-center shrink-0">
            <span className="font-display font-bold text-xl text-accent">{initials(user.email)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-body font-medium text-text text-sm truncate">{user.email}</p>
            <p className="text-muted text-xs font-body mt-0.5">{t('memberSince')}: {formatDate(user.created_at)}</p>
            {user.is_admin && (
              <span className="badge text-[10px] bg-accent/10 text-accent border border-accent/20 mt-1">Admin</span>
            )}
          </div>
        </div>

        <div className="card">
          <p className="text-muted text-xs font-body uppercase tracking-wide mb-1">{t('balance')}</p>
          <p className="font-display font-bold text-2xl text-accent">৳{(user.wallet_balance || 0).toLocaleString('bn-BD')}</p>
          <Link
            to="/wallet"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-body font-medium text-accent hover:underline"
          >
            {t('topup')} →
          </Link>
        </div>

        {user.is_admin && (
          <Link
            to="/admin"
            className="card flex items-center justify-between hover:border-accent/30 hover:shadow-glow-lg transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">⚙️</span>
              <span className="font-body font-medium text-sm text-text">{t('admin')} Panel</span>
            </div>
            <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        )}

        <button
          onClick={handleLogout}
          disabled={loading}
          className="btn-danger w-full py-3"
        >
          {loading ? t('processing') : t('logout')}
        </button>
      </div>
    </div>
  )
}
