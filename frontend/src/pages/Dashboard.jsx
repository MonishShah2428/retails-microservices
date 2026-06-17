import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client.js'

const STATIC_KPIS = [
  { label: 'Write Throughput', value: '122 req/s', sub: 'POST via RabbitMQ async', color: 'emerald' },
  { label: 'Event Throughput', value: '613 /s', sub: 'Spring Cloud Stream', color: 'emerald' },
  { label: 'P90 Latency', value: '609 ms', sub: 'Under 50 concurrent', color: 'amber' },
  { label: 'Error Rate', value: '0%', sub: 'Under sustained load', color: 'emerald' },
]

const CB_STATE_STYLE = {
  CLOSED: { label: 'CLOSED', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  OPEN: { label: 'OPEN', bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-400' },
  HALF_OPEN: { label: 'HALF OPEN', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  DISABLED: { label: 'DISABLED', bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-400' },
}

function ServiceChip({ name, status }) {
  const up = status?.status === 'UP'
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${
      up ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border-red-500/20 text-red-300'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${up ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
      {name}
    </div>
  )
}

function HeapBar({ used, max }) {
  const pct = max > 0 ? Math.round((used / max) * 100) : 0
  const color = pct > 85 ? 'bg-red-500' : pct > 65 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">JVM Heap Used</span>
        <span className={pct > 85 ? 'text-red-400' : pct > 65 ? 'text-amber-400' : 'text-emerald-400'}>
          {pct}% â€” {Math.round(used / 1024 / 1024)} MB / {Math.round(max / 1024 / 1024)} MB
        </span>
      </div>
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [health, setHealth] = useState(null)
  const [circuitBreakers, setCircuitBreakers] = useState(null)
  const [heap, setHeap] = useState({ used: 0, max: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [healthData, cbData, heapUsed, heapMax] = await Promise.allSettled([
        api.getHealth(),
        api.getCircuitBreakers(),
        api.getHeapMetric(),
        api.getMaxHeapMetric(),
      ])
      if (healthData.status === 'fulfilled') setHealth(healthData.value)
      if (cbData.status === 'fulfilled') setCircuitBreakers(cbData.value)
      if (heapUsed.status === 'fulfilled' && heapMax.status === 'fulfilled') {
        const used = heapUsed.value?.measurements?.[0]?.value ?? 0
        const max = heapMax.value?.measurements?.[0]?.value ?? 0
        setHeap({ used, max })
      }
      if (healthData.status === 'rejected' && cbData.status === 'rejected') {
        setError('Could not reach the actuator endpoints. The gateway may be down or CORS is not configured.')
      }
    } finally {
      setLoading(false)
      setLastRefresh(new Date())
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 30000)
    return () => clearInterval(id)
  }, [refresh])

  const overallStatus = health?.status
  const components = health?.components ?? {}

  const cbCircuit = circuitBreakers?.circuitBreakers?.[0]

  const serviceComponents = [
    ['product-composite', 'Composite'],
    ['product', 'Product'],
    ['recommendation', 'Recommendation'],
    ['review', 'Review'],
  ]

  return (
    <div className="animate-fade-in space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-100">System Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Live health &amp; performance â€” auto-refreshes every 30s</p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-slate-600 text-xs">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button onClick={refresh} disabled={loading}
            className="btn-ghost flex items-center gap-2 text-xs px-4 py-2 disabled:opacity-50">
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-amber-400 text-sm">
          {error}
        </div>
      )}

      {/* Overall Status */}
      <div className="glass-card p-6 flex items-center gap-6">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl ${
          overallStatus === 'UP' ? 'bg-emerald-500/20' : loading ? 'bg-slate-500/20' : 'bg-red-500/20'
        }`}>
          {loading ? (
            <svg className="w-7 h-7 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
          ) : (
            <svg className={`w-7 h-7 ${overallStatus === 'UP' ? 'text-emerald-400' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {overallStatus === 'UP'
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              }
            </svg>
          )}
        </div>
        <div className="flex-1">
          <div className="font-heading text-xl font-semibold text-slate-100">
            {loading ? 'Checking healthâ€¦' : overallStatus === 'UP' ? 'All Systems Operational' : `System Status: ${overallStatus ?? 'Unknown'}`}
          </div>
          <div className="text-slate-500 text-sm mt-1">
            Spring Boot Actuator Â· product-composite-service
          </div>
        </div>
        {!loading && (
          <div className={`text-3xl font-heading font-bold ${overallStatus === 'UP' ? 'text-emerald-400' : 'text-red-400'}`}>
            {overallStatus ?? 'â€”'}
          </div>
        )}
      </div>

      {/* Service Health Row */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="font-heading text-base font-semibold text-slate-200">Service Health</h2>
        {loading ? (
          <div className="flex flex-wrap gap-2">
            {serviceComponents.map(([,label]) => (
              <div key={label} className="h-8 w-32 bg-white/10 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {serviceComponents.map(([key, label]) => (
              <ServiceChip key={key} name={label} status={components[key] ?? { status: health?.status }} />
            ))}
            <ServiceChip name="Gateway" status={{ status: health ? 'UP' : 'UNKNOWN' }} />
            <ServiceChip name="RabbitMQ" status={components.rabbit ?? components.rabbitmq} />
            <ServiceChip name="MongoDB" status={components.mongo} />
            <ServiceChip name="MySQL" status={components.db ?? components.mysql} />
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Circuit Breaker */}
        <div className="glass-card p-6 space-y-5">
          <h2 className="font-heading text-base font-semibold text-slate-200 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            Circuit Breaker
          </h2>

          {loading ? (
            <div className="space-y-3">
              <div className="h-10 bg-white/10 rounded-xl animate-pulse" />
              <div className="h-4 bg-white/5 rounded w-3/4 animate-pulse" />
            </div>
          ) : cbCircuit ? (
            <>
              {(() => {
                const state = cbCircuit.state ?? 'DISABLED'
                const style = CB_STATE_STYLE[state] ?? CB_STATE_STYLE.DISABLED
                return (
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${style.bg} ${style.border}`}>
                    <span className={`w-2 h-2 rounded-full ${style.dot} ${state === 'CLOSED' ? 'animate-pulse' : ''}`} />
                    <span className={`font-heading font-semibold text-lg ${style.text}`}>{style.label}</span>
                  </div>
                )
              })()}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Failure Rate', cbCircuit.failureRate !== undefined ? `${cbCircuit.failureRate}%` : 'â€”'],
                  ['Calls (buffered)', cbCircuit.bufferedCalls ?? 'â€”'],
                  ['Failed Calls', cbCircuit.failedCalls ?? 'â€”'],
                  ['Not Permitted', cbCircuit.notPermittedCalls ?? 'â€”'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-white/5 rounded-lg px-3 py-2">
                    <div className="text-slate-600 text-xs">{k}</div>
                    <div className="text-slate-200 font-medium mt-0.5">{v}</div>
                  </div>
                ))}
              </div>
              <p className="text-slate-600 text-xs">
                Use the delay/faultPercent sliders on Product Detail to trigger OPEN state
              </p>
            </>
          ) : (
            <div className="text-slate-600 text-sm py-4 text-center">
              No circuit breaker data â€” actuator endpoint may be unreachable
            </div>
          )}
        </div>

        {/* JVM Heap */}
        <div className="glass-card p-6 space-y-5">
          <h2 className="font-heading text-base font-semibold text-slate-200 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 9.75V10.5" />
            </svg>
            Runtime Metrics
          </h2>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-white/5 rounded w-full" />
              <div className="h-2 bg-white/10 rounded-full" />
            </div>
          ) : (
            <HeapBar used={heap.used} max={heap.max} />
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Java Version', '21 (LTS)'],
              ['Framework', 'Spring Boot 3.4.5'],
              ['Runtime', 'WebFlux / Netty'],
              ['Threads', 'Non-blocking I/O'],
            ].map(([k, v]) => (
              <div key={k} className="bg-white/5 rounded-lg px-3 py-2">
                <div className="text-slate-600 text-xs">{k}</div>
                <div className="text-slate-200 font-medium text-xs mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Static KPI Cards */}
      <div>
        <p className="text-slate-600 text-xs uppercase tracking-widest mb-4 font-medium">
          Benchmarked Performance â€” wrk load test, 30s, 2 threads, 50 connections
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATIC_KPIS.map((kpi) => (
            <div key={kpi.label} className="glass-card p-5 space-y-1">
              <div className={`text-2xl font-heading font-bold ${kpi.color === 'amber' ? 'text-amber-400' : 'text-emerald-400'}`}>
                {kpi.value}
              </div>
              <div className="text-slate-200 text-sm font-medium">{kpi.label}</div>
              <div className="text-slate-600 text-xs">{kpi.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Deployment Info */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="font-heading text-base font-semibold text-slate-200">Deployment</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Cloud', value: 'AWS EC2 m7i-flex.large', icon: 'â˜' },
            { label: 'CI/CD', value: 'Jenkins on EC2', icon: 'âš™' },
            { label: 'Registry', value: 'Docker Hub (fierypriest)', icon: 'ðŸ³' },
            { label: 'Version', value: 'v1.0.0 (tagged)', icon: 'ðŸ·' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/5 rounded-xl p-4 border border-white/5">
              <div className="text-slate-600 text-xs uppercase tracking-wider mb-1">{label}</div>
              <div className="text-slate-300 text-sm font-medium">{value}</div>
            </div>
          ))}
        </div>
        <div className="text-slate-600 text-xs">
          Pipeline: push to dev â†’ Jenkins build â†’ Docker push â†’ SSH deploy â†’ docker-compose up on App EC2
        </div>
      </div>
    </div>
  )
}
