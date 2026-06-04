import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api.js'
import { t } from '../lib/i18n.js'

export default function TopupSuccess() {
  const navigate = useNavigate()
  const [state, setState] = useState('loading')
  const [newBalance, setNewBalance] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const path = `/api/topup/success?${params.toString()}`
    apiFetch(path).then((res) => {
      if (!res || !res.ok) { setState('error'); return }
      if (res.data.payment_status === 'COMPLETED') {
        setNewBalance(res.data.balance ?? null)
        setState('success')
      } else {
        setState('pending')
      }
    })
  }, [])

  const configs = {
    loading: {
      icon: <Spinner />,
      title: t('paymentVerifying'),
      sub: null,
      btn: null,
    },
    success: {
      icon: <CheckIcon />,
      title: t('paymentSuccess'),
      sub: newBalance != null ? `${t('newBalance')}: ৳${newBalance.toLocaleString('bn-BD')}` : null,
      btn: { label: t('goHome'), action: () => navigate('/') },
    },
    pending: {
      icon: <ClockIcon />,
      title: t('paymentPending'),
      sub: t('pendingNote'),
      btn: { label: t('goHome'), action: () => navigate('/') },
    },
    error: {
      icon: <XIcon />,
      title: t('paymentFailed'),
      sub: null,
      btn: { label: t('tryAgain'), action: () => navigate('/wallet') },
    },
  }

  const c = configs[state]

  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm card text-center space-y-4 page-enter">
        <div className="flex justify-center">{c.icon}</div>
        <h1 className="font-display font-bold text-xl text-text">{c.title}</h1>
        {c.sub && <p className="text-muted text-sm font-body">{c.sub}</p>}
        {c.btn && (
          <button onClick={c.btn.action} className="btn-primary">
            {c.btn.label}
          </button>
        )}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="w-16 h-16 rounded-full border-4 border-surface2 border-t-accent animate-spin" />
  )
}

function CheckIcon() {
  return (
    <div className="w-16 h-16 rounded-full bg-accent/10 border-2 border-accent flex items-center justify-center animate-scale-in">
      <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  )
}

function ClockIcon() {
  return (
    <div className="w-16 h-16 rounded-full bg-warning/10 border-2 border-warning flex items-center justify-center">
      <span className="text-3xl">⏳</span>
    </div>
  )
}

function XIcon() {
  return (
    <div className="w-16 h-16 rounded-full bg-danger/10 border-2 border-danger flex items-center justify-center">
      <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  )
}
