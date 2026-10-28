/**
 * StatusBadge.jsx — Color-coded badge for verification results.
 */

import clsx from 'clsx'
import { ShieldCheck, ShieldAlert, ShieldX, Shield } from 'lucide-react'

const STATUS_CONFIG = {
  'INTEGRITY VERIFIED': {
    cls: 'badge-verified',
    icon: ShieldCheck,
    short: 'Verified',
  },
  'TAMPERING DETECTED': {
    cls: 'badge-tampered',
    icon: ShieldAlert,
    short: 'Tampered',
  },
  'VERIFICATION FAILED': {
    cls: 'badge-failed',
    icon: ShieldX,
    short: 'Failed',
  },
}

export default function StatusBadge({ status, showIcon = true }) {
  const cfg = STATUS_CONFIG[status] || {
    cls: 'badge-none',
    icon: Shield,
    short: 'Not verified',
  }
  const Icon = cfg.icon

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        cfg.cls,
      )}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      {status ? cfg.short : 'Not Verified'}
    </span>
  )
}
