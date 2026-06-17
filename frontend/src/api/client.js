const BASE = import.meta.env.VITE_API_URL || '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const err = text ? JSON.parse(text) : {}
    throw Object.assign(new Error(err.message || res.statusText), { status: res.status })
  }
  const text = await res.text()
  if (!text) return null
  try { return JSON.parse(text) } catch { return null }
}

export const api = {
  getProduct: (id, delay = 0, faultPercent = 0) => {
    const params = new URLSearchParams()
    if (delay > 0) params.set('delay', delay)
    if (faultPercent > 0) params.set('faultPercent', faultPercent)
    const qs = params.toString()
    return request(`/product-composite/${id}${qs ? '?' + qs : ''}`)
  },

  createProduct: (body) =>
    request('/product-composite', { method: 'POST', body: JSON.stringify(body) }),

  deleteProduct: (id) =>
    request(`/product-composite/${id}`, { method: 'DELETE' }),

  getHealth: () =>
    request('/product-composite/actuator/health'),

  getCircuitBreakers: () =>
    request('/product-composite/actuator/circuitbreakers'),

  getHeapMetric: () =>
    request('/product-composite/actuator/metrics/jvm.memory.used?tag=area:heap'),

  getMaxHeapMetric: () =>
    request('/product-composite/actuator/metrics/jvm.memory.max?tag=area:heap'),
}
