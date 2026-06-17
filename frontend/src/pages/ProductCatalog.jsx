import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import StarRating from '../components/StarRating.jsx'

function avgRating(recommendations) {
  if (!recommendations?.length) return 0
  return Math.round(recommendations.reduce((s, r) => s + r.rate, 0) / recommendations.length)
}

function Skeleton() {
  return (
    <div className="glass-card p-6 space-y-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 bg-white/10 rounded w-3/4" />
        <div className="h-3 bg-white/5 rounded w-1/4 font-mono" />
      </div>
      <div className="flex gap-1">
        {Array(5).fill(0).map((_, i) => <div key={i} className="w-4 h-4 rounded bg-white/10" />)}
      </div>
      <div className="flex gap-3 pt-1">
        <div className="h-3 bg-white/5 rounded w-16" />
        <div className="h-3 bg-white/5 rounded w-16" />
        <div className="h-3 bg-white/5 rounded w-12" />
      </div>
    </div>
  )
}

export default function ProductCatalog() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState(null)

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

  async function handleDelete(e, id) {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm(`Delete product #${id}? This cannot be undone.`)) return
    setDeleteId(id)
    try {
      await api.deleteProduct(id)
      setProducts((prev) => prev.filter((p) => p.productId !== id))
    } catch (err) {
      alert(`Failed to delete: ${err.message}`)
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div className="animate-fade-in pb-12 space-y-8">

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">
            {loading ? 'Scanning IDs 1-20...' : `${products.length} product${products.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <Link to="/products/new" className="btn-primary shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Product
        </Link>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => <Skeleton key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <div className="glass-card p-20 text-center space-y-4">
          <svg className="w-12 h-12 mx-auto text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
          </svg>
          <p className="text-slate-300 font-medium text-lg">No products yet</p>
          <p className="text-slate-600 text-sm">Create your first product to get started.</p>
          <Link to="/products/new" className="btn-primary mx-auto mt-2">Add Product</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p) => {
            const avg = avgRating(p.recommendations)
            const isDeleting = deleteId === p.productId
            return (
              <div key={p.productId} className="glass-card group flex flex-col overflow-hidden">
                <Link
                  to={`/products/${p.productId}`}
                  className="flex-1 p-6 space-y-3 hover:bg-white/[0.03] transition-colors duration-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-heading font-semibold text-slate-100 text-sm leading-snug group-hover:text-emerald-400 transition-colors duration-200">
                      {p.name}
                    </span>
                    <span className="text-slate-700 text-xs font-mono shrink-0">#{p.productId}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <StarRating rate={avg} />
                    <span className="text-slate-600 text-xs">
                      {avg > 0 ? `${avg}/5` : 'No ratings'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-600 pt-1">
                    <span>{p.recommendations?.length ?? 0} recs</span>
                    <span className="text-slate-800">|</span>
                    <span>{p.reviews?.length ?? 0} reviews</span>
                    <span className="text-slate-800">|</span>
                    <span>{p.weight}g</span>
                  </div>
                </Link>

                <div className="px-4 pb-4">
                  <button
                    onClick={(e) => handleDelete(e, p.productId)}
                    disabled={isDeleting}
                    className="w-full py-2 text-xs font-medium rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200 cursor-pointer disabled:opacity-40"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
