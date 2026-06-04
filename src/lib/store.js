import { create } from 'zustand'

export const useStore = create((set, get) => ({
  user: null,
  loading: true,
  toast: null,
  lang: localStorage.getItem('pbbd_lang') || 'bn',

  setUser: (user) => set({ user }),
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
