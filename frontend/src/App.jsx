import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Home from './pages/Home.jsx'
import ProductCatalog from './pages/ProductCatalog.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import AddProduct from './pages/AddProduct.jsx'
import Dashboard from './pages/Dashboard.jsx'

export default function App() {
  return (
    <div className="min-h-screen bg-[#020617]">
      {/* Ambient background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-blob-slow" />
        <div className="absolute top-[30%] right-[-10%] w-80 h-80 bg-indigo-500/8 rounded-full blur-3xl animate-blob-slow [animation-delay:4s]" />
        <div className="absolute bottom-[-10%] left-[30%] w-72 h-72 bg-emerald-600/8 rounded-full blur-3xl animate-blob-slow [animation-delay:8s]" />
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30" />
      </div>

      <div className="relative z-10">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<ProductCatalog />} />
            <Route path="/products/new" element={<AddProduct />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
