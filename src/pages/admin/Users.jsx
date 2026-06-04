import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api.js'
import { useStore } from '../../lib/store.js'
import { t } from '../../lib/i18n.js'
import { formatDate } from '../../lib/utils.js'
import Modal from '../../components/Modal.jsx'
import { ConfirmDialog } from '../../components/Modal.jsx'
import { SkeletonList } from '../../components/Skeleton.jsx'

export default function Users() {
  const { showToast, user: currentUser, lang } = useStore()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [banTarget, setBanTarget] = useState(null)
  const [banAction, setBanAction] = useState(null)
  const [adjustTarget, setAdjustTarget] = useState(null)
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  function load() {
    setLoading(true)
    apiFetch('/api/admin/users').then((res) => {
      if (res?.ok) setUsers(res.data.users || [])
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  function openBan(u, ban) { setBanTarget(u); setBanAction(ban) }

  async function handleBan() {
    const res = await apiFetch(`/api/admin/users/${banTarget.id}/ban`, {
      method: 'PATCH',
      body: JSON.stringify({ ban: banAction }),
    })
    if (res?.ok) { showToast(banAction ? 'User banned' : 'User unbanned', 'success'); load() }
    else showToast(res?.data?.error || 'ব্যর্থ হয়েছে', 'error')
    setBanTarget(null)
  }

  async function handleAdjust() {
    const d = Number(delta)
    if (!delta || isNaN(d) || Math.abs(d) > 100000) { showToast('Delta ভুল', 'error'); return }
    if (reason.trim().length < 5) { showToast('কারণ কমপক্ষে ৫ অক্ষর', 'error'); return }
    setAdjusting(true)
    const res = await apiFetch(`/api/admin/users/${adjustTarget.id}/wallet`, {
      method: 'PATCH',
      body: JSON.stringify({ delta: d, reason: reason.trim() }),
    })
    setAdjusting(false)
    if (res?.ok) { showToast('Wallet adjust হয়েছে', 'success'); load(); setAdjustTarget(null) }
    else showToast(res?.data?.error || 'Adjust ব্যর্থ হয়েছে', 'error')
  }

  return (
    <div className="space-y-4 page-enter">
      <h1 className="font-display font-bold text-xl text-text">{t('users')}</h1>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Email', 'Balance', 'Status', 'Joined', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-muted text-xs uppercase tracking-wide font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5}><SkeletonList count={6} /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-muted">কোনো user নেই</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 max-w-[160px]">
                    <div className="truncate text-text text-xs">{u.email}</div>
                    {u.is_admin && <span className="badge text-[9px] bg-accent/10 text-accent border border-accent/20">Admin</span>}
                  </td>
                  <td className="px-4 py-3 text-accent font-medium whitespace-nowrap">৳{(u.wallet_balance || 0).toLocaleString('bn-BD')}</td>
                  <td className="px-4 py-3">
                    {u.is_banned
                      ? <span className="badge text-[10px] bg-danger/10 text-danger border border-danger/20">{t('banned')}</span>
                      : <span className="badge text-[10px] bg-accent/10 text-accent border border-accent/20">{t('active')}</span>}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.id !== currentUser?.id && (
                        <>
                          {u.is_banned
                            ? <button onClick={() => openBan(u, false)} className="text-xs py-1 px-2 rounded-btn bg-accent/10 text-accent border border-accent/20 hover:bg-accent hover:text-bg transition-all">{t('unbanUser')}</button>
                            : <button onClick={() => openBan(u, true)} className="text-xs py-1 px-2 rounded-btn bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 transition-all">{t('banUser')}</button>}
                        </>
                      )}
                      <button onClick={() => { setAdjustTarget(u); setDelta(''); setReason('') }} className="text-xs py-1 px-2 rounded-btn bg-surface2 text-muted border border-white/10 hover:border-white/20 hover:text-text transition-all">{t('adjustWallet')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!banTarget}
        onClose={() => setBanTarget(null)}
        onConfirm={handleBan}
        title={banAction ? t('banUser') : t('unbanUser')}
        message={banAction ? t('banConfirm') : t('unbanConfirm')}
        confirmText={banAction ? t('banUser') : t('unbanUser')}
        danger={banAction}
      />

      <Modal open={!!adjustTarget} onClose={() => setAdjustTarget(null)} title={t('adjustWallet')} size="sm">
        {adjustTarget && (
          <div className="space-y-4">
            <div className="bg-surface2 rounded-card p-3">
              <p className="text-muted text-xs font-body">User</p>
              <p className="text-text text-sm font-body font-medium mt-0.5">{adjustTarget.email}</p>
              <p className="text-muted text-xs font-body mt-2">বর্তমান balance</p>
              <p className="text-accent font-display font-bold text-lg">৳{(adjustTarget.wallet_balance || 0).toLocaleString('bn-BD')}</p>
            </div>
            <div>
              <label className="label">পরিমাণ (+ যোগ, - বিয়োগ, max ±100,000)</label>
              <input
                type="number"
                className="input-field"
                placeholder="যেমন: 500 বা -200"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                max={100000}
                min={-100000}
              />
            </div>
            <div>
              <label className="label">{t('reason')}</label>
              <textarea
                className="input-field resize-none h-20"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Manual adjustment reason..."
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAdjustTarget(null)} className="btn-ghost flex-1">{t('cancel')}</button>
              <button onClick={handleAdjust} disabled={adjusting} className="btn-primary flex-1">
                {adjusting ? t('processing') : t('apply')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
