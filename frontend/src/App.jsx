/**
 * App.jsx — Root component with sidebar layout and routing.
 */

import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Menu } from 'lucide-react'

import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import RegisterFile from './pages/RegisterFile'
import RegisteredFiles from './pages/RegisteredFiles'
import FileDetail from './pages/FileDetail'
import VerifyFile from './pages/VerifyFile'
import History from './pages/History'
import Reports from './pages/Reports'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <main className="flex-1 lg:ml-64 min-h-screen flex flex-col">
        {/* Top bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-navy-950/90 backdrop-blur border-b border-navy-800/60">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-navy-800 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-slate-200">FileGuard</span>
        </header>

        {/* Page content */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Routes>
            <Route path="/"             element={<Dashboard />} />
            <Route path="/register"     element={<RegisterFile />} />
            <Route path="/files"        element={<RegisteredFiles />} />
            <Route path="/files/:fileId" element={<FileDetail />} />
            <Route path="/verify"       element={<VerifyFile />} />
            <Route path="/history"      element={<History />} />
            <Route path="/reports"      element={<Reports />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
