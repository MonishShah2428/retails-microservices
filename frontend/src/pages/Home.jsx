import { Link } from 'react-router-dom'

const kpis = [
  { label: 'Write Throughput', value: '122', unit: 'req/s', desc: 'POST async via RabbitMQ', accent: true },
  { label: 'Event Throughput', value: '613', unit: '/s', desc: 'Spring Cloud Stream', accent: true },
  { label: 'Error Rate', value: '0%', unit: '', desc: 'Under sustained load', accent: true },
  { label: 'P90 Latency', value: '609', unit: 'ms', desc: '50 concurrent clients', accent: false },
]

const services = [
  { name: 'product-service',       desc: 'Reactive MongoDB',     port: ':7001', dot: 'bg-emerald-400' },
  { name: 'recommendation-service', desc: 'Reactive MongoDB',    port: ':7002', dot: 'bg-emerald-400' },
  { name: 'review-service',        desc: 'JPA + MySQL',           port: ':7003', dot: 'bg-emerald-400' },
  { name: 'product-composite',     desc: 'Aggregator service',    port: ':7000', dot: 'bg-sky-400' },
  { name: 'spring-cloud-gateway',  desc: 'TLS :8443 entry point', port: ':8443', dot: 'bg-violet-400' },
  { name: 'eureka-server',         desc: 'Service discovery',     port: ':8761', dot: 'bg-slate-500' },
  { name: 'config-server',         desc: 'Central configuration', port: ':8888', dot: 'bg-slate-500' },
]

const stack = [
  'Java 21', 'Spring Boot 3.4', 'WebFlux', 'Netty',
  'RabbitMQ', 'MongoDB', 'MySQL', 'Resilience4j',
  'Zipkin', 'Docker', 'AWS EC2', 'Jenkins CI/CD',
]

export default function Home() {
  return (
    <div className="animate-fade-in pb-20 space-y-20">

      {/* Hero */}
      <section className="pt-14 text-center space-y-6 max-w-3xl mx-auto" aria-labelledby="hero-heading">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 text-emerald-400 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
          Live on AWS EC2 m7i-flex.large
        </div>

        <h1 id="hero-heading" className="font-heading text-5xl sm:text-6xl font-extrabold text-slate-50 leading-[1.1] tracking-tight">
          Retail{' '}
          <span className="text-emerald-400">Microservices</span>
        </h1>

        <p className="text-slate-400 text-lg leading-relaxed max-w-xl mx-auto">
          A production-grade 7-service Spring Cloud system with reactive WebFlux,
          async event streaming via RabbitMQ, Resilience4j circuit breakers,
          and distributed Zipkin tracing. Deployed via Jenkins CI/CD.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to="/products" className="btn-primary px-7 py-3 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
            </svg>
            Browse Products
          </Link>
          <Link to="/dashboard" className="btn-ghost px-7 py-3 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            System Dashboard
          </Link>
        </div>
      </section>

      {/* KPI Cards */}
      <section aria-labelledby="kpi-heading">
        <p id="kpi-heading" className="text-slate-600 text-xs uppercase tracking-widest text-center mb-6 font-semibold">
          Benchmarked on live system &mdash; wrk, 30s, 2 threads, 50 connections
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" role="list">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="glass-card p-6 space-y-2 text-center"
              role="listitem"
            >
              <div className={`font-mono text-4xl font-bold tabular-nums ${kpi.accent ? 'text-emerald-400' : 'text-amber-400'}`}>
                {kpi.value}
                {kpi.unit && (
                  <span className="text-xl font-medium ml-1 opacity-70">{kpi.unit}</span>
                )}
              </div>
              <div className="text-slate-200 text-sm font-semibold">{kpi.label}</div>
              <div className="text-slate-500 text-xs">{kpi.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture */}
      <section className="glass-card p-8 space-y-6" aria-labelledby="arch-heading">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="arch-heading" className="section-title text-lg">Service Architecture</h2>
            <p className="text-slate-500 text-sm mt-1">7 services &mdash; Docker Compose &mdash; AWS EC2</p>
          </div>
          <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3 py-1 rounded-full font-medium shrink-0">
            v1.0.0
          </span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {services.map((s) => (
            <div
              key={s.name}
              className="flex items-start gap-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl p-4 border border-white/[0.06] hover:border-white/10 transition-all duration-200"
            >
              <span className={`w-2 h-2 rounded-full ${s.dot} mt-1.5 shrink-0`} aria-hidden="true" />
              <div className="min-w-0">
                <div className="text-slate-200 text-xs font-mono font-medium truncate">{s.name}</div>
                <div className="text-slate-500 text-xs mt-0.5">{s.desc}</div>
                <div className="text-slate-600 text-xs font-mono mt-0.5">{s.port}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="text-center space-y-5" aria-labelledby="stack-heading">
        <h2 id="stack-heading" className="section-title text-slate-500 uppercase text-xs tracking-widest font-semibold">
          Technology Stack
        </h2>
        <div className="flex flex-wrap justify-center gap-2">
          {stack.map((t) => (
            <span
              key={t}
              className="bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 text-xs px-3 py-2 rounded-lg font-medium transition-colors duration-200"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

    </div>
  )
}
