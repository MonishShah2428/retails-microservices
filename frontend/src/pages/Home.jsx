import { Link } from 'react-router-dom'

const kpis = [
  { label: 'Write Throughput', value: '122', unit: 'req/s', desc: 'Async via RabbitMQ', color: 'emerald' },
  { label: 'Event Throughput', value: '613', unit: 'events/s', desc: 'Spring Cloud Stream', color: 'emerald' },
  { label: 'Error Rate', value: '0%', unit: '', desc: 'Under sustained load', color: 'emerald' },
  { label: 'Services Up', value: '5/5', unit: '', desc: 'Eureka registered', color: 'emerald' },
]

const stack = [
  'Java 21', 'Spring Boot 3.4', 'WebFlux', 'RabbitMQ',
  'MongoDB', 'MySQL', 'Resilience4j', 'Zipkin',
  'Docker', 'AWS EC2', 'Jenkins', 'Spring Cloud',
]

const services = [
  { name: 'Product Service', desc: 'Reactive MongoDB â€” product catalogue', port: ':7001' },
  { name: 'Recommendation Service', desc: 'Reactive MongoDB â€” user recommendations', port: ':7002' },
  { name: 'Review Service', desc: 'JPA + MySQL â€” structured reviews', port: ':7003' },
  { name: 'Product Composite', desc: 'Aggregator â€” fan-out to 3 services', port: ':7000' },
  { name: 'Spring Cloud Gateway', desc: 'TLS gateway â€” HTTPS :8443', port: ':8443' },
  { name: 'Eureka Server', desc: 'Service discovery registry', port: ':8761' },
  { name: 'Config Server', desc: 'Centralised runtime configuration', port: ':8888' },
]

export default function Home() {
  return (
    <div className="animate-fade-in space-y-16 pb-16">
      {/* Hero */}
      <section className="pt-12 pb-4 text-center space-y-6">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 text-emerald-400 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live on AWS EC2 â€” v1.0.0
        </div>

        <h1 className="font-heading text-5xl sm:text-6xl font-bold text-slate-100 leading-tight tracking-tight">
          Retail <span className="text-emerald-400">Microservices</span>
        </h1>

        <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
          A 7-service Spring Cloud system with reactive WebFlux, async RabbitMQ event streaming,
          Resilience4j circuit breakers, and distributed Zipkin tracing â€” deployed via Jenkins CI/CD.
        </p>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Link to="/products" className="btn-primary text-base px-6 py-3">
            Browse Products
          </Link>
          <Link to="/dashboard" className="btn-ghost text-base px-6 py-3">
            System Dashboard
          </Link>
        </div>
      </section>

      {/* KPI Cards */}
      <section>
        <p className="text-slate-500 text-xs uppercase tracking-widest text-center mb-6 font-medium">
          Benchmarked KPIs â€” measured on live system
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="glass-card p-6 text-center space-y-1">
              <div className="text-4xl font-heading font-bold text-emerald-400">
                {kpi.value}
                {kpi.unit && <span className="text-xl ml-1 text-emerald-500">{kpi.unit}</span>}
              </div>
              <div className="text-slate-200 text-sm font-medium">{kpi.label}</div>
              <div className="text-slate-500 text-xs">{kpi.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture */}
      <section className="glass-card p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-semibold text-slate-100">Architecture</h2>
          <span className="text-slate-500 text-xs">7 services Â· Docker Compose</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {services.map((s) => (
            <div key={s.name} className="flex items-start gap-3 bg-white/5 rounded-xl p-4 border border-white/5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <div>
                <div className="text-slate-200 text-sm font-medium">{s.name}
                  <span className="text-slate-600 text-xs ml-1.5 font-mono">{s.port}</span>
                </div>
                <div className="text-slate-500 text-xs mt-0.5">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="text-center space-y-4">
        <h2 className="font-heading text-lg font-medium text-slate-400">Technology Stack</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {stack.map((t) => (
            <span key={t} className="bg-white/5 border border-white/10 text-slate-300 text-xs px-3 py-1.5 rounded-lg font-medium">
              {t}
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}
