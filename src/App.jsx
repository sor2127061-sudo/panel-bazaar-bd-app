import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useStore } from './lib/store.js'
import { apiFetch } from './lib/api.js'
import { setLang } from './lib/i18n.js'

import Toast from './components/Toast.jsx'
import BottomNav from './components/BottomNav.jsx'

import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Home from './pages/Home.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Wallet from './pages/Wallet.jsx'
import TopupSuccess from './pages/TopupSuccess.jsx'
import Orders from './pages/Orders.jsx'
import Profile from './pages/Profile.jsx'

import AdminLayout from './pages/admin/AdminLayout.jsx'
import Dashboard from './pages/admin/Dashboard.jsx'
import Products from './pages/admin/Products.jsx'
import Keys from './pages/admin/Keys.jsx'
import AdminOrders from './pages/admin/Orders.jsx'
import Users from './pages/admin/Users.jsx'
import AuditLog from './pages/admin/AuditLog.jsx'

function AppShell() {
  const { user, loading, setUser, setLoading, showToast } = useStore()
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  useEffect(() => {
    window.__pbbd_toast__ = showToast
  }, [showToast])

  useEffect(() => {
    const stored = localStorage.getItem('pbbd_lang') || 'bn'
    setLang(stored)
    document.documentElement.lang = stored
  }, [])

  useEffect(() => {
    // Always verify session in background — never block render on it
    apiFetch('/api/auth/session').then((res) => {
      if (res?.ok) {
        setUser(res.data.user)
      } else if (res !== null) {
        // Explicit failure (401/403) — clear stale cache
        setUser(null)
      }
      // res === null means network error — keep cached state, don't log out
      setLoading(false)
    })
  }, [])

  // Only block render for first-time visitors (no cache)
  if (loading) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-surface2 border-t-accent animate-spin" />
      </div>
    )
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />

        <Route path="/" element={user ? <Home /> : <Navigate to="/login" replace />} />
        <Route path="/product/:id" element={user ? <ProductDetail /> : <Navigate to="/login" replace />} />
        <Route path="/wallet" element={user ? <Wallet /> : <Navigate to="/login" replace />} />
        <Route path="/topup/success" element={user ? <TopupSuccess /> : <Navigate to="/login" replace />} />
        <Route path="/orders" element={user ? <Orders /> : <Navigate to="/login" replace />} />
        <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" replace />} />

        <Route
          path="/admin"
          element={user?.is_admin ? <AdminLayout /> : <Navigate to="/" replace />}
        >
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="keys" element={<Keys />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="users" element={<Users />} />
          <Route path="audit-log" element={<AuditLog />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {user && !isAdmin && <BottomNav />}
      <Toast />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
