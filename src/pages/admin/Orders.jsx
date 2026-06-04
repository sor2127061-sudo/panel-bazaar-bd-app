import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api.js'
import { useStore } from '../../lib/store.js'
import { t } from '../../lib/i18n.js'
import { formatDate, statusColor } from '../../lib/utils.js'
import { SkeletonList } from '../../components/Skeleton.jsx'
import { ConfirmDialog } from '../../components/Modal.jsx'

const STATUSES = ['all', 'PENDING', 'COMPLETED', 'FAILED']

export default function AdminOrders() {
  const { showToast, lang } = useStore()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('all')
  const [fulfillTarget, setFulfillTarget] = useState(null)

  function load(s) {
    setLoading(true)
    const path = s === 'all' ? '/api/admin/orders' : `/api/admin/orders?status=${s}`
    apiFetch(path).then((res) => {
      if (res?.ok) setOrders(res.data.orders || [])
      setLoading(false)
    })
  }

  useEffect(() => { load(status) }, [status])

  async function handleFulfill() {
    const res = await apiFetch(`/api/admin/orders/${fulfillTarget.id}/fulfill`, { method: 'PATCH' })
    if (res?.ok) { showToast('Order fulfill হয়েছে', 'success'); load(status) }
    else showToast(res?.data?.error || 'Fulfill ব্যর্থ হয়েছে', 'error')
    setFulfillTarget(null)
  }

  return (
    <div className="space-y-4 page-enter">
      <h1 className="font-display font-bold text-xl text-text">{t('orders')}</h1>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-body font-semibold transition-all border ${
              status === s
                ? 'bg-accent text-bg border-accent'
                : 'bg-transparent text-muted border-white/10 hover:border-white/20 hover:text-text'
            }`}
          >
            {s === 'all' ? t('all') : s}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['User', 'Product', 'Amount', 'Status', 'Date', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-muted text-xs uppercase tracking-wide font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6}><SkeletonList count={6} /></td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-muted">কোনো order নেই</td></tr>
              ) : orders.map((order) => (
                <tr key={order.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 max-w-[140px]">
                    <span className="truncate block text-text text-xs">{order.user_email || order.users?.email || '—'}</span>
                  </td>
                  <td className="px-4 py-3 max-w-[140px]">
                    <span className="truncate block text-muted text-xs">{order.products?.name || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-accent font-medium whitespace-nowrap">৳{order.amount_paid?.toLocaleString('bn-BD')}</td>
                  <td className="px-4 py-3">
                    <span className={`badge text-[10px] ${statusColor(order.status)}`}>{order.status}</span>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-3">
                    {order.status === 'PENDING' && (
                      <button
                        onClick={() => setFulfillTarget(order)}
                        className="text-xs py-1.5 px-3 rounded-btn font-body font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent hover:text-bg transition-all"
                      >
                        {t('fulfill')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!fulfillTarget}
        onClose={() => setFulfillTarget(null)}
        onConfirm={handleFulfill}
        title="Order Fulfill"
        message={t('fulfillConfirm')}
        confirmText={t('fulfill')}
      />
    </div>
  )
}
