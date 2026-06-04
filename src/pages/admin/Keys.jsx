import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api.js'
import { useStore } from '../../lib/store.js'
import { t } from '../../lib/i18n.js'
import { formatDate } from '../../lib/utils.js'
import { SkeletonList } from '../../components/Skeleton.jsx'
import { ConfirmDialog } from '../../components/Modal.jsx'

const TYPES = ['TYPE_A', 'TYPE_B', 'TYPE_C']

export default function Keys() {
  const { showToast, lang } = useStore()
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [keys, setKeys] = useState([])
  const [keysLoading, setKeysLoading] = useState(false)
  const [uploadProduct, setUploadProduct] = useState('')
  const [uploadType, setUploadType] = useState('TYPE_A')
  const [keyText, setKeyText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    apiFetch('/api/admin/products').then((res) => {
      if (res?.ok) {
        const prods = res.data.products || []
        setProducts(prods)
        if (prods.length) { setSelectedProduct(prods[0].id); setUploadProduct(prods[0].id) }
      }
    })
  }, [])

  useEffect(() => {
    if (!selectedProduct) return
    setKeysLoading(true)
    apiFetch(`/api/admin/keys?product_id=${selectedProduct}`).then((res) => {
      if (res?.ok) setKeys(res.data.keys || [])
      setKeysLoading(false)
    })
  }, [selectedProduct])

  async function handleUpload() {
    const lines = keyText.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!lines.length || lines.length > 500) { showToast('১–৫০০ keys দিন', 'error'); return }
    setUploading(true)
    const res = await apiFetch('/api/admin/keys', {
      method: 'POST',
      body: JSON.stringify({ product_id: uploadProduct, type: uploadType, keys: lines }),
    })
    setUploading(false)
    if (res?.ok) {
      showToast(t('keyUploaded'), 'success')
      setKeyText('')
      if (uploadProduct === selectedProduct) {
        apiFetch(`/api/admin/keys?product_id=${selectedProduct}`).then((r) => { if (r?.ok) setKeys(r.data.keys || []) })
      }
    } else {
      showToast(res?.data?.error || 'Upload ব্যর্থ হয়েছে', 'error')
    }
  }

  async function handleDelete() {
    const res = await apiFetch(`/api/admin/keys/${deleteTarget.id}`, { method: 'DELETE' })
    if (res?.ok) {
      showToast('Key মুছে ফেলা হয়েছে', 'success')
      setKeys(keys.filter((k) => k.id !== deleteTarget.id))
    } else {
      showToast(res?.data?.error || 'মুছতে পারা যায়নি', 'error')
    }
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-5 page-enter">
      <h1 className="font-display font-bold text-xl text-text">{t('keys')}</h1>

      <div className="card space-y-4">
        <h2 className="font-display font-semibold text-base text-text">{t('uploadKeys')}</h2>
        <div>
          <label className="label">{t('selectProduct')}</label>
          <select className="input-field" value={uploadProduct} onChange={(e) => setUploadProduct(e.target.value)}>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Type</label>
          <div className="flex gap-2">
            {TYPES.map((ty) => (
              <button key={ty} type="button" onClick={() => setUploadType(ty)}
                className={`flex-1 py-2 rounded-input text-xs font-body font-semibold border transition-all ${uploadType === ty ? 'border-accent bg-accent/10 text-accent' : 'border-white/10 text-muted hover:border-white/20'}`}>
                {ty}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Keys (max 500, একটি করে line)</label>
          <textarea
            className="input-field resize-none h-32 font-mono text-xs"
            placeholder={t('keysPlaceholder')}
            value={keyText}
            onChange={(e) => setKeyText(e.target.value)}
          />
          <p className="text-muted text-xs mt-1 font-body">{keyText.split('\n').filter((l) => l.trim()).length} keys</p>
        </div>
        <button onClick={handleUpload} disabled={uploading || !keyText.trim()} className="btn-primary">
          {uploading ? t('processing') : t('upload')}
        </button>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-base text-text">Key List</h2>
          <select className="input-field w-auto text-xs py-1.5 px-3" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-body">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['ID', 'Type', 'Delivered', 'To', 'Date', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keysLoading ? (
                <tr><td colSpan={6}><SkeletonList count={5} /></td></tr>
              ) : keys.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted">কোনো key নেই</td></tr>
              ) : keys.map((key) => (
                <tr key={key.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-3 py-2 font-mono text-muted">{key.id.slice(0, 8)}…</td>
                  <td className="px-3 py-2 text-text">{key.type}</td>
                  <td className="px-3 py-2">
                    {key.is_delivered
                      ? <span className="text-accent">✅</span>
                      : <span className="text-muted">❌</span>}
                  </td>
                  <td className="px-3 py-2 text-muted max-w-[120px] truncate">{key.delivered_to || '—'}</td>
                  <td className="px-3 py-2 text-muted whitespace-nowrap">{formatDate(key.created_at)}</td>
                  <td className="px-3 py-2">
                    {!key.is_delivered && (
                      <button onClick={() => setDeleteTarget(key)} className="text-danger hover:text-danger/70 transition-colors">🗑️</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Key মুছুন"
        message={t('deleteConfirm')}
        confirmText={t('delete')}
        danger
      />
    </div>
  )
}
