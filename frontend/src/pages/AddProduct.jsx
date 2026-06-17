import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client.js'
import InteractiveStars from '../components/InteractiveStars.jsx'

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}

export default function AddProduct() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [productId, setProductId] = useState('')
  const [name, setName] = useState('')
  const [weight, setWeight] = useState('')

  const [recommendations, setRecommendations] = useState([
    { recommendationId: 1, author: '', rate: 0, content: '' },
  ])
  const [reviews, setReviews] = useState([
    { reviewId: 1, author: '', subject: '', content: '' },
  ])

  function addRecommendation() {
    setRecommendations((prev) => [
      ...prev,
      { recommendationId: prev.length + 1, author: '', rate: 0, content: '' },
    ])
  }

  function removeRecommendation(idx) {
    setRecommendations((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateRec(idx, field, value) {
    setRecommendations((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))
  }

  function addReview() {
    setReviews((prev) => [
      ...prev,
      { reviewId: prev.length + 1, author: '', subject: '', content: '' },
    ])
  }

  function removeReview(idx) {
    setReviews((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateRev(idx, field, value) {
    setReviews((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await api.createProduct({
        productId: Number(productId),
        name,
        weight: Number(weight),
        recommendations: recommendations.filter((r) => r.author),
        reviews: reviews.filter((r) => r.author && r.subject),
      })
      navigate(`/products/${productId}`)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="animate-fade-in max-w-2xl pb-12 space-y-8">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-600">
        <Link to="/products" className="hover:text-slate-300 transition-colors">Products</Link>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-slate-400">New Product</span>
      </nav>

      <div className="page-header mb-0">
        <h1 className="page-title">Add Product</h1>
        <p className="page-subtitle">
          Publishes CREATE events to product, recommendation, and review services via RabbitMQ.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm flex items-start gap-2" role="alert">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>

        {/* Product Info */}
        <div className="glass-card p-6 space-y-5">
          <h2 className="section-title">Product Info</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="label" htmlFor="productId">Product ID <span className="text-red-500">*</span></label>
              <input
                id="productId" type="number" required min={1} value={productId}
                onChange={(e) => setProductId(e.target.value)}
                placeholder="e.g. 42" className="input-field"
                aria-describedby="productId-hint"
              />
              <p id="productId-hint" className="text-slate-600 text-xs mt-1.5">Must be a unique integer</p>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="name">Name <span className="text-red-500">*</span></label>
              <input
                id="name" type="text" required value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Wireless Headphones" className="input-field"
              />
            </div>
          </div>
          <div className="max-w-xs">
            <label className="label" htmlFor="weight">Weight (grams) <span className="text-red-500">*</span></label>
            <input
              id="weight" type="number" required min={0} value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 250" className="input-field"
            />
          </div>
        </div>

        {/* Recommendations */}
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title">Recommendations</h2>
              <p className="text-slate-600 text-xs mt-0.5">Leave author blank to skip</p>
            </div>
            <button type="button" onClick={addRecommendation} className="btn-ghost text-xs py-1.5 px-3">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add
            </button>
          </div>

          <div className="space-y-4">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="bg-white/[0.03] rounded-xl p-5 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 text-xs font-mono">rec_{idx + 1}</span>
                  {recommendations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRecommendation(idx)}
                      className="text-slate-700 hover:text-red-400 transition-colors p-1 cursor-pointer"
                      aria-label="Remove recommendation"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Author</label>
                    <input
                      type="text" value={rec.author}
                      onChange={(e) => updateRec(idx, 'author', e.target.value)}
                      placeholder="Author name" className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Rating</label>
                    <div className="pt-1">
                      <InteractiveStars value={rec.rate} onChange={(v) => updateRec(idx, 'rate', v)} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label">Content</label>
                  <input
                    type="text" value={rec.content}
                    onChange={(e) => updateRec(idx, 'content', e.target.value)}
                    placeholder="Brief recommendation text" className="input-field"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews */}
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title">Reviews</h2>
              <p className="text-slate-600 text-xs mt-0.5">Leave author blank to skip</p>
            </div>
            <button type="button" onClick={addReview} className="btn-ghost text-xs py-1.5 px-3">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add
            </button>
          </div>

          <div className="space-y-4">
            {reviews.map((rev, idx) => (
              <div key={idx} className="bg-white/[0.03] rounded-xl p-5 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 text-xs font-mono">review_{idx + 1}</span>
                  {reviews.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeReview(idx)}
                      className="text-slate-700 hover:text-red-400 transition-colors p-1 cursor-pointer"
                      aria-label="Remove review"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Author</label>
                    <input
                      type="text" value={rev.author}
                      onChange={(e) => updateRev(idx, 'author', e.target.value)}
                      placeholder="Author name" className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Subject</label>
                    <input
                      type="text" value={rev.subject}
                      onChange={(e) => updateRev(idx, 'subject', e.target.value)}
                      placeholder="Review subject line" className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Content</label>
                  <input
                    type="text" value={rev.content}
                    onChange={(e) => updateRev(idx, 'content', e.target.value)}
                    placeholder="Full review text" className="input-field"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating...
              </>
            ) : 'Create Product'}
          </button>
          <Link to="/products" className="btn-ghost px-6 py-3">Cancel</Link>
        </div>

      </form>
    </div>
  )
}
