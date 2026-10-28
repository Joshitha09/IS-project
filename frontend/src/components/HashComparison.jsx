/**
 * HashComparison.jsx — Visual side-by-side hash comparison panel.
 */

import { CheckCircle2, XCircle, Copy } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

function HashBlock({ label, hash, highlight }) {
  const copy = () => {
    if (!hash) return
    navigator.clipboard.writeText(hash)
    toast.success('Hash copied to clipboard')
  }

  return (
    <div
      className={clsx(
        'rounded-xl p-4 border transition-all',
        highlight === 'match'   && 'bg-emerald-500/5 border-emerald-500/20',
        highlight === 'mismatch'&& 'bg-red-500/5 border-red-500/20',
        highlight === 'neutral' && 'bg-navy-900 border-navy-700',
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        {hash && (
          <button onClick={copy} className="p-1 text-slate-500 hover:text-cyber-blue transition-colors">
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <p className={clsx(
        'hash-text',
        highlight === 'match'   && 'text-emerald-400',
        highlight === 'mismatch'&& 'text-red-400',
        highlight === 'neutral' && 'text-slate-300',
      )}>
        {hash || '—'}
      </p>
    </div>
  )
}

export default function HashComparison({ original, current, result }) {
  const isVerified = result === 'INTEGRITY VERIFIED'
  const isTampered = result === 'TAMPERING DETECTED'
  const isFailed   = result === 'VERIFICATION FAILED'

  const highlight = isVerified ? 'match' : isTampered ? 'mismatch' : 'neutral'

  return (
    <div className="space-y-4">
      {/* Result banner */}
      <div className={clsx(
        'flex items-center gap-3 px-5 py-4 rounded-xl border',
        isVerified && 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        isTampered && 'bg-red-500/10 border-red-500/30 text-red-400',
        isFailed   && 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
      )}>
        {isVerified && <CheckCircle2 className="w-6 h-6 flex-shrink-0" />}
        {(isTampered || isFailed) && <XCircle className="w-6 h-6 flex-shrink-0" />}
        <div>
          <p className="font-bold text-lg">{result}</p>
          {isVerified && (
            <p className="text-sm opacity-80 mt-0.5">
              The file contents match the registered baseline with extremely high confidence.
            </p>
          )}
          {isTampered && (
            <p className="text-sm opacity-80 mt-0.5">
              The hashes differ — the file contents have changed since registration.
              A mismatch detects a change but does not, by itself, prove malicious intent.
            </p>
          )}
        </div>
      </div>

      {/* Hash grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HashBlock label="Original Hash (Trusted Baseline)" hash={original} highlight={highlight} />
        <HashBlock label="Current Hash (Uploaded File)"     hash={current}  highlight={highlight} />
      </div>

      {/* Character diff count */}
      {isTampered && original && current && (
        <p className="text-xs text-slate-500 text-center">
          Hashes differ at {[...original].filter((c, i) => c !== current[i]).length} of 64 character positions.
        </p>
      )}
    </div>
  )
}
