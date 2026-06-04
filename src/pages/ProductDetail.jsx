import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { apiFetch } from '../lib/api.js'
import { useStore } from '../lib/store.js'
import { t } from '../lib/i18n.js'
import { categoryColor } from '../lib/utils.js'
import Modal from '../components/Modal.jsx'
import { SkeletonText } from '../components/Skeleton.jsx'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, showToast, setUser } = useStore()
  const [product, setProduct] = useState(null)
  const [stock, setStock] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedPkg, setSelectedPkg] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [buying, setBuying] = useState(false)

  useEffect(() => {
    apiFetch(`/api/products/${id}`).then((res) => {
      if (res?.ok) {
        setProduct(res.data.product)
        setStock(res.data.stock)
        const pkgs = res.data.product?.product_packages || []
        if (pkgs.length) setSelectedPkg(pkgs[0])
      }
      setLoading(false)
    })
  }, [id])

  async function handleBuy() {
    if (!selectedPkg) return
    setBuying(true)
    const res = await apiFetch('/api/orders/buy', {
      method: 'POST',
      body: JSON.stringify({ product_id: product.id, package_id: selectedPkg.id }),
    })
    setBuying(false)
    setConfirmOpen(false)
    if (!res) return
    if (res.ok) {
      showToast(t('purchaseSuccess'), 'success')
      navigate('/orders')
    } else if (res.status === 402) {
      showToast(t('insufficientBalance'), 'error')
      navigate('/wallet')
    } else {
      showToast(res.data?.error || 'ক্রয় ব্যর্থ হয়েছে', 'error')
    }
  }

  if (loading) return (
    <div className="min-h-dvh bg-bg pb-24 page-enter">
      <div className="aspect-video shimmer w-full" />
      <div className="p-4 space-y-3">
        <SkeletonText lines={4} />
      </div>
    </div>
  )

  if (!product) return (
    <div className="min-h-dvh bg-bg flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted font-body">প্রোডাক্ট পাওয়া যায়নি</p>
        <Link to="/" className="text-accent text-sm mt-2 inline-block">{t('home')}</Link>
      </div>
    </div>
  )

  const outOfStock = stock === 0
  const lowStock = stock > 0 && stock <= 10
  const balance = user?.wallet_balance || 0
  const afterBalance = balance - (selectedPkg?.price || 0)

  return (
    <div className="min-h-dvh bg-bg pb-24 page-enter">
      <div className="relative">
        <div className="aspect-video overflow-hidden bg-surface2">
          {product.thumbnail_url ? (
            <img src={product.thumbnail_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">📦</div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-text hover:bg-black/70 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
      </div>

      <div className="px-4 max-w-2xl mx-auto space-y-4 mt-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`badge text-[10px] ${categoryColor(product.category)}`}>{product.category}</span>
            <span className="badge text-[10px] text-muted bg-white/5">{product.type}</span>
          </div>
          <h1 className="font-display font-bold text-xl text-text leading-tight">{product.name}</h1>
          {product.description && (
            <p className="text-muted text-sm font-body mt-2 leading-relaxed">{product.description}</p>
          )}
        </div>

        {product.notice && (
          <div className="bg-warning/5 border border-warning/20 rounded-card p-3 flex gap-2">
            <span className="text-warning text-sm shrink-0">⚠️</span>
            <p className="text-warning/90 text-sm font-body">{product.notice}</p>
          </div>
        )}

        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-medium ${
          outOfStock ? 'bg-danger/10 text-danger border border-danger/20' :
          lowStock ? 'bg-warning/10 text-warning border border-warning/20 animate-blink' :
          'bg-accent/10 text-accent border border-accent/20'
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {outOfStock ? t('noStock') : lowStock ? t('lowStock', { n: stock }) : t('stockOk')}
        </div>

        {product.product_packages?.length > 0 && (
          <div>
            <h3 className="font-display font-semibold text-sm text-text mb-2">{t('package')}</h3>
            <div className="space-y-2">
              {product.product_packages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPkg(pkg)}
                  disabled={outOfStock}
                  className={`w-full flex items-center justify-between p-3.5 rounded-card border transition-all ${
                    selectedPkg?.id === pkg.id
                      ? 'border-accent bg-accent/5 shadow-glow'
                      : 'border-white/10 bg-surface hover:border-white/20'
                  } disabled:opacity-40`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedPkg?.id === pkg.id ? 'border-accent' : 'border-muted'
                    }`}>
                      {selectedPkg?.id === pkg.id && <div className="w-2 h-2 rounded-full bg-accent" />}
                    </div>
                    <span className="font-body font-medium text-sm text-text">{pkg.duration_days} {t('days')}</span>
                  </div>
                  <span className="font-display font-semibold text-sm text-accent">৳{pkg.price.toLocaleString('bn-BD')}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setConfirmOpen(true)}
          disabled={outOfStock || !selectedPkg}
          className="btn-primary"
        >
          {outOfStock ? t('noStock') : t('buy')}
        </button>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title={t('confirmPurchase')} size="sm">
        <div className="space-y-3 mb-5">
          {[
            [t('product'), product.name],
            [t('package'), `${selectedPkg?.duration_days} ${t('days')}`],
            [t('price'), `৳${selectedPkg?.price?.toLocaleString('bn-BD')}`],
            [t('balance'), `৳${balance.toLocaleString('bn-BD')}`],
            [t('afterBalance'), `৳${afterBalance.toLocaleString('bn-BD')}`],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-muted text-sm font-body">{label}</span>
              <span className={`text-sm font-body font-medium ${label === t('afterBalance') && afterBalance < 0 ? 'text-danger' : 'text-text'}`}>{val}</span>
            </div>
          ))}
        </div>
        {afterBalance < 0 && (
          <div className="bg-danger/10 border border-danger/20 rounded-input p-2.5 mb-4">
            <p className="text-danger text-xs font-body">{t('insufficientBalance')}</p>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={() => setConfirmOpen(false)} className="btn-ghost flex-1">{t('cancel')}</button>
          <button onClick={handleBuy} disabled={buying || afterBalance < 0} className="btn-primary flex-1">
            {buying ? t('processing') : t('confirm')}
          </button>
        </div>
      </Modal>
    </div>
  )
}
