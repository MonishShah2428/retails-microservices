import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client.js'
import StarRating from '../components/StarRating.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { useToast } from '../context/ToastContext.jsx'

function Breadcrumb({ id }) {
  return (
    <nav className="flex items-center gap-2 text-sm text-slate-600" aria-label="Breadcrumb">
      <Link
        to="/products"
        className="hover:text-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 rounded"
      >
        Products
      </Link>
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
      <span className="text-slate-400 font-mono" aria-current="page">#{id}</span>
    </nav>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse" aria-label="Loading product details">
      <div className="space-y-3">
        <div className="h-8 bg-white/10 rounded-xl w-1/3" />
        <div className="h-4 bg-white/[0.06] rounded-lg w-1/2" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-5 space-y-3">
            <div className="h-4 bg-white/10 rounded-lg w-1/2" />
            <div className="h-3 bg-white/[0.06] rounded" />
            <div className="h-3 bg-white/[0.06] rounded w-3/4" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showAddresses, setShowAddresses] = useState(false)
  const [delay, setDelay] = useState(0)
  const [faultPct, setFaultPct] = useState(0)
  const [fetching, setFetching] = useState(false)

  const fetchProduct = useCallback(async () => {
    setLoading(true)
    setFetching(true)
    setError(null)
    try {
      const data = await api.getProduct(id, delay, faultPct)
      setProduct(data)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
      setFetching(false)
    }
  }, [id, delay, faultPct])

  useEffect(() => { fetchProduct() }, [fetchProduct])

  async function handleDeleteConfirm() {
    setConfirmDelete(false)
    setDeleting(true)
    try {
      await api.deleteProduct(id)
      toast(`Product #${id} deleted`)
      navigate('/products')
    } catch (e) {
      toast(`Failed to delete: ${e.message}`, 'error')
      setDeleting(false)
    }
  }

  return (
    <div className="animate-fade-in pb-12 max-w-4xl space-y-8">
      <Breadcrumb id={id} />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete product?"
        message={`Product #${id}${product ? ` (${product.name})` : ''} and all its data will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(false)}
        danger
      />

      {/* Fault Injection */}
      <section
        className="glass-card p-6 space-y-5"
        aria-labelledby="fault-heading"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <h2 id="fault-heading" className="text-amber-400 text-sm font-semibold">Fault Injection</h2>
          <span className="text-slate-600 text-xs ml-1">triggers circuit breaker demo</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="delay-slider"
                className="text-slate-400 text-xs font-medium uppercase tracking-wider"
              >
                Response Delay
              </label>
              <span className="text-amber-400 text-sm font-mono font-semibold tabular-nums">
                {delay}ms
              </span>
            </div>
            <input
              id="delay-slider"
              type="range"
              min={0} max={3000} step={100}
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer h-2"
              aria-valuetext={`${delay} milliseconds`}
            />
            <div className="flex justify-between text-slate-700 text-xs font-mono">
              <span>0ms</span>
              <span>3000ms</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="fault-slider"
                className="text-slate-400 text-xs font-medium uppercase tracking-wider"
              >
                Fault Percent
              </label>
              <span className={`text-sm font-mono font-semibold tabular-nums ${faultPct > 0 ? 'text-red-400' : 'text-slate-600'}`}>
                {faultPct}%
              </span>
            </div>
            <input
              id="fault-slider"
              type="range"
              min={0} max={100} step={5}
              value={faultPct}
              onChange={(e) => setFaultPct(Number(e.target.value))}
              className="w-full accent-red-400 cursor-pointer h-2"
              aria-valuetext={`${faultPct} percent`}
            />
            <div className="flex justify-between text-slate-700 text-xs font-mono">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
        <button
          onClick={fetchProduct}
          disabled={fetching}
          className="btn-ghost text-xs py-2 px-4 disabled:opacity-50"
        >
          <svg
            className={`w-3.5 h-3.5 ${fetching ? 'animate-spin' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          {fetching ? 'Fetching...' : 'Refetch with params'}
        </button>
      </section>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="glass-card p-14 text-center space-y-4" role="alert">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/15 flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-red-400 font-semibold text-lg">
            {error.status === 404 ? 'Product not found' : `Error ${error.status ?? ''}`}
          </p>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">
            {error.status === 404
              ? 'This product ID does not exist in the system.'
              : error.message || 'The service may be unavailable or the circuit breaker is open.'}
          </p>
          <Link to="/products" className="btn-ghost text-sm mx-auto mt-2">
            Back to catalog
          </Link>
        </div>
      ) : product && (
        <div className="space-y-8 animate-slide-up">

          {/* Product header */}
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-2 min-w-0">
              <h1 className="page-title truncate">{product.name}</h1>
              <div className="flex flex-wrap items-center gap-2.5 text-sm text-slate-500">
                <span className="font-mono text-emerald-500/80 font-medium">#{product.productId}</span>
                <span className="text-slate-700" aria-hidden="true">&middot;</span>
                <span className="font-mono">{product.weight}g</span>
                <span className="text-slate-700" aria-hidden="true">&middot;</span>
                <span>{product.recommendations?.length ?? 0} recommendations</span>
                <span className="text-slate-700" aria-hidden="true">&middot;</span>
                <span>{product.reviews?.length ?? 0} reviews</span>
              </div>
            </div>
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={deleting}
              className="btn-danger shrink-0 disabled:opacity-40"
              aria-label={`Delete product ${product.name}`}
            >
              {deleting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Deleting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Delete
                </>
              )}
            </button>
          </div>

          {/* Recommendations */}
          <section aria-labelledby="recs-heading" className="space-y-4">
            <h2 id="recs-heading" className="section-title flex items-center gap-2">
              Recommendations
              <span className="bg-slate-800/80 text-slate-500 text-xs px-2 py-0.5 rounded-md font-normal font-body">
                {product.recommendations?.length ?? 0}
              </span>
            </h2>
            {product.recommendations?.length ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {product.recommendations.map((r) => (
                  <div key={r.recommendationId} className="glass-card p-5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-200 text-sm font-semibold">{r.author}</span>
                      <StarRating rate={r.rate} />
                    </div>
                    {r.content && (
                      <p className="text-slate-500 text-sm leading-relaxed">{r.content}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card p-10 text-center text-slate-600 text-sm">
                No recommendations for this product yet.
              </div>
            )}
          </section>

          {/* Reviews */}
          <section aria-labelledby="reviews-heading" className="space-y-4">
            <h2 id="reviews-heading" className="section-title flex items-center gap-2">
              Reviews
              <span className="bg-slate-800/80 text-slate-500 text-xs px-2 py-0.5 rounded-md font-normal font-body">
                {product.reviews?.length ?? 0}
              </span>
            </h2>
            {product.reviews?.length ? (
              <div className="space-y-3">
                {product.reviews.map((r) => (
                  <div key={r.reviewId} className="glass-card p-5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-200 text-sm font-semibold">{r.subject}</span>
                      <span className="text-slate-500 text-xs">{r.author}</span>
                    </div>
                    {r.content && (
                      <p className="text-slate-400 text-sm leading-relaxed">{r.content}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card p-10 text-center text-slate-600 text-sm">
                No reviews for this product yet.
              </div>
            )}
          </section>

          {/* Service Addresses */}
          {product.serviceAddresses && (
            <div className="glass-card overflow-hidden">
              <button
                onClick={() => setShowAddresses(!showAddresses)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/[0.03] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/10"
                aria-expanded={showAddresses}
                aria-controls="service-addresses"
              >
                <span className="text-slate-500 text-sm font-medium flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
                  </svg>
                  Service Addresses
                </span>
                <svg
                  className={`w-4 h-4 text-slate-600 transition-transform duration-200 ${showAddresses ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showAddresses && (
                <div
                  id="service-addresses"
                  className="px-6 pb-6 grid sm:grid-cols-2 gap-2 border-t border-white/[0.06] pt-4"
                >
                  {Object.entries(product.serviceAddresses).map(([key, val]) => (
                    <div key={key} className="bg-white/[0.03] rounded-xl px-3 py-3">
                      <div className="text-slate-600 text-xs uppercase tracking-wider mb-1">{key}</div>
                      <div className="text-slate-400 text-xs font-mono truncate" title={val}>{val}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
