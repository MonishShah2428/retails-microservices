import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import StarRating from '../components/StarRating.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { useToast } from '../context/ToastContext.jsx'

function avgRating(recommendations) {
  if (!recommendations?.length) return 0
  return Math.round(recommendations.reduce((s, r) => s + r.rate, 0) / recommendations.length)
}

function Skeleton({ index }) {
  return (
    <div
      className="glass-card p-6 space-y-4 animate-pulse"
      style={{ animationDelay: `${index * 60}ms` }}
      aria-hidden="true"
    >
      <div className="space-y-2">
        <div className="h-4 bg-white/10 rounded-lg w-3/4" />
        <div className="h-3 bg-white/[0.06] rounded w-1/4" />
      </div>
      <div className="flex gap-1">
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="w-3.5 h-3.5 rounded bg-white/10" />
        ))}
      </div>
      <div className="flex gap-3 pt-1">
        <div className="h-3 bg-white/[0.06] rounded w-14" />
        <div className="h-3 bg-white/[0.06] rounded w-16" />
        <div className="h-3 bg-white/[0.06] rounded w-10" />
      </div>
    </div>
  )
}

export default function ProductCatalog() {
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    async function fetchAll() {
      const results = await Promise.allSettled(
        Array.from({ length: 20 }, (_, i) => api.getProduct(i + 1))
      )
      const found = results
        .map((r) => (r.status === 'fulfilled' && r.value ? r.value : null))
        .filter(Boolean)
      setProducts(found)
      setLoading(false)
    }
    fetchAll()
  }, [])

  async function handleDeleteConfirm() {
    const id = confirmId
    setConfirmId(null)
    setDeletingId(id)
    try {
      await api.deleteProduct(id)
      setProducts((prev) => prev.filter((p) => p.productId !== id))
      toast(`Product #${id} deleted successfully`)
    } catch (err) {
      toast(`Failed to delete product #${id}: ${err.message}`, 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="animate-fade-in pb-12 space-y-8">

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete product?"
        message={`Product #${confirmId} and all its recommendations and reviews will be permanently removed.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmId(null)}
        danger
      />

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle" aria-live="polite">
            {loading ? 'Scanning IDs 1–20...' : `${products.length} product${products.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <Link to="/products/new" className="btn-primary shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Product
        </Link>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" aria-label="Loading products">
          {Array(8).fill(0).map((_, i) => <Skeleton key={i} index={i} />)}
        </div>
      ) : products.length === 0 ? (
        <div className="glass-card p-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
            </svg>
          </div>
          <p className="text-slate-300 font-semibold text-lg">No products yet</p>
          <p className="text-slate-600 text-sm">Create your first product to get started.</p>
          <Link to="/products/new" className="btn-primary mx-auto mt-2">Add Product</Link>
        </div>
      ) : (
        <div
          className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          aria-label={`${products.length} products`}
        >
          {products.map((p, idx) => {
            const avg = avgRating(p.recommendations)
            const isDeleting = deletingId === p.productId
            return (
              <article
                key={p.productId}
                className="glass-card group flex flex-col overflow-hidden opacity-0 animate-fade-in"
                style={{ animationDelay: `${Math.min(idx * 40, 320)}ms` }}
                aria-label={`${p.name}, product #${p.productId}`}
              >
                <Link
                  to={`/products/${p.productId}`}
                  className="flex-1 p-6 space-y-3 hover:bg-white/[0.03] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/50 rounded-t-2xl"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-100 text-sm leading-snug group-hover:text-emerald-400 transition-colors duration-200">
                      {p.name}
                    </span>
                    <span className="text-slate-600 text-xs font-mono shrink-0 mt-0.5">#{p.productId}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <StarRating rate={avg} />
                    <span className="text-slate-500 text-xs">
                      {avg > 0 ? `${avg}/5` : 'No ratings'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs text-slate-500 pt-1">
                    <span>{p.recommendations?.length ?? 0} recs</span>
                    <span className="text-slate-700" aria-hidden="true">&middot;</span>
                    <span>{p.reviews?.length ?? 0} reviews</span>
                    <span className="text-slate-700" aria-hidden="true">&middot;</span>
                    <span className="font-mono">{p.weight}g</span>
                  </div>
                </Link>

                <div className="px-4 pb-4 pt-1">
                  <button
                    onClick={() => setConfirmId(p.productId)}
                    disabled={isDeleting}
                    className="w-full min-h-[40px] text-xs font-medium rounded-xl text-slate-600 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
                    aria-label={isDeleting ? `Deleting ${p.name}` : `Delete ${p.name}`}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
