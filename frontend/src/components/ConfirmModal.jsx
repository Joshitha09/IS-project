/**
 * ConfirmModal.jsx — Confirmation dialog for destructive actions.
 */

import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmModal({ title, message, onConfirm, onCancel, confirmLabel = 'Delete', dangerous = true }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass w-full max-w-md animate-fade-in">
        <div className="flex items-start justify-between p-6 border-b border-navy-800">
          <div className="flex items-center gap-3">
            {dangerous && (
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
            )}
            <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          </div>
          <button onClick={onCancel} className="p-1 text-slate-500 hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-slate-300 text-sm leading-relaxed">{message}</p>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button
            onClick={onConfirm}
            className={dangerous ? 'btn-danger' : 'btn-primary'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
