import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api.js'
import { useStore } from '../lib/store.js'
import { t } from '../lib/i18n.js'
import CountUp from '../components/CountUp.jsx'

const MFS_OPTIONS = [
  { id: 'BKASH', label: 'bKash', color: '#E2136E', emoji: '💳' },
  { id: 'NAGAD', label: 'Nagad', color: '#F6821F', emoji: '🏦' },
  { id: 'ROCKET', label: 'Rocket', color: '#8B3F9E', emoji: '🚀' },
]

export default function Wallet() {
  const { user, showToast, lang } = useStore()
  const [balance, setBalance] = useState(user?.wallet_balance || 0)
  const [amount, setAmount] = useState('')
  const [mfs, setMfs] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    apiFetch('/api/wallet/balance').then((res) => {
      if (res?.ok) setBalance(res.data.balance)
      setFetching(false)
    })
  }, [])

  const amountNum = Number(amount)
  const amountValid = amountNum >= 10 && amountNum <= 50000
  const canSubmit = amountValid && mfs && !loading

  async function handleTopup(e) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    const res = await apiFetch('/api/wallet/topup', {
      method: 'POST',
      body: JSON.stringify({ amount: amountNum, mfs_type: mfs }),
    })
    setLoading(false)
    if (!res) return
    if (res.ok && res.data.checkout_url) {
      window.location.href = res.data.checkout_url
    } else {
      showToast(res.data?.error || 'টপ-আপ শুরু করা যায়নি', 'error')
    }
  }

  return (
    <div className="min-h-dvh bg-bg pb-24 page-enter">
      <header className="px-4 pt-6 pb-4 max-w-2xl mx-auto">
        <h1 className="font-display font-bold text-xl text-text">{t('wallet')}</h1>
      </header>

      <div className="px-4 max-w-2xl mx-auto space-y-4">
        <div className="card bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <p className="text-muted text-xs font-body uppercase tracking-wide mb-1">{t('yourBalance')}</p>
          <div className="font-display font-bold text-3xl text-accent">
            {fetching ? (
              <div className="shimmer h-8 w-28 rounded" />
            ) : (
              <CountUp value={balance} duration={800} />
            )}
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-display font-semibold text-base text-text">{t('topup')}</h2>
          <form onSubmit={handleTopup} className="space-y-4">
            <div>
              <label className="label">{t('amount')}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-accent font-display font-semibold text-sm">৳</span>
                <input
                  type="number"
                  className="input-field pl-7"
                  placeholder="১০ – ৫০,০০০"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="10"
                  max="50000"
                />
              </div>
              {amount && !amountValid && (
                <p className="text-xs text-danger mt-1 font-body">
                  {amountNum < 10 ? t('minAmount') : t('maxAmount')}
                </p>
              )}
            </div>

            <div>
              <label className="label">{t('selectMFS')}</label>
              <div className="grid grid-cols-3 gap-2">
                {MFS_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMfs(opt.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-card border transition-all ${
                      mfs === opt.id
                        ? 'border-accent/50 bg-accent/5 shadow-glow'
                        : 'border-white/10 bg-surface2 hover:border-white/20'
                    }`}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-xs font-body font-semibold text-text">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={!canSubmit}>
              {loading ? t('processing') : t('topup')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
