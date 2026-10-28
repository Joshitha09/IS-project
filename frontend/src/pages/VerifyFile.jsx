/**
 * VerifyFile.jsx — Upload a file to verify it against a registered baseline.
 * Includes full hash comparison display.
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ShieldCheck, ChevronDown, Info } from 'lucide-react'
import { listFiles, verifyFile } from '../services/api'
import FileDropZone from '../components/FileDropZone'
import HashComparison from '../components/HashComparison'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function VerifyFile() {
  const [searchParams] = useSearchParams()
  const preselectedId = searchParams.get('file_id') || ''

  const [files, setFiles] = useState([])
  const [selectedId, setSelectedId] = useState(preselectedId)
  const [uploadFile, setUploadFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoadingFiles(true)
      try {
        const { data } = await listFiles()
        setFiles(data)
      } catch {
        toast.error('Could not load registered files.')
      } finally {
        setLoadingFiles(false)
      }
    }
    load()
  }, [])

  const handleVerify = async () => {
    if (!selectedId) { toast.error('Please select a registered file.'); return }
    if (!uploadFile) { toast.error('Please upload the file to verify.'); return }

    setLoading(true)
    setProgress(0)
    setResult(null)

    try {
      const { data } = await verifyFile(selectedId, uploadFile, setProgress)
      setResult(data)
      if (data.result === 'INTEGRITY VERIFIED') toast.success('File integrity verified!')
      else if (data.result === 'TAMPERING DETECTED') toast.error('Tampering detected!')
      else toast('Verification failed.', { icon: '⚠️' })
    } catch (err) {
      const msg = err.response?.data?.detail || 'Verification error.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const selectedFile = files.find(f => f.file_id === selectedId)

  function formatDate(iso) {
    try { return new Date(iso).toLocaleString() } catch { return iso }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Verify File Integrity</h1>
        <p className="text-slate-500 text-sm mt-1">
          Compare an uploaded file's SHA-256 hash against the registered trusted baseline.
        </p>
      </div>

      {/* Info box */}
      <div className="flex gap-3 px-4 py-3 rounded-lg bg-cyber-blue/5 border border-cyber-blue/20">
        <Info className="w-4 h-4 text-cyber-blue flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed">
          Select the registered file entry, then upload the file you want to verify.
          The system will compute the SHA-256 hash server-side and compare it against the stored trusted baseline.
        </p>
      </div>

      <div className="glass p-6 space-y-5">
        {/* Step 1: Select registered file */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Step 1 — Select a Registered File
          </label>
          {loadingFiles ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm py-3">
              <div className="w-4 h-4 rounded-full border-2 border-slate-700 border-t-cyber-blue animate-spin" />
              Loading registered files…
            </div>
          ) : (
            <div className="relative">
              <select
                className="input appearance-none pr-10"
                value={selectedId}
                onChange={e => { setSelectedId(e.target.value); setResult(null) }}
              >
                <option value="">— Choose a registered file —</option>
                {files.map(f => (
                  <option key={f.file_id} value={f.file_id}>
                    {f.file_name} ({f.file_id.slice(0, 8)}…)
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          )}

          {/* Selected file info */}
          {selectedFile && (
            <div className="mt-3 px-4 py-3 rounded-lg bg-navy-900 border border-navy-700 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Registered:</span>
                <span className="text-slate-300">{formatDate(selectedFile.registered_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Original Hash:</span>
                <span className="text-slate-300 font-mono truncate ml-4 max-w-[260px]">{selectedFile.sha256_hash}</span>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Upload file */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Step 2 — Upload File to Verify
          </label>
          <FileDropZone
            file={uploadFile}
            onFile={setUploadFile}
            label="Drop the file to verify or click to browse"
          />
        </div>

        {/* Progress */}
        {loading && progress > 0 && (
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Uploading & verifying…</span>
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

        {loading && progress === 0 && (
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <div className="w-4 h-4 rounded-full border-2 border-slate-700 border-t-cyber-blue animate-spin" />
            Verifying…
          </div>
        )}

        <button
          onClick={handleVerify}
          disabled={!selectedId || !uploadFile || loading}
          className="btn-primary w-full justify-center"
        >
          <ShieldCheck className="w-4 h-4" />
          {loading ? 'Verifying…' : 'Verify Integrity'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="glass p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-slate-200">Verification Result</h2>
            <span className="text-xs text-slate-500">
              {new Date(result.verified_at).toLocaleString()}
            </span>
          </div>

          <HashComparison
            original={result.original_hash}
            current={result.current_hash}
            result={result.result}
          />

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="px-3 py-2 rounded-lg bg-navy-900 border border-navy-800">
              <span className="text-slate-500 block">File Name</span>
              <span className="text-slate-300 font-medium">{result.file_name}</span>
            </div>
            <div className="px-3 py-2 rounded-lg bg-navy-900 border border-navy-800">
              <span className="text-slate-500 block">File ID</span>
              <span className="text-slate-300 font-mono truncate block">{result.file_id.slice(0,16)}…</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
