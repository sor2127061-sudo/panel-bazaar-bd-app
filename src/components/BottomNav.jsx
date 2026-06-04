import { NavLink, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.js'
import { t } from '../lib/i18n.js'

const navItems = [
  {
    to: '/',
    label: () => t('home'),
    icon: (active) => (
      <svg className={`w-6 h-6 transition-all ${active ? 'stroke-accent' : 'stroke-muted'}`} fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    to: '/wallet',
    label: () => t('wallet'),
    icon: (active) => (
      <svg className={`w-6 h-6 transition-all ${active ? 'stroke-accent' : 'stroke-muted'}`} fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
      </svg>
    ),
  },
  {
    to: '/orders',
    label: () => t('orders'),
    icon: (active) => (
      <svg className={`w-6 h-6 transition-all ${active ? 'stroke-accent' : 'stroke-muted'}`} fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: () => t('profile'),
    icon: (active) => (
      <svg className={`w-6 h-6 transition-all ${active ? 'stroke-accent' : 'stroke-muted'}`} fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const { user, lang } = useStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-white/[0.06] md:hidden safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 min-w-[48px] min-h-[48px] justify-center px-3 rounded-xl transition-all ${
                isActive ? 'shadow-glow' : ''
              }`
            }
          >
            {({ isActive }) => (
              <>
                {icon(isActive)}
                <span className={`text-[10px] font-body font-medium transition-colors ${isActive ? 'text-accent' : 'text-muted'}`}>
                  {label()}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
