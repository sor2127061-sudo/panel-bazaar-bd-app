import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api.js'
import { t } from '../../lib/i18n.js'
import { formatDateTime } from '../../lib/utils.js'
import { SkeletonList } from '../../components/Skeleton.jsx'

const LIMIT = 50

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [expanded, setExpanded] = useState(null)

  function load(off) {
    setLoading(true)
    apiFetch(`/api/admin/audit-log?limit=${LIMIT}&offset=${off}`).then((res) => {
      if (res?.ok) {
        const newLogs = res.data.logs || []
        setLogs(newLogs)
        setHasMore(newLogs.length === LIMIT)
      }
      setLoading(false)
    })
  }

  useEffect(() => { load(0) }, [])

  function prev() { const o = Math.max(0, offset - LIMIT); setOffset(o); load(o) }
  function next() { const o = offset + LIMIT; setOffset(o); load(o) }

  function prettyJSON(val) {
    try {
      const parsed = typeof val === 'string' ? JSON.parse(val) : val
      return JSON.stringify(parsed, null, 2)
    } catch {
      return String(val)
    }
  }

  return (
    <div className="space-y-4 page-enter">
      <h1 className="font-display font-bold text-xl text-text">{t('auditLog')}</h1>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Time', 'Admin', 'Action', 'Target', 'Details'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-muted text-xs uppercase tracking-wide font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5}><SkeletonList count={8} /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-muted">কোনো log নেই</td></tr>
              ) : logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer"
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  >
                    <td className="px-4 py-2.5 text-muted text-xs whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                    <td className="px-4 py-2.5 max-w-[120px]">
                      <span className="truncate block text-text text-xs">{log.admin_id?.slice(0, 8)}…</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-accent text-xs font-medium font-mono">{log.action}</span>
                    </td>
                    <td className="px-4 py-2.5 text-muted text-xs font-mono">
                      {log.target_id ? log.target_id.slice(0, 8) + '…' : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      {(log.old_value || log.new_value) && (
                        <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                          {expanded === log.id ? '▲' : '▼'} details
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded === log.id && (log.old_value || log.new_value) && (
                    <tr className="border-b border-white/[0.04] bg-surface2">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="grid grid-cols-2 gap-3">
                          {log.old_value && (
                            <div>
                              <p className="text-muted text-[10px] uppercase tracking-wide mb-1">Old</p>
                              <pre className="text-xs text-text bg-bg rounded-input p-2 overflow-x-auto font-mono">{prettyJSON(log.old_value)}</pre>
                            </div>
                          )}
                          {log.new_value && (
                            <div>
                              <p className="text-muted text-[10px] uppercase tracking-wide mb-1">New</p>
                              <pre className="text-xs text-accent bg-bg rounded-input p-2 overflow-x-auto font-mono">{prettyJSON(log.new_value)}</pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={prev}
          disabled={offset === 0 || loading}
          className="btn-ghost disabled:opacity-40"
        >
          ← {t('prev')}
        </button>
        <span className="text-muted text-xs font-body">Page {Math.floor(offset / LIMIT) + 1}</span>
        <button
          onClick={next}
          disabled={!hasMore || loading}
          className="btn-ghost disabled:opacity-40"
        >
          {t('next')} →
        </button>
      </div>
    </div>
  )
}
