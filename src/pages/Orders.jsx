import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api.js'
import { useStore } from '../lib/store.js'
import { t } from '../lib/i18n.js'
import { formatDate, statusColor, isExpired, timeRemaining } from '../lib/utils.js'
import Modal from '../components/Modal.jsx'
import { SkeletonList } from '../components/Skeleton.jsx'

export default function Orders() {
  const { showToast, lang } = useStore()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [keyModal, setKeyModal] = useState(null)

  useEffect(() => {
    apiFetch('/api/orders/my').then((res) => {
      if (res?.ok) setOrders(res.data.orders || [])
      setLoading(false)
    })
  }, [])

  return (
    <div className="min-h-dvh bg-bg pb-24 page-enter">
      <header className="px-4 pt-6 pb-4 max-w-2xl mx-auto">
        <h1 className="font-display font-bold text-xl text-text">{t('myOrders')}</h1>
      </header>

      <div className="px-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="card space-y-0 p-0 overflow-hidden">
            <SkeletonList count={4} />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="text-4xl">📦</span>
            <p className="text-muted font-body text-sm">{t('noOrders')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order, i) => (
              <OrderCard
                key={order.id}
                order={order}
                delay={i * 50}
                onViewKey={() => setKeyModal(order)}
              />
            ))}
          </div>
        )}
      </div>

      {keyModal && (
        <KeyModal
          order={keyModal}
          onClose={() => setKeyModal(null)}
          showToast={showToast}
        />
      )}
    </div>
  )
}

function OrderCard({ order, delay, onViewKey }) {
  const canViewKey = order.status === 'COMPLETED' && !isExpired(order.expires_at)

  return (
    <div
      className="card space-y-3"
      style={{ opacity: 0, animation: `fadeUp 0.35s ease ${delay}ms forwards` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm text-text leading-tight truncate">
            {order.products?.name || '—'}
          </p>
          <p className="text-muted text-xs font-body mt-0.5">
            {order.product_packages?.duration_days} {t('days')}
          </p>
        </div>
        <span className={`badge shrink-0 ${statusColor(order.status)}`}>{order.status}</span>
      </div>

      <div className="flex items-center justify-between text-xs font-body">
        <div className="flex gap-3 text-muted">
          <span>৳{order.amount_paid?.toLocaleString('bn-BD')}</span>
          <span>{formatDate(order.created_at)}</span>
        </div>
        <span className={`text-xs ${isExpired(order.expires_at) ? 'text-danger' : 'text-muted'}`}>
          {t('expires')}: {formatDate(order.expires_at)}
        </span>
      </div>

      {canViewKey && (
        <button
          onClick={onViewKey}
          className="w-full py-2 px-4 rounded-btn text-xs font-body font-semibold bg-accent/10 text-accent border border-accent/20 hover:bg-accent hover:text-bg transition-all duration-200"
        >
          {t('viewKey')}
        </button>
      )}
    </div>
  )
}

function KeyModal({ order, onClose, showToast }) {
  const [keyData, setKeyData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    apiFetch(`/api/orders/keys/deliver?order_id=${order.id}`).then((res) => {
      if (res?.ok) {
        setKeyData(res.data)
        setRemaining(timeRemaining(res.data.expires_at) || '')
      } else if (res?.status === 410) {
        setError(t('keyExpired'))
      } else if (res?.status === 404) {
        setError(t('keyNotReady'))
      } else {
        setError('Key লোড করা যায়নি')
      }
      setLoading(false)
    })
  }, [order.id])

  useEffect(() => {
    if (!keyData?.expires_at) return
    const interval = setInterval(() => {
      setRemaining(timeRemaining(keyData.expires_at) || '')
    }, 60000)
    return () => clearInterval(interval)
  }, [keyData])

  async function handleCopy() {
    await navigator.clipboard.writeText(keyData.content)
    showToast(t('copied'), 'success')
  }

  return (
    <Modal open onClose={onClose} title={t('yourLicenseKey')} size="md">
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 rounded-full border-2 border-surface2 border-t-accent animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-6">
          <p className="text-danger text-sm font-body">{error}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-bg rounded-input p-4 border border-white/10">
            <p className="font-mono text-accent text-sm break-all leading-relaxed tracking-wider">
              {keyData.content}
            </p>
          </div>
          <button onClick={handleCopy} className="btn-primary">
            {t('copyKey')}
          </button>
          <div className="space-y-1 text-xs font-body text-muted">
            <p>{t('expires')}: {formatDate(keyData.expires_at)}</p>
            {remaining && <p>⏱ {t('remaining')}: {remaining}</p>}
          </div>
        </div>
      )}
    </Modal>
  )
}
