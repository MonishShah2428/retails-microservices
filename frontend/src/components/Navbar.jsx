import { useState, useEffect } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home', exact: true },
  { to: '/products', label: 'Products' },
  { to: '/dashboard', label: 'Dashboard' },
]

const activeClass = 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
const inactiveClass = 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  return (
    <nav
      className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-white/[0.08]"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group rounded-lg px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
            aria-label="Retail Microservices — go to home"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center group-hover:bg-emerald-400 transition-colors duration-200 shrink-0">
              <svg className="w-4 h-4 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 9.75V10.5" />
              </svg>
            </div>
            <span className="font-heading font-semibold text-slate-100 text-sm tracking-tight group-hover:text-emerald-400 transition-colors duration-200">
              Retail<span className="text-emerald-400 group-hover:text-slate-100 transition-colors duration-200">MS</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(({ to, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${isActive ? activeClass : inactiveClass}`
                }
              >
                {label}
              </NavLink>
            ))}
            <Link
              to="/products/new"
              className="ml-3 btn-primary py-2 text-xs min-h-[36px]"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Product
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 cursor-pointer"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>

        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden border-t border-white/[0.08] bg-slate-950/95 backdrop-blur-xl"
        >
          <div className="px-4 py-3 space-y-1">
            {links.map(({ to, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  `block px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${isActive ? activeClass : inactiveClass}`
                }
              >
                {label}
              </NavLink>
            ))}
            <div className="pt-2 border-t border-white/[0.06] mt-2">
              <Link
                to="/products/new"
                className="btn-primary w-full justify-center py-3 text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Product
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
