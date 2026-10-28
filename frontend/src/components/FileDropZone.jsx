/**
 * FileDropZone.jsx — Drag-and-drop + click file upload component.
 */

import { useRef, useState, useCallback } from 'react'
import { UploadCloud, File as FileIcon, X } from 'lucide-react'
import clsx from 'clsx'

export default function FileDropZone({ onFile, file, accept, label = 'Drop your file here or click to browse' }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = useCallback((f) => {
    if (f) onFile(f)
  }, [onFile])

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <div>
      <div
        className={clsx('drop-zone', dragging && 'active')}
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <UploadCloud className="w-10 h-10 text-slate-500 mx-auto mb-3" />
        <p className="text-slate-400 text-sm mb-1">{label}</p>
        <p className="text-slate-600 text-xs">All file types supported · Max 100 MB</p>
      </div>

      {file && (
        <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-lg bg-navy-900 border border-navy-700">
          <FileIcon className="w-5 h-5 text-cyber-blue flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-200 truncate font-medium">{file.name}</p>
            <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onFile(null) }}
            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
