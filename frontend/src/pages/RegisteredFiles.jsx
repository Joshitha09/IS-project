/**
 * RegisteredFiles.jsx — Searchable, sortable list of all registered files.
 */

import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, ShieldCheck, Trash2, Eye, SortAsc, SortDesc, RefreshCw
} from 'lucide-react'
import { listFiles, deleteFile } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import ConfirmModal from '../components/ConfirmModal'
import toast from 'react-hot-toast'
import { FolderOpen } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'INTEGRITY VERIFIED', label: 'Verified' },
  { value: 'TAMPERING DETECTED', label: 'Tampered' },
  { value: 'VERIFICATION FAILED', label: 'Failed' },
]

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(iso) {
  try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) }
  catch { return iso }
}

export default function RegisteredFiles() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortKey, setSortKey] = useState('registered_at')
  const [sortDir, setSortDir] = useState('desc')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await listFiles({
        search: search || undefined,
        status: statusFilter || undefined,
      })
      setFiles(data)
    } catch {
      toast.error('Failed to load files.')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => { load() }, [load])

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = [...files].sort((a, b) => {
    let av = a[sortKey] ?? ''
    let bv = b[sortKey] ?? ''
    if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  const confirmDelete = async () => {
    try {
      await deleteFile(deleteTarget.file_id)
      toast.success('Registration deleted.')
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed.')
    }
  }

  function SortIcon({ k }) {
    if (sortKey !== k) return <SortAsc className="w-3 h-3 text-slate-600" />
    return sortDir === 'asc'
      ? <SortAsc className="w-3 h-3 text-cyber-blue" />
      : <SortDesc className="w-3 h-3 text-cyber-blue" />
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Registered Files</h1>
          <p className="text-slate-500 text-sm mt-0.5">{files.length} file{files.length !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
          <Link to="/register" className="btn-primary">Register New</Link>
        </div>
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
        <select
          className="input sm:w-48"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="glass">
        {loading ? (
          <LoadingSpinner text="Loading files…" />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No registered files"
            description="Register your first file to start tracking integrity."
          />
        ) : (
          <div className="table-wrapper rounded-xl">
            <table>
              <thead>
                <tr>
                  {[
                    { key: 'file_name', label: 'File Name' },
                    { key: 'file_id',   label: 'File ID' },
                    { key: 'file_size', label: 'Size' },
                    { key: 'registered_at', label: 'Registered' },
                    { key: 'last_verification_result', label: 'Status' },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="cursor-pointer select-none"
                    >
                      <span className="flex items-center gap-1">
                        {col.label} <SortIcon k={col.key} />
                      </span>
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(f => (
                  <tr key={f.file_id}>
                    <td className="font-medium text-slate-200 max-w-[180px] truncate" title={f.file_name}>
                      {f.file_name}
                    </td>
                    <td className="font-mono text-xs text-slate-500 max-w-[120px] truncate" title={f.file_id}>
                      {f.file_id.slice(0, 8)}…
                    </td>
                    <td className="text-slate-400">{formatSize(f.file_size)}</td>
                    <td className="text-slate-400 text-xs">{formatDate(f.registered_at)}</td>
                    <td><StatusBadge status={f.last_verification_result} /></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/verify?file_id=${f.file_id}`)}
                          className="p-1.5 rounded-md text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          title="Verify"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/files/${f.file_id}`)}
                          className="p-1.5 rounded-md text-cyber-blue hover:bg-cyber-blue/10 transition-colors"
                          title="Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(f)}
                          className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete modal */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Registration"
          message={`Are you sure you want to delete the registration for "${deleteTarget.file_name}"? This permanently removes its trusted SHA-256 baseline. Future verification against this file will no longer be possible.`}
          confirmLabel="Delete Registration"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
