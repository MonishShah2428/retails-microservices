import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client.js'
import StarRating from '../components/StarRating.jsx'

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-white/10 rounded w-1/3" />
      <div className="h-4 bg-white/5 rounded w-1/4" />
      <div className="grid md:grid-cols-2 gap-4">
        {[0, 1].map(i => (
          <div key={i} className="glass-card p-6 space-y-3">
            <div className="h-4 bg-white/10 rounded w-1/2" />
            <div className="h-3 bg-white/5 rounded" />
            <div className="h-3 bg-white/5 rounded w-3/4" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showAddresses, setShowAddresses] = useState(false)

  // Fault injection controls
  const [delay, setDelay] = useState(0)
  const [faultPct, setFaultPct] = useState(0)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getProduct(id, delay, faultPct)
      setProduct(data)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [id, delay, faultPct])

  useEffect(() => { fetch() }, [fetch])

  async function handleDelete() {
    if (!window.confirm(`Delete product #${id}? This is irreversible.`)) return
    setDeleting(true)
    try {
      await api.deleteProduct(id)
      navigate('/products')
    } catch (e) {
      alert(`Failed to delete: ${e.message}`)
      setDeleting(false)
    }
  }

  return (
    <div className="animate-fade-in space-y-6 pb-12 max-w-4xl">
      <div className="flex items-center gap-2 text-slate-500 text-sm">
        <Link to="/products" className="hover:text-slate-300 transition-colors">Products</Link>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-slate-300">#{id}</span>
      </div>

      {/* Fault injection */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <span className="text-amber-400 text-sm font-medium">Fault Injection</span>
          <span className="text-slate-600 text-xs ml-1">â€” triggers circuit breaker demo</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Delay â€” {delay}ms</label>
            <input type="range" min={0} max={3000} step={100} value={delay}
              onChange={e => setDelay(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer" />
            <div className="flex justify-between text-slate-600 text-xs mt-1"><span>0ms</span><span>3000ms</span></div>
          </div>
          <div>
            <label className="label">Fault Percent â€” {faultPct}%</label>
            <input type="range" min={0} max={100} step={5} value={faultPct}
              onChange={e => setFaultPct(Number(e.target.value))}
              className="w-full accent-red-400 cursor-pointer" />
            <div className="flex justify-between text-slate-600 text-xs mt-1"><span>0%</span><span>100%</span></div>
          </div>
        </div>
        <button onClick={fetch} className="btn-ghost text-xs px-4 py-2">
          Refetch with params
        </button>
      </div>

      {loading ? <Skeleton /> : error ? (
        <div className="glass-card p-10 text-center space-y-3">
          <div className="text-red-400 font-medium">
            {error.status === 404 ? 'Product not found' : `Error: ${error.message}`}
          </div>
          <p className="text-slate-500 text-sm">
            {error.status === 404 ? 'This product ID does not exist.' : 'The service may be unavailable or the circuit breaker is open.'}
          </p>
          <Link to="/products" className="btn-ghost inline-block text-sm mt-2">Back to catalog</Link>
        </div>
      ) : product && (
        <>
          {/* Product header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl font-bold text-slate-100">{product.name}</h1>
              <div className="flex items-center gap-3 mt-2 text-slate-500 text-sm">
                <span className="font-mono text-emerald-500/80">#{product.productId}</span>
                <span>Â·</span>
                <span>{product.weight}g</span>
                <span>Â·</span>
                <span>{product.recommendations?.length ?? 0} recommendations</span>
                <span>Â·</span>
                <span>{product.reviews?.length ?? 0} reviews</span>
              </div>
            </div>
            <button onClick={handleDelete} disabled={deleting}
              className="btn-danger shrink-0 disabled:opacity-50">
              {deleting ? 'Deletingâ€¦' : 'Delete'}
            </button>
          </div>

          {/* Recommendations */}
          <div className="space-y-3">
            <h2 className="font-heading text-lg font-semibold text-slate-200 flex items-center gap-2">
              Recommendations
              <span className="text-slate-600 text-sm font-normal font-body">({product.recommendations?.length ?? 0})</span>
            </h2>
            {product.recommendations?.length ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {product.recommendations.map((r) => (
                  <div key={r.recommendationId} className="glass-card p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm font-medium">{r.author}</span>
                      <StarRating rate={r.rate} />
                    </div>
                    {r.content && <p className="text-slate-500 text-xs leading-relaxed">{r.content}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card p-6 text-center text-slate-600 text-sm">No recommendations yet</div>
            )}
          </div>

          {/* Reviews */}
          <div className="space-y-3">
            <h2 className="font-heading text-lg font-semibold text-slate-200 flex items-center gap-2">
              Reviews
              <span className="text-slate-600 text-sm font-normal font-body">({product.reviews?.length ?? 0})</span>
            </h2>
            {product.reviews?.length ? (
              <div className="space-y-3">
                {product.reviews.map((r) => (
                  <div key={r.reviewId} className="glass-card p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm font-semibold">{r.subject}</span>
                      <span className="text-slate-500 text-xs">{r.author}</span>
                    </div>
                    {r.content && <p className="text-slate-400 text-sm leading-relaxed">{r.content}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card p-6 text-center text-slate-600 text-sm">No reviews yet</div>
            )}
          </div>

          {/* Service Addresses */}
          {product.serviceAddresses && (
            <div className="glass-card overflow-hidden">
              <button
                onClick={() => setShowAddresses(!showAddresses)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
              >
                <span className="text-slate-400 text-sm font-medium flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                  Service Addresses
                </span>
                <svg className={`w-4 h-4 text-slate-600 transition-transform ${showAddresses ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showAddresses && (
                <div className="px-5 pb-5 grid sm:grid-cols-2 gap-2 border-t border-white/5">
                  {Object.entries(product.serviceAddresses).map(([key, val]) => (
                    <div key={key} className="bg-white/5 rounded-lg px-3 py-2">
                      <span className="text-slate-600 text-xs uppercase tracking-wider">{key}</span>
                      <div className="text-slate-400 text-xs font-mono mt-0.5 truncate">{val}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
