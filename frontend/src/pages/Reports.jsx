/**
 * Reports.jsx — Download CSV report and view summary info.
 */

import { useState } from 'react'
import { FileBarChart2, Download, Info, Shield } from 'lucide-react'
import { exportCsv } from '../services/api'
import toast from 'react-hot-toast'

export default function Reports() {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    try {
      await exportCsv()
      toast.success('Report downloaded!')
    } catch {
      toast.error('Failed to generate report.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Reports</h1>
        <p className="text-slate-500 text-sm mt-1">Download a CSV export of registered files and verification history.</p>
      </div>

      {/* Export card */}
      <div className="glass p-8 flex flex-col items-center text-center gap-5">
        <div className="p-5 rounded-2xl bg-cyber-blue/10 border border-cyber-blue/20">
          <FileBarChart2 className="w-12 h-12 text-cyber-blue" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Full CSV Export</h2>
          <p className="text-slate-500 text-sm mt-1 max-w-sm">
            Includes all registered file metadata and complete verification history.
            File contents are never included in the export.
          </p>
        </div>
        <button onClick={handleDownload} disabled={loading} className="btn-primary px-8">
          <Download className="w-4 h-4" />
          {loading ? 'Generating…' : 'Download Report'}
        </button>
      </div>

      {/* What's included */}
      <div className="glass p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">What's included</h2>
        <div className="space-y-3">
          {[
            { title: 'Registered Files', desc: 'File ID, File Name, SHA-256 Hash, File Size, Registration Timestamp' },
            { title: 'Verification History', desc: 'Attempt ID, File ID, File Name, Original Hash, Current Hash, Result, Timestamp, Error Details' },
          ].map(item => (
            <div key={item.title} className="flex gap-3 px-4 py-3 rounded-lg bg-navy-900 border border-navy-800">
              <FileBarChart2 className="w-4 h-4 text-cyber-blue flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-200">{item.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security info */}
      <div className="flex gap-3 px-4 py-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
        <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="font-semibold text-emerald-400">Privacy:</span>{' '}
          The CSV export never contains the actual file contents — only cryptographic hashes,
          file names, sizes, and timestamps. It is safe to share for audit purposes.
        </p>
      </div>
    </div>
  )
}
