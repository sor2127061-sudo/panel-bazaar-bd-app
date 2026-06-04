import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../../lib/api.js'
import { t } from '../../lib/i18n.js'
import { SkeletonText } from '../../components/Skeleton.jsx'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/admin/stats').then((res) => {
      if (res?.ok) setStats(res.data)
      setLoading(false)
    })
  }, [])

  const cards = stats ? [
    { label: t('todayRevenue'), value: `৳${stats.today_revenue?.toLocaleString('bn-BD') || 0}`, icon: '💰', color: 'text-accent' },
    { label: t('totalOrders'), value: stats.order_counts?.total || 0, icon: '🛒', color: 'text-blue-400' },
    { label: t('activeUsers'), value: stats.active_users || 0, icon: '👥', color: 'text-accent2' },
    { label: t('lowStockProducts'), value: stats.low_stock?.length || 0, icon: '⚠️', color: stats.low_stock?.length > 0 ? 'text-danger' : 'text-muted' },
  ] : []

  const quickLinks = [
    { to: '/admin/products', label: t('products'), icon: '📦' },
    { to: '/admin/keys', label: t('keys'), icon: '🔑' },
    { to: '/admin/orders', label: t('orders'), icon: '🛒' },
    { to: '/admin/users', label: t('users'), icon: '👥' },
    { to: '/admin/audit-log', label: t('auditLog'), icon: '📋' },
  ]

  return (
    <div className="space-y-5 page-enter">
      <h1 className="font-display font-bold text-xl text-text">{t('dashboard')}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="card">
                <SkeletonText lines={2} />
              </div>
            ))
          : cards.map((card) => (
              <div key={card.label} className="card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">{card.icon}</span>
                </div>
                <p className={`font-display font-bold text-2xl ${card.color}`}>{card.value}</p>
                <p className="text-muted text-xs font-body mt-1">{card.label}</p>
              </div>
            ))}
      </div>

      {stats?.order_counts && (
        <div className="card">
          <h2 className="font-display font-semibold text-sm text-text mb-3">Order Breakdown</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { k: 'pending', label: 'Pending', color: 'text-warning' },
              { k: 'completed', label: 'Completed', color: 'text-accent' },
              { k: 'failed', label: 'Failed', color: 'text-danger' },
            ].map(({ k, label, color }) => (
              <div key={k} className="text-center">
                <p className={`font-display font-bold text-xl ${color}`}>{stats.order_counts[k] || 0}</p>
                <p className="text-muted text-xs font-body">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats?.low_stock?.length > 0 && (
        <div className="card border-danger/20">
          <h2 className="font-display font-semibold text-sm text-danger mb-3">⚠️ {t('lowStockProducts')}</h2>
          <div className="space-y-2">
            {stats.low_stock.map((p) => (
              <div key={p.id} className="flex justify-between items-center text-sm font-body">
                <span className="text-text">{p.name}</span>
                <span className="text-danger font-medium">{p.stock} left</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {quickLinks.map(({ to, label, icon }) => (
          <Link
            key={to}
            to={to}
            className="card flex items-center gap-2.5 hover:border-accent/20 hover:shadow-glow-lg transition-all"
          >
            <span className="text-xl">{icon}</span>
            <span className="font-body font-medium text-sm text-text">{label}</span>
            <svg className="w-3.5 h-3.5 text-muted ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  )
}
