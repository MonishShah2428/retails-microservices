import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import StarRating from '../components/StarRating.jsx'

function avgRating(recommendations) {
  if (!recommendations?.length) return 0
  return Math.round(recommendations.reduce((s, r) => s + r.rate, 0) / recommendations.length)
}

function ProductSkeleton() {
  return (
    <div className="glass-card p-6 space-y-4 animate-pulse">
      <div className="h-4 bg-white/10 rounded w-2/3" />
      <div className="h-3 bg-white/5 rounded w-1/3" />
      <div className="flex gap-1">
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="w-3.5 h-3.5 rounded bg-white/10" />
        ))}
      </div>
      <div className="h-3 bg-white/5 rounded w-1/2" />
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
        .map((r, i) => r.status === 'fulfilled' && r.value ? { ...r.value, _idx: i + 1 } : null)
        .filter(Boolean)
      setProducts(found)
      setLoading(false)
    }
    fetchAll()
  }, [])

  async function handleDelete(id) {
    if (!window.confirm(`Delete product #${id}? This is irreversible.`)) return
    setDeleteId(id)
    try {
      await api.deleteProduct(id)
      setProducts((prev) => prev.filter((p) => p.productId !== id))
    } catch (e) {
      alert(`Failed to delete: ${e.message}`)
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div className="animate-fade-in space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-100">Products</h1>
          <p className="text-slate-500 text-sm mt-1">
            {loading ? 'Fetchingâ€¦' : `${products.length} product${products.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <Link to="/products/new" className="btn-primary flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Product
        </Link>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => <ProductSkeleton key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <div className="glass-card p-16 text-center space-y-4">
          <div className="text-5xl text-slate-700">
            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
            </svg>
          </div>
          <p className="text-slate-400 font-medium">No products found</p>
          <p className="text-slate-600 text-sm">Create your first product to get started</p>
          <Link to="/products/new" className="btn-primary inline-block mt-2">Add Product</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p) => {
            const avg = avgRating(p.recommendations)
            return (
              <div key={p.productId} className="glass-card group flex flex-col">
                <Link to={`/products/${p.productId}`} className="flex-1 p-6 space-y-3 hover:bg-white/5 transition-colors rounded-t-2xl">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-heading font-semibold text-slate-100 text-base leading-snug group-hover:text-emerald-400 transition-colors">
                      {p.name}
                    </span>
                    <span className="text-slate-600 text-xs font-mono shrink-0">#{p.productId}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <StarRating rate={avg} />
                    <span className="text-slate-500 text-xs">
                      {avg > 0 ? `${avg}/5` : 'No ratings'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636" />
                      </svg>
                      {p.recommendations?.length ?? 0} recs
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                      </svg>
                      {p.reviews?.length ?? 0} reviews
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
                      </svg>
                      {p.weight}g
                    </span>
                  </div>
                </Link>

                <div className="px-6 pb-4 pt-2 border-t border-white/5">
                  <button
                    onClick={() => handleDelete(p.productId)}
                    disabled={deleteId === p.productId}
                    className="btn-danger w-full text-xs py-2 disabled:opacity-50"
                  >
                    {deleteId === p.productId ? 'Deletingâ€¦' : 'Delete'}
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
