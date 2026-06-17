import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client.js'

const STATIC_KPIS = [
  { label: 'Write Throughput', value: '122', unit: 'req/s', sub: 'POST via RabbitMQ async',    color: 'text-emerald-400' },
  { label: 'Event Throughput', value: '613', unit: '/s',    sub: 'Spring Cloud Stream',         color: 'text-emerald-400' },
  { label: 'P50 Latency',      value: '188', unit: 'ms',    sub: 'Median response time',        color: 'text-emerald-400' },
  { label: 'P90 Latency',      value: '609', unit: 'ms',    sub: 'Under 50 concurrent',         color: 'text-amber-400'   },
  { label: 'P99 Latency',      value: '1.51', unit: 's',   sub: 'Under concurrent load',        color: 'text-red-400'     },
  { label: 'Error Rate',       value: '0%',  unit: '',      sub: 'Under sustained load',        color: 'text-emerald-400' },
  { label: 'Read Throughput',  value: '54',  unit: 'req/s', sub: 'GET composite (cold)',        color: 'text-sky-400'     },
  { label: 'Concurrency',      value: '50',  unit: 'conn',  sub: 'wrk 2 threads / 50 clients', color: 'text-slate-400'   },
]

const CB_STATE = {
  CLOSED:    { label: 'CLOSED',    classes: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400', dot: 'bg-emerald-400 animate-pulse' },
  OPEN:      { label: 'OPEN',      classes: 'bg-red-500/15    border-red-500/25    text-red-400',       dot: 'bg-red-400' },
  HALF_OPEN: { label: 'HALF OPEN', classes: 'bg-amber-500/15  border-amber-500/25  text-amber-400',     dot: 'bg-amber-400' },
  DISABLED:  { label: 'DISABLED',  classes: 'bg-slate-500/15  border-slate-500/25  text-slate-400',     dot: 'bg-slate-500' },
}

function ServiceChip({ name, status }) {
  if (status === undefined) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.06] text-xs font-medium text-slate-500">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-700 shrink-0" aria-hidden="true" />
        {name}
      </div>
    )
  }
  const up = status?.status === 'UP'
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${
        up
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
          : 'bg-red-500/10 border-red-500/20 text-red-300'
      }`}
      role="status"
      aria-label={`${name}: ${up ? 'UP' : 'DOWN'}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${up ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} aria-hidden="true" />
      {name}
      <span className="sr-only">{up ? 'operational' : 'down'}</span>
    </div>
  )
}

