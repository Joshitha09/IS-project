/**
 * History.jsx — Verification history with search, filter, and detail view.
 */

import { useState, useEffect, useCallback } from 'react'
import { Search, RefreshCw, Eye, X } from 'lucide-react'
import { getHistory } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import HashComparison from '../components/HashComparison'
import { History as HistoryIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'

const RESULT_OPTIONS = [
  { value: '', label: 'All Results' },
  { value: 'INTEGRITY VERIFIED', label: 'Verified' },
  { value: 'TAMPERING DETECTED', label: 'Tampered' },
  { value: 'VERIFICATION FAILED', label: 'Failed' },
]

function formatDate(iso) {
  try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) }
  catch { return iso }
}

function DetailModal({ item, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-navy-800">
          <h2 className="text-lg font-semibold text-slate-100">Verification Detail</h2>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              { label: 'File Name', value: item.file_name },
              { label: 'File ID',   value: item.file_id },
              { label: 'Verified At', value: formatDate(item.verified_at) },
              { label: 'Result',    value: item.result },
            ].map(r => (
              <div key={r.label} className="px-3 py-2 rounded-lg bg-navy-900 border border-navy-800">
                <span className="text-slate-500 block">{r.label}</span>
                <span className="text-slate-300 font-medium break-all">{r.value}</span>
              </div>
            ))}
          </div>

          {/* Hash comparison */}
          <HashComparison
            original={item.original_hash}
            current={item.current_hash}
            result={item.result}
          />

          {/* Error */}
          {item.error_message && (
            <div className="px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-xs text-yellow-400 font-semibold mb-1">Error</p>
              <p className="text-xs text-yellow-300">{item.error_message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function History() {
  const [searchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [resultFilter, setResultFilter] = useState(searchParams.get('result') || '')
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getHistory({
        search: search || undefined,
        result: resultFilter || undefined,
        limit: 200,
      })
      setItems(data)
    } catch {
      toast.error('Failed to load history.')
    } finally {
      setLoading(false)
    }
  }, [search, resultFilter])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Verification History</h1>
          <p className="text-slate-500 text-sm mt-0.5">{items.length} attempt{items.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={load} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {/* Filters */}
      <div className="glass p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="input pl-9"
            placeholder="Search by file name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-48" value={resultFilter} onChange={e => setResultFilter(e.target.value)}>
          {RESULT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass">
        {loading ? (
          <LoadingSpinner text="Loading history…" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={HistoryIcon}
            title="No verification history"
            description="Verify your first file to see history here."
          />
        ) : (
          <div className="table-wrapper rounded-xl">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>File Name</th>
                  <th>Result</th>
                  <th>Verified At</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="text-slate-600 text-xs">{item.id}</td>
                    <td className="font-medium text-slate-200 max-w-[180px] truncate" title={item.file_name}>
                      {item.file_name}
                    </td>
                    <td><StatusBadge status={item.result} /></td>
                    <td className="text-slate-400 text-xs">{formatDate(item.verified_at)}</td>
                    <td>
                      <button
                        onClick={() => setSelected(item)}
                        className="p-1.5 rounded-md text-cyber-blue hover:bg-cyber-blue/10 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
