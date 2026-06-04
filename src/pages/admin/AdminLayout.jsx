import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store.js'
import { t } from '../../lib/i18n.js'

const navItems = [
  { to: '/admin', label: () => t('dashboard'), icon: '📊', end: true },
  { to: '/admin/products', label: () => t('products'), icon: '📦' },
  { to: '/admin/keys', label: () => t('keys'), icon: '🔑' },
  { to: '/admin/orders', label: () => t('orders'), icon: '🛒' },
  { to: '/admin/users', label: () => t('users'), icon: '👥' },
  { to: '/admin/audit-log', label: () => t('auditLog'), icon: '📋' },
]

export default function AdminLayout() {
  const { user, lang } = useStore()

  return (
    <div className="min-h-dvh bg-bg flex">
      <aside className="hidden md:flex flex-col w-56 bg-surface border-r border-white/[0.06] fixed top-0 bottom-0 left-0 z-30">
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
              <span className="text-accent font-display font-bold text-sm">P</span>
            </div>
            <div>
              <p className="font-display font-bold text-sm text-text">{t('appName')}</p>
              <p className="text-accent text-[10px] font-body">Admin</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-body font-medium transition-all ${
                  isActive
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'text-muted hover:text-text hover:bg-white/5'
                }`
              }
            >
              <span>{icon}</span>
              {label()}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/[0.06]">
          <p className="text-xs text-muted font-body truncate">{user?.email}</p>
        </div>
      </aside>

      <div className="flex-1 md:ml-56">
        <header className="md:hidden sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-white/[0.06]">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-display font-bold text-sm text-text">Admin</span>
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {navItems.map(({ to, icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `w-9 h-9 flex items-center justify-center rounded-xl text-base shrink-0 transition-colors ${
                      isActive ? 'bg-accent/10 text-accent' : 'text-muted hover:text-text'
                    }`
                  }
                >
                  {icon}
                </NavLink>
              ))}
            </div>
          </div>
        </header>

        <main className="p-4 max-w-5xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
