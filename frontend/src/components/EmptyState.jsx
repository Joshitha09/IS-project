/**
 * EmptyState.jsx — Friendly empty/no-data illustration.
 */

import { FolderSearch } from 'lucide-react'

export default function EmptyState({ icon: Icon = FolderSearch, title = 'No data found', description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-5 rounded-full bg-navy-900 border border-navy-800 mb-4">
        <Icon className="w-10 h-10 text-slate-600" />
      </div>
      <h3 className="text-lg font-semibold text-slate-400 mb-2">{title}</h3>
      {description && (
        <p className="text-slate-600 text-sm max-w-sm">{description}</p>
      )}
    </div>
  )
}
