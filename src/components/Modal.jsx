import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className={`relative w-full ${sizes[size]} bg-surface border border-white/10 rounded-t-[20px] sm:rounded-card p-5 animate-slide-in shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-base text-text">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-muted hover:text-text hover:bg-white/10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'নিশ্চিত করুন', danger = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-muted font-body mb-5 leading-relaxed">{message}</p>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-ghost flex-1">{' বাতিল'}</button>
        <button
          onClick={() => { onConfirm(); onClose() }}
          className={`flex-1 py-2.5 px-4 rounded-btn font-body font-medium text-sm transition-all ${
            danger
              ? 'bg-danger/20 text-danger border border-danger/30 hover:bg-danger/30'
              : 'btn-primary'
          }`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  )
}
