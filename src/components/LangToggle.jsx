import { useStore } from '../lib/store.js'
import { setLang, t } from '../lib/i18n.js'

export default function LangToggle({ className = '' }) {
  const { lang, setLang: storeLang } = useStore()

  function toggle() {
    const next = lang === 'bn' ? 'en' : 'bn'
    setLang(next)
    storeLang(next)
  }

  return (
    <button
      onClick={toggle}
      className={`text-xs font-body font-semibold px-2.5 py-1 rounded-full border border-white/10 text-muted hover:text-accent hover:border-accent/30 transition-all ${className}`}
    >
      {t('langSwitch')}
    </button>
  )
}
