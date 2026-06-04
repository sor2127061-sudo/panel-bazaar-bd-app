import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api.js'
import { useStore } from '../../lib/store.js'
import { t } from '../../lib/i18n.js'
import { categoryColor } from '../../lib/utils.js'
import Modal from '../../components/Modal.jsx'
import { ConfirmDialog } from '../../components/Modal.jsx'
import { SkeletonList } from '../../components/Skeleton.jsx'

const CATEGORIES = ['ROOT', 'NON_ROOT', 'VIP']
const TYPES = ['TYPE_A', 'TYPE_B', 'TYPE_C']
const DURATIONS = [1, 3, 7, 15, 30]

const emptyForm = { name: '', description: '', category: 'ROOT', type: 'TYPE_A', thumbnail_url: '', video_url: '', notice: '', is_visible: true }

export default function Products() {
  const { showToast, lang } = useStore()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [pkgModal, setPkgModal] = useState(null)

  function load() {
    setLoading(true)
    apiFetch('/api/admin/products').then((res) => {
      if (res?.ok) setProducts(res.data.products || [])
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  function openNew() { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  function openEdit(p) { setEditing(p); setForm({ name: p.name, description: p.description || '', category: p.category, type: p.type, thumbnail_url: p.thumbnail_url || '', video_url: p.video_url || '', notice: p.notice || '', is_visible: p.is_visible }); setModalOpen(true) }

  async function handleSave() {
    if (!form.name.trim()) { showToast('নাম দিতে হবে', 'error'); return }
    setSaving(true)
    const res = editing
      ? await apiFetch(`/api/admin/products/${editing.id}`, { method: 'PATCH', body: JSON.stringify(form) })
      : await apiFetch('/api/admin/products', { method: 'POST', body: JSON.stringify(form) })
    setSaving(false)
    if (res?.ok) { showToast('প্রোডাক্ট সংরক্ষিত হয়েছে', 'success'); setModalOpen(false); load() }
    else showToast(res?.data?.error || 'সংরক্ষণ ব্যর্থ হয়েছে', 'error')
  }

  async function handleDelete() {
    const res = await apiFetch(`/api/admin/products/${deleteTarget.id}`, { method: 'DELETE' })
    if (res?.ok) { showToast('মুছে ফেলা হয়েছে', 'success'); load() }
    else showToast(res?.data?.error || 'মুছতে পারা যায়নি', 'error')
  }

  async function toggleVisible(p) {
    await apiFetch(`/api/admin/products/${p.id}`, { method: 'PATCH', body: JSON.stringify({ is_visible: !p.is_visible }) })
    load()
  }

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-xl text-text">{t('products')}</h1>
        <button onClick={openNew} className="btn-primary w-auto py-2 px-4 text-sm">{t('newProduct')}</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['নাম', 'Category', 'Type', t('visible'), ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-muted text-xs uppercase tracking-wide font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5}><SkeletonList count={5} /></td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-muted">{t('noProducts')}</td></tr>
              ) : products.map((p) => (
                <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-text font-medium max-w-[160px] truncate">{p.name}</td>
                  <td className="px-4 py-3">
                    <span className={`badge text-[10px] ${categoryColor(p.category)}`}>{p.category}</span>
                  </td>
                  <td className="px-4 py-3 text-muted">{p.type}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleVisible(p)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${p.is_visible ? 'bg-accent' : 'bg-surface2 border border-white/10'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${p.is_visible ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPkgModal(p)} className="text-muted hover:text-blue-400 transition-colors text-xs">📦 PKG</button>
                      <button onClick={() => openEdit(p)} className="text-muted hover:text-accent transition-colors">✏️</button>
                      <button onClick={() => setDeleteTarget(p)} className="text-muted hover:text-danger transition-colors">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('edit') : t('newProduct')} size="lg">
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="label">নাম *</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input-field resize-none h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Category *</label>
            <div className="flex gap-2">
              {CATEGORIES.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, category: c })}
                  className={`flex-1 py-2 rounded-input text-xs font-body font-semibold border transition-all ${form.category === c ? 'border-accent bg-accent/10 text-accent' : 'border-white/10 text-muted hover:border-white/20'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Type *</label>
            <div className="flex gap-2">
              {TYPES.map((ty) => (
                <button key={ty} type="button" onClick={() => setForm({ ...form, type: ty })}
                  className={`flex-1 py-2 rounded-input text-xs font-body font-semibold border transition-all ${form.type === ty ? 'border-accent bg-accent/10 text-accent' : 'border-white/10 text-muted hover:border-white/20'}`}>
                  {ty}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Thumbnail URL</label>
            <input className="input-field" value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="https://..." />
          </div>
          <div>
            <label className="label">Video URL</label>
            <input className="input-field" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://..." />
          </div>
          <div>
            <label className="label">Notice</label>
            <textarea className="input-field resize-none h-16" value={form.notice} onChange={(e) => setForm({ ...form, notice: e.target.value })} />
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setForm({ ...form, is_visible: !form.is_visible })}
              className={`w-10 h-5 rounded-full transition-colors relative ${form.is_visible ? 'bg-accent' : 'bg-surface2 border border-white/10'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.is_visible ? 'left-5' : 'left-0.5'}`} />
            </button>
            <label className="text-sm font-body text-muted">{t('visible')}</label>
          </div>
        </div>
        <div className="flex gap-3 mt-4 pt-4 border-t border-white/[0.06]">
          <button onClick={() => setModalOpen(false)} className="btn-ghost flex-1">{t('cancel')}</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving ? t('processing') : t('save')}</button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('delete')}
        message={t('deleteConfirm')}
        confirmText={t('delete')}
        danger
      />

      {pkgModal && <PackageModal product={pkgModal} onClose={() => setPkgModal(null)} showToast={showToast} />}
    </div>
  )
}

function PackageModal({ product, onClose, showToast }) {
  const [packages, setPackages] = useState(product.product_packages || [])
  const [duration, setDuration] = useState(7)
  const [price, setPrice] = useState('')
  const [adding, setAdding] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  async function addPackage() {
    if (!price || Number(price) < 1) return
    setAdding(true)
    const res = await apiFetch(`/api/admin/products/${product.id}/packages`, {
      method: 'POST',
      body: JSON.stringify({ duration_days: Number(duration), price: Number(price) }),
    })
    setAdding(false)
    if (res?.ok) {
      showToast(t('packageAdded'), 'success')
      setPackages(res.data.packages || [...packages, { id: res.data.id, duration_days: Number(duration), price: Number(price) }])
      setPrice('')
    } else {
      showToast(res?.data?.error || 'যোগ করা যায়নি', 'error')
    }
  }

  async function deletePackage() {
    const res = await apiFetch(`/api/admin/packages/${deleteTarget.id}`, { method: 'DELETE' })
    if (res?.ok) {
      showToast('Package মুছে ফেলা হয়েছে', 'success')
      setPackages(packages.filter((p) => p.id !== deleteTarget.id))
    } else {
      showToast(res?.data?.error || 'মুছতে পারা যায়নি', 'error')
    }
    setDeleteTarget(null)
  }

  return (
    <>
      <Modal open onClose={onClose} title={`${product.name} — Packages`} size="md">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            {packages.length === 0 && <p className="text-muted text-sm font-body">কোনো package নেই</p>}
            {packages.map((pkg) => (
              <div key={pkg.id} className="flex items-center justify-between p-3 bg-surface2 rounded-card">
                <span className="text-sm font-body text-text">{pkg.duration_days} {t('days')} — ৳{pkg.price.toLocaleString('bn-BD')}</span>
                <button onClick={() => setDeleteTarget(pkg)} className="text-danger hover:text-danger/70 text-sm transition-colors">🗑️</button>
              </div>
            ))}
          </div>

          <div className="border-t border-white/[0.06] pt-4">
            <h3 className="font-display font-semibold text-sm text-text mb-3">{t('newPackage')}</h3>
            <div className="space-y-3">
              <div>
                <label className="label">{t('duration')}</label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 3, 7, 15, 30].map((d) => (
                    <button key={d} type="button" onClick={() => setDuration(d)}
                      className={`px-3 py-1.5 rounded-input text-xs font-body font-semibold border transition-all ${duration === d ? 'border-accent bg-accent/10 text-accent' : 'border-white/10 text-muted hover:border-white/20'}`}>
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">{t('price')} (৳)</label>
                <input type="number" className="input-field" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="150" min="1" />
              </div>
              <button onClick={addPackage} disabled={adding || !price} className="btn-primary">
                {adding ? t('processing') : 'যোগ করুন'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deletePackage}
        title="Package মুছুন"
        message={t('deleteConfirm')}
        confirmText={t('delete')}
        danger
      />
    </>
  )
}
