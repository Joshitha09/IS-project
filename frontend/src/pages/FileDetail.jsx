/**
 * FileDetail.jsx — Detailed view of a single registered file.
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, Trash2, Copy } from 'lucide-react'
import { getFile, deleteFile } from '../services/api'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import ConfirmModal from '../components/ConfirmModal'
import toast from 'react-hot-toast'

function Row({ label, value, mono }) {
  const copy = () => { navigator.clipboard.writeText(value); toast.success('Copied!') }
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-navy-800/60 last:border-0">
      <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex-shrink-0 mt-0.5 w-36">{label}</span>
      <span className={`text-sm text-slate-200 flex-1 text-right break-all flex items-start justify-end gap-2 ${mono ? 'font-mono' : ''}`}>
        {value}
        {mono && (
          <button onClick={copy} className="flex-shrink-0 text-slate-600 hover:text-cyber-blue mt-0.5">
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
      </span>
    </div>
  )
}

function formatSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(iso) {
  try { return new Date(iso).toLocaleString() } catch { return iso || '—' }
}

export default function FileDetail() {
  const { fileId } = useParams()
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await getFile(fileId)
        setFile(data)
      } catch {
        toast.error('File not found.')
        navigate('/files')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [fileId])

  const confirmDelete = async () => {
    try {
      await deleteFile(fileId)
      toast.success('Registration deleted.')
      navigate('/files')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed.')
    }
  }

  if (loading) return <LoadingSpinner text="Loading file details…" />

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 break-all">{file?.file_name}</h1>
          <p className="text-slate-500 text-sm mt-0.5 font-mono">{file?.file_id}</p>
        </div>
        <StatusBadge status={file?.last_verification_result} />
      </div>

      {/* Details card */}
      <div className="glass p-6">
        <h2 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">File Information</h2>
        <Row label="File Name"    value={file?.file_name} />
        <Row label="File ID"      value={file?.file_id}         mono />
        <Row label="File Size"    value={formatSize(file?.file_size)} />
        <Row label="Registered"   value={formatDate(file?.registered_at)} />
        <Row label="SHA-256 Hash" value={file?.sha256_hash}    mono />
        <Row label="Last Status"  value={file?.last_verification_result || 'Not verified'} />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          to={`/verify?file_id=${file?.file_id}`}
          className="btn-primary flex-1 justify-center"
        >
          <ShieldCheck className="w-4 h-4" />
          Verify This File
        </Link>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="btn-danger"
        >
          <Trash2 className="w-4 h-4" />
          Delete Registration
        </button>
      </div>

      {showDeleteModal && (
        <ConfirmModal
          title="Delete Registration"
          message={`Remove the trusted baseline for "${file?.file_name}"? This action cannot be undone and future verification against this file will no longer be possible.`}
          confirmLabel="Delete Registration"
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  )
}
