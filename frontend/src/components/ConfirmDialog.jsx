import { useEffect, useRef } from 'react'

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
}) {
  const cancelRef = useRef(null)
  const confirmRef = useRef(null)

  useEffect(() => {
    if (open) cancelRef.current?.focus()
  }, [open])

  useEffect(() => {
    function onKey(e) {
      if (!open) return
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Tab') {
        const els = [cancelRef.current, confirmRef.current].filter(Boolean)
        const idx = els.indexOf(document.activeElement)
        if (e.shiftKey) {
          e.preventDefault()
          els[(idx - 1 + els.length) % els.length]?.focus()
        } else {
          e.preventDefault()
          els[(idx + 1) % els.length]?.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-5 animate-slide-up">
        <div className="flex items-start gap-4">
          {danger && (
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2
              id="confirm-dialog-title"
              className="text-slate-100 font-semibold text-base leading-snug"
            >
              {title}
            </h2>
            <p
              id="confirm-dialog-desc"
              className="text-slate-400 text-sm mt-1.5 leading-relaxed"
            >
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`flex-1 min-h-[44px] px-4 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
              danger
                ? 'bg-red-500 hover:bg-red-400 active:bg-red-600 text-white focus-visible:ring-red-400'
                : 'bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 focus-visible:ring-emerald-400'
            }`}
          >
            {confirmLabel}
          </button>
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 min-h-[44px] px-4 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
