/**
 * Dashboard.jsx — Main cybersecurity dashboard with stats and charts.
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck, ShieldAlert, FileSearch, Activity,
  FolderOpen, ArrowRight, RefreshCw
} from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { getDashboardStats } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

const COLORS = {
  'INTEGRITY VERIFIED': '#22c55e',
  'TAMPERING DETECTED': '#ef4444',
  'VERIFICATION FAILED': '#f59e0b',
}

function StatCard({ icon: Icon, label, value, colorClass, glowClass, to }) {
  return (
    <Link
      to={to || '#'}
      className={`glass glass-hover p-5 flex items-center gap-4 ${glowClass || ''}`}
    >
      <div className={`p-3 rounded-xl ${colorClass} flex-shrink-0`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-100">{value}</p>
        <p className="text-sm text-slate-400">{label}</p>
      </div>
    </Link>
  )
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await getDashboardStats()
      setStats(data)
    } catch (err) {
      toast.error('Failed to load dashboard stats. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return <LoadingSpinner text="Loading dashboard…" />

  const pieData = stats
    ? Object.entries(stats.status_distribution)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
    : []

  const barData = stats
    ? [
        { name: 'Registered', count: stats.total_registered },
        { name: 'Verified', count: stats.total_verified },
        { name: 'Tampered', count: stats.total_tampered },
        { name: 'Attempts', count: stats.total_verification_attempts },
      ]
    : []

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Security Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">File integrity monitoring overview</p>
        </div>
        <button onClick={load} className="btn-secondary gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={FolderOpen}
          label="Registered Files"
          value={stats?.total_registered ?? 0}
          colorClass="bg-cyber-blue/10 text-cyber-blue"
          glowClass="glow-blue"
          to="/files"
        />
        <StatCard
          icon={ShieldCheck}
          label="Verified Files"
          value={stats?.total_verified ?? 0}
          colorClass="bg-emerald-500/10 text-emerald-400"
          glowClass="glow-green"
          to="/history"
        />
        <StatCard
          icon={ShieldAlert}
          label="Tampered Files"
          value={stats?.total_tampered ?? 0}
          colorClass="bg-red-500/10 text-red-400"
          glowClass="glow-red"
          to="/history?result=TAMPERING+DETECTED"
        />
        <StatCard
          icon={Activity}
          label="Total Attempts"
          value={stats?.total_verification_attempts ?? 0}
          colorClass="bg-yellow-500/10 text-yellow-400"
          glowClass="glow-yellow"
          to="/history"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="glass p-5">
          <h2 className="text-base font-semibold text-slate-200 mb-4">Integrity Status Distribution</h2>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
              No verification data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={COLORS[entry.name] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#1c3169',
                    border: '1px solid rgba(79,142,247,0.2)',
                    borderRadius: '0.5rem',
                    color: '#e2e8f0',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-2">
            {Object.entries(COLORS).map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                <span className="text-xs text-slate-400">
                  {label.replace('INTEGRITY ', '').replace('TAMPERING ', '')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="glass p-5">
          <h2 className="text-base font-semibold text-slate-200 mb-4">Summary Overview</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(79,142,247,0.08)" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#1c3169',
                  border: '1px solid rgba(79,142,247,0.2)',
                  borderRadius: '0.5rem',
                  color: '#e2e8f0',
                }}
                cursor={{ fill: 'rgba(79,142,247,0.06)' }}
              />
              <Bar dataKey="count" fill="#4f8ef7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-200">Recent Activity</h2>
          <Link to="/history" className="text-xs text-cyber-blue hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {(!stats?.recent_activities || stats.recent_activities.length === 0) ? (
          <p className="text-slate-600 text-sm py-6 text-center">No verification history yet.</p>
        ) : (
          <div className="space-y-2">
            {stats.recent_activities.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg bg-navy-900/60 hover:bg-navy-900 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileSearch className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 truncate font-medium">{item.file_name}</p>
                    <p className="text-xs text-slate-500">{formatDate(item.verified_at)}</p>
                  </div>
                </div>
                <StatusBadge status={item.result} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Info Banner */}
      <div className="glass border border-amber-500/20 bg-amber-500/5 p-4 rounded-xl">
        <p className="text-xs text-amber-400/80 leading-relaxed">
          <span className="font-semibold">Security Note:</span>{' '}
          SHA-256 hashes stored in this database could be altered by an attacker with direct database access.
          For stronger protection, consider adding HMAC-based integrity checks or digitally signed baseline records,
          with the signing key stored separately from the database.
        </p>
      </div>
    </div>
  )
}
