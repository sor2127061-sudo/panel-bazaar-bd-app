import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api.js'
import { useStore } from '../lib/store.js'
import { t } from '../lib/i18n.js'
import LangToggle from '../components/LangToggle.jsx'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cookieBlocked, setCookieBlocked] = useState(false)
  const { showToast, setUser, lang } = useStore()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setCookieBlocked(false)
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (!res) { setLoading(false); return }
    if (res.ok) {
      const session = await apiFetch('/api/auth/session')
      if (session?.ok) {
        setUser(session.data.user)
        setLoading(false)
        navigate('/', { replace: true })
      } else {
        setLoading(false)
        setCookieBlocked(true)
      }
    } else {
      setLoading(false)
      const msg = res.status === 403
        ? t('accountSuspended')
        : res.data?.error || 'লগইন ব্যর্থ হয়েছে'
      showToast(msg, 'error')
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-sm space-y-6 page-enter">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-accent font-display font-bold text-xl">P</span>
            </div>
            <h1 className="font-display font-bold text-2xl text-text">{t('appName')}</h1>
            <p className="text-muted text-sm font-body mt-1">{t('tagline')}</p>
          </div>
          <LangToggle className="self-start" />
        </div>

        {cookieBlocked && (
          <div className="bg-danger/10 border border-danger/20 rounded-card p-4 space-y-2">
            <p className="text-danger text-xs font-body font-semibold">⚠️ Cookie Blocked (CORS/SameSite Issue)</p>
            <p className="text-muted text-[11px] font-body leading-relaxed">
              লগইন সফল হয়েছে কিন্তু ব্রাউজার আপনার auth cookie ব্লক করেছে। আপনার backend-এ <b>SameSite=None; Secure</b> সেট করা নেই অথবা CORS preflight-এ headers মিসিং। অনুগ্রহ করে নিচের নির্দেশনা অনুযায়ী Worker-টি আপডেট করুন।
            </p>
          </div>
        )}

        <div className="card space-y-4">
          <h2 className="font-display font-semibold text-lg text-text">{t('login')}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('email')}</label>
              <input
                type="email"
                className="input-field"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">{t('password')}</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
                >
                  {showPw ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? t('processing') : t('login')}
            </button>
          </form>
          <p className="text-center text-sm text-muted font-body">
            <Link to="/register" className="text-accent hover:underline">
              {t('noAccount')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
