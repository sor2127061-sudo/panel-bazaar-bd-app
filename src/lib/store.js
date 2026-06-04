import { create } from 'zustand'

const cachedUser = (() => {
  try {
    const s = localStorage.getItem('pbbd_user')
    return s ? JSON.parse(s) : null
  } catch { return null }
})()

export const useStore = create((set, get) => ({
  user: cachedUser,
  loading: cachedUser === null,
  toast: null,
  lang: localStorage.getItem('pbbd_lang') || 'bn',

  setUser: (user) => {
    try {
      if (user) localStorage.setItem('pbbd_user', JSON.stringify(user))
      else localStorage.removeItem('pbbd_user')
    } catch {}
    set({ user })
  },

  setLoading: (loading) => set({ loading }),

  setLang: (lang) => {
    localStorage.setItem('pbbd_lang', lang)
    document.documentElement.lang = lang
    set({ lang })
  },

  showToast: (message, type = 'info') => {
    const id = Date.now()
    set({ toast: { message, type, id } })
    setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null })
    }, 3000)
  },

  clearToast: () => set({ toast: null }),
}))
