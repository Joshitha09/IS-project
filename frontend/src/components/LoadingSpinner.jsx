/**
 * LoadingSpinner.jsx — Reusable loading indicator.
 */

export default function LoadingSpinner({ size = 'md', text }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div
        className={`${sizes[size]} rounded-full border-2 border-navy-700 border-t-cyber-blue animate-spin`}
      />
      {text && <p className="text-slate-500 text-sm">{text}</p>}
    </div>
  )
}
