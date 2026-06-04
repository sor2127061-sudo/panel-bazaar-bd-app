import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../lib/api.js'
import { useStore } from '../lib/store.js'
import { t } from '../lib/i18n.js'
import { cheapestPrice, categoryColor } from '../lib/utils.js'
import CountUp from '../components/CountUp.jsx'
import { SkeletonCard } from '../components/Skeleton.jsx'
import LangToggle from '../components/LangToggle.jsx'

const CATEGORIES = ['all', 'ROOT', 'NON_ROOT', 'VIP']
const CAT_LABELS = { all: () => t('all'), ROOT: () => 'ROOT', NON_ROOT: () => 'NON ROOT', VIP: () => 'VIP' }

export default function Home() {
  const { user, lang } = useStore()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')

  useEffect(() => {
    setLoading(true)
    const path = category === 'all' ? '/api/products' : `/api/products?category=${category}`
    apiFetch(path).then((res) => {
      if (res?.ok) setProducts(res.data.products || [])
      setLoading(false)
    })
  }, [category])

  return (
    <div className="min-h-dvh bg-bg pb-24 page-enter">
      <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur-md border-b border-white/[0.04]">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
              <span className="text-accent font-display font-bold text-sm">P</span>
            </div>
            <span className="font-display font-bold text-base text-text">{t('appName')}</span>
          </div>
          <div className="flex items-center gap-3">
            <LangToggle />
            <div className="flex items-center gap-1.5 bg-accent/10 border border-accent/20 rounded-full px-3 py-1">
              <span className="text-accent font-display font-semibold text-sm">
                <CountUp value={user?.wallet_balance || 0} />
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide max-w-2xl mx-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-body font-semibold transition-all border ${
                category === cat
                  ? 'bg-accent text-bg border-accent shadow-glow'
                  : 'bg-transparent text-muted border-white/10 hover:border-white/20 hover:text-text'
              }`}
            >
              {CAT_LABELS[cat]()}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 pt-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="text-4xl">📦</div>
            <p className="text-muted font-body text-sm">{t('noProducts')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} delay={i * 50} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function ProductCard({ product, delay }) {
  const cheapest = cheapestPrice(product.product_packages)

  return (
    <div
      className="bg-surface rounded-card border border-white/[0.06] overflow-hidden hover:border-accent/20 hover:shadow-glow-lg transition-all duration-300 group"
      style={{ animationDelay: `${delay}ms`, opacity: 0, animation: `fadeUp 0.4s ease ${delay}ms forwards` }}
    >
      <div className="relative aspect-video overflow-hidden bg-surface2">
        {product.thumbnail_url ? (
          <img
            src={product.thumbnail_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl">📦</span>
          </div>
        )}
        <span className={`absolute top-2 left-2 badge text-[10px] ${categoryColor(product.category)}`}>
          {product.category}
        </span>
      </div>
      <div className="p-3">
        <h3 className="font-display font-semibold text-sm text-text leading-tight line-clamp-2 mb-1">{product.name}</h3>
        <p className="text-accent font-body font-medium text-xs mb-2.5">
          {t('fromPrice', { p: cheapest.toLocaleString('bn-BD') })}
        </p>
        <Link
          to={`/product/${product.id}`}
          className="block w-full text-center py-2 px-3 rounded-btn text-xs font-body font-semibold bg-accent/10 text-accent border border-accent/20 hover:bg-accent hover:text-bg transition-all duration-200"
        >
          {t('details')}
        </Link>
      </div>
    </div>
  )
}
