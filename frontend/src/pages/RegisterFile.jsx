/**
 * RegisterFile.jsx — Upload and register an original file.
 */

import { useState } from 'react'
import { FilePlus, CheckCircle2, Copy, Info } from 'lucide-react'
import { registerFile } from '../services/api'
import FileDropZone from '../components/FileDropZone'
import toast from 'react-hot-toast'

function InfoRow({ label, value, mono }) {
  const copy = () => {
    navigator.clipboard.writeText(value)
    toast.success('Copied!')
  }
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-navy-800/60 last:border-0">
      <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex-shrink-0 mt-0.5">{label}</span>
      <span className={`text-sm text-slate-200 text-right break-all flex items-start gap-2 ${mono ? 'font-mono' : ''}`}>
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
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(iso) {
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

export default function RegisterFile() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)

  const handleRegister = async () => {
    if (!file) { toast.error('Please select a file first.'); return }
    setLoading(true)
    setProgress(0)
    setResult(null)
    try {
      const { data } = await registerFile(file, setProgress)
      setResult(data)
      toast.success('File registered successfully!')
      setFile(null)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Register Original File</h1>
        <p className="text-slate-500 text-sm mt-1">
          Upload a file to create a trusted SHA-256 baseline. The hash is computed on the server.
        </p>
      </div>

      {/* Info box */}
      <div className="flex gap-3 px-4 py-3 rounded-lg bg-cyber-blue/5 border border-cyber-blue/20">
        <Info className="w-4 h-4 text-cyber-blue flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed">
          The SHA-256 hash of your file will be calculated server-side and stored as the trusted baseline.
          Any future verification will compare against this hash. Duplicate files with the same name and
          identical content will be rejected.
        </p>
      </div>

      {/* Upload zone */}
      <div className="glass p-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Select File</h2>
        <FileDropZone
          file={file}
          onFile={setFile}
          label="Drop your file here or click to browse"
        />

        {/* Progress bar */}
        {loading && progress > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Uploading…</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-navy-800">
              <div
                className="h-1.5 rounded-full bg-cyber-blue transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={handleRegister}
          disabled={!file || loading}
          className="btn-primary mt-5 w-full justify-center"
        >
          <FilePlus className="w-4 h-4" />
          {loading ? 'Registering…' : 'Register File'}
        </button>
      </div>

      {/* Success result */}
      {result && (
        <div className="glass border border-emerald-500/20 bg-emerald-500/5 p-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-emerald-400">File Registered Successfully</h2>
          </div>
          <div className="divide-y divide-navy-800/60">
            <InfoRow label="File Name"      value={result.file_name} />
            <InfoRow label="File ID"        value={result.file_id}         mono />
            <InfoRow label="File Size"      value={formatSize(result.file_size)} />
            <InfoRow label="Registered At"  value={formatDate(result.registered_at)} />
            <InfoRow label="SHA-256 Hash"   value={result.sha256_hash}     mono />
          </div>
        </div>
      )}
    </div>
  )
}
