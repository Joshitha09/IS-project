/**
 * Sidebar.jsx — Navigation sidebar for the cybersecurity dashboard.
 */

import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FilePlus, FolderOpen, ShieldCheck,
  History, FileBarChart2, Shield, X
} from 'lucide-react'
import clsx from 'clsx'

const NAV_ITEMS = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/register',   icon: FilePlus,         label: 'Register File' },
  { to: '/files',      icon: FolderOpen,       label: 'Registered Files' },
  { to: '/verify',     icon: ShieldCheck,      label: 'Verify File' },
  { to: '/history',    icon: History,           label: 'History' },
  { to: '/reports',    icon: FileBarChart2,     label: 'Reports' },
]

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          'fixed top-0 left-0 h-full w-64 z-30 flex flex-col',
          'bg-navy-950/95 backdrop-blur-xl border-r border-navy-800/60',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-navy-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyber-blue/10 border border-cyber-blue/20">
              <Shield className="w-5 h-5 text-cyber-blue" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100 leading-tight">FileGuard</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Detection System</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-slate-400 hover:text-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="px-3 mb-2 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
            Navigation
          </p>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => onClose?.()}
              className={({ isActive }) =>
                clsx('nav-item', isActive && 'active')
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-navy-800/60">
          <p className="text-[10px] text-slate-600 leading-relaxed">
            Hashes computed server-side using SHA-256. Never trust client-supplied hashes.
          </p>
        </div>
      </aside>
    </>
  )
}