function HeapBar({ used, max }) {
  const pct = max > 0 ? Math.round((used / max) * 100) : 0
  const barColor = pct > 85 ? 'bg-red-500' : pct > 65 ? 'bg-amber-500' : 'bg-emerald-500'
  const textColor = pct > 85 ? 'text-red-400' : pct > 65 ? 'text-amber-400' : 'text-emerald-400'
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400 font-medium">JVM Heap Used</span>
        <span className={`font-mono font-semibold tabular-nums ${textColor}`}>
          {pct}% &mdash; {Math.round(used / 1024 / 1024)} MB / {Math.round(max / 1024 / 1024)} MB
        </span>
      </div>
      <div
        className="w-full h-2 bg-white/10 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`JVM heap usage: ${pct}%`}
      >
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${pct}%` }}
        />
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
      const [healthRes, cbRes, heapUsedRes, heapMaxRes] = await Promise.allSettled([
        api.getHealth(),
        api.getCircuitBreakers(),
        api.getHeapMetric(),
        api.getMaxHeapMetric(),
      ])
      if (healthRes.status === 'fulfilled') setHealth(healthRes.value)
      if (cbRes.status === 'fulfilled') setCircuitBreakers(cbRes.value)
      if (heapUsedRes.status === 'fulfilled' && heapMaxRes.status === 'fulfilled') {
        setHeap({
          used: heapUsedRes.value?.measurements?.[0]?.value ?? 0,
          max:  heapMaxRes.value?.measurements?.[0]?.value ?? 0,
        })
      }
      if (healthRes.status === 'rejected' && cbRes.status === 'rejected') {
        setError('Actuator endpoints unreachable. CORS may not be configured or the gateway is down.')
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

  const components = health?.components ?? {}
  const cbData = circuitBreakers?.circuitBreakers?.[0]

  return (
    <div className="animate-fade-in pb-12 space-y-8">

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">System Dashboard</h1>
          <p className="page-subtitle">
            Live health and performance &mdash; auto-refreshes every 30s
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {lastRefresh && (
            <time
              dateTime={lastRefresh.toISOString()}
              className="text-slate-600 text-xs hidden sm:block font-mono"
              aria-label={`Last refreshed at ${lastRefresh.toLocaleTimeString()}`}
            >
              {lastRefresh.toLocaleTimeString()}
            </time>
          )}
          <button
            onClick={refresh}
            disabled={loading}
            className="btn-ghost text-xs py-2 px-4 disabled:opacity-50"
            aria-label={loading ? 'Refreshing dashboard...' : 'Refresh dashboard'}
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-amber-400 text-sm flex items-start gap-3"
          role="alert"
          aria-live="polite"
        >
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      {/* Overall Status Banner */}
      <div className="glass-card p-6 flex items-center gap-5" role="status" aria-live="polite">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
          loading ? 'bg-slate-800/60' : health?.status === 'UP' ? 'bg-emerald-500/20' : 'bg-red-500/20'
        }`} aria-hidden="true">
          {loading ? (
            <svg className="w-6 h-6 text-slate-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : health?.status === 'UP' ? (
            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading text-lg font-semibold text-slate-100">
            {loading
              ? 'Checking system health...'
              : health?.status === 'UP'
              ? 'All Systems Operational'
              : `System Status: ${health?.status ?? 'Unknown'}`}
          </p>
          <p className="text-slate-600 text-sm mt-0.5 font-mono">
            product-composite-service &mdash; Spring Boot Actuator
          </p>
        </div>
        {!loading && health?.status && (
          <span className={`font-mono text-2xl font-bold tabular-nums ${health.status === 'UP' ? 'text-emerald-400' : 'text-red-400'}`}>
            {health.status}
          </span>
        )}
      </div>

      {/* Service Health */}
      <section className="glass-card p-6 space-y-4" aria-labelledby="health-heading">
        <h2 id="health-heading" className="section-title">Service Health</h2>
        {loading ? (
          <div className="flex flex-wrap gap-2" aria-label="Loading service health">
            {['Composite', 'Product', 'Recommendation', 'Review', 'Gateway', 'RabbitMQ', 'MongoDB', 'MySQL'].map((n) => (
              <div key={n} className="h-8 w-28 bg-white/[0.04] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2" role="list" aria-label="Service status indicators">
            <ServiceChip name="Composite"      status={health ? { status: health.status } : undefined} />
            <ServiceChip name="Product"        status={components['product-composite'] ?? (health ? { status: health.status } : undefined)} />
            <ServiceChip name="Recommendation" status={components.recommendation ?? (health ? { status: health.status } : undefined)} />
            <ServiceChip name="Review"         status={components.review ?? (health ? { status: health.status } : undefined)} />
            <ServiceChip name="Gateway"        status={health ? { status: 'UP' } : undefined} />
            <ServiceChip name="RabbitMQ"       status={components.rabbit ?? components.rabbitmq} />
            <ServiceChip name="MongoDB"        status={components.mongo} />
            <ServiceChip name="MySQL"          status={components.db} />
          </div>
        )}
        <p className="text-slate-700 text-xs">
          MongoDB and MySQL are monitored via core services and not directly visible from the composite
        </p>
      </section>

      <div className="grid md:grid-cols-2 gap-6">

        {/* Circuit Breaker */}
        <section className="glass-card p-6 space-y-5" aria-labelledby="cb-heading">
          <h2 id="cb-heading" className="section-title flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            Circuit Breaker
          </h2>

          {loading ? (
            <div className="space-y-3 animate-pulse" aria-label="Loading circuit breaker data">
              <div className="h-12 bg-white/[0.04] rounded-xl" />
              <div className="grid grid-cols-2 gap-2">
                {[0,1,2,3].map(i => <div key={i} className="h-12 bg-white/[0.04] rounded-lg" />)}
              </div>
            </div>
          ) : cbData ? (() => {
            const state = cbData.state ?? 'DISABLED'
            const style = CB_STATE[state] ?? CB_STATE.DISABLED
            return (
              <div className="space-y-4">
                <div
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border ${style.classes}`}
                  role="status"
                  aria-label={`Circuit breaker state: ${style.label}`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${style.dot}`} aria-hidden="true" />
                  <span className="font-heading font-bold text-xl tracking-wide">{style.label}</span>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    ['Failure Rate', cbData.failureRate !== undefined ? `${cbData.failureRate}%` : '--'],
                    ['Buffered Calls', cbData.bufferedCalls ?? '--'],
                    ['Failed Calls', cbData.failedCalls ?? '--'],
                    ['Not Permitted', cbData.notPermittedCalls ?? '--'],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-white/[0.03] rounded-lg px-3 py-2.5">
                      <dt className="text-slate-600 text-xs mb-0.5">{k}</dt>
                      <dd className="text-slate-200 font-mono font-semibold tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-slate-700 text-xs">
                  Use delay / faultPercent sliders on Product Detail to trigger OPEN state
                </p>
              </div>
            )
          })() : (
            <div className="py-10 text-center text-slate-600 text-sm">
              No circuit breaker data &mdash; actuator endpoint may be unreachable
            </div>
          )}
        </section>

        {/* JVM + Runtime */}
        <section className="glass-card p-6 space-y-5" aria-labelledby="runtime-heading">
          <h2 id="runtime-heading" className="section-title flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 9.75V10.5" />
            </svg>
            Runtime Metrics
          </h2>

          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="flex justify-between">
                <div className="h-3 bg-white/[0.04] rounded w-24" />
                <div className="h-3 bg-white/[0.04] rounded w-32" />
              </div>
              <div className="h-2 bg-white/10 rounded-full" />
            </div>
          ) : (
            <HeapBar used={heap.used} max={heap.max} />
          )}

          <dl className="grid grid-cols-2 gap-2">
            {[
              ['Java Version', '21 LTS'],
              ['Framework', 'Spring Boot 3.4'],
              ['Runtime', 'WebFlux / Netty'],
              ['I/O Model', 'Non-blocking'],
            ].map(([k, v]) => (
              <div key={k} className="bg-white/[0.03] rounded-lg px-3 py-2.5">
                <dt className="text-slate-600 text-xs mb-0.5">{k}</dt>
                <dd className="text-slate-300 text-xs font-mono font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

      </div>

      {/* Performance KPIs */}
      <section className="space-y-4" aria-labelledby="perf-heading">
        <div>
          <h2 id="perf-heading" className="section-title">Performance Benchmarks</h2>
          <p className="text-slate-600 text-xs mt-1">
            wrk load test &mdash; 30s duration, 2 threads, varying connections, live AWS EC2
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="list">
          {STATIC_KPIS.map((kpi) => (
            <div key={kpi.label} className="glass-card p-5 space-y-1.5" role="listitem">
              <div className={`font-mono text-2xl font-bold tabular-nums ${kpi.color}`}>
                {kpi.value}
                {kpi.unit && (
                  <span className="text-base font-medium ml-0.5 opacity-75">{kpi.unit}</span>
                )}
              </div>
              <div className="text-slate-300 text-xs font-semibold">{kpi.label}</div>
              <div className="text-slate-600 text-xs">{kpi.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Deployment */}
      <section className="glass-card p-6 space-y-5" aria-labelledby="deploy-heading">
        <h2 id="deploy-heading" className="section-title">Deployment</h2>
        <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Cloud Provider', value: 'AWS EC2' },
            { label: 'Instance Type', value: 'm7i-flex.large' },
            { label: 'CI/CD', value: 'Jenkins on EC2' },
            { label: 'Registry', value: 'Docker Hub' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
              <dt className="text-slate-600 text-xs uppercase tracking-wider mb-1.5">{label}</dt>
              <dd className="text-slate-200 text-sm font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-slate-700 text-xs font-mono">
          dev push &rarr; Jenkins build &rarr; Docker push &rarr; SSH deploy &rarr; docker-compose up
        </p>
      </section>

    </div>
  )
}
