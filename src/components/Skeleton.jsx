export function SkeletonCard() {
  return (
    <div className="bg-surface rounded-card overflow-hidden border border-white/[0.04]">
      <div className="shimmer aspect-video w-full" />
      <div className="p-3 space-y-2">
        <div className="shimmer h-4 rounded w-3/4" />
        <div className="shimmer h-3 rounded w-1/2" />
        <div className="shimmer h-8 rounded-btn w-full mt-3" />
      </div>
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-4 border-b border-white/[0.04]">
      <div className="shimmer h-4 rounded w-1/4" />
      <div className="shimmer h-4 rounded w-1/6" />
      <div className="shimmer h-4 rounded w-1/5" />
      <div className="shimmer h-4 rounded w-1/6 ml-auto" />
    </div>
  )
}

export function SkeletonList({ count = 5 }) {
  return Array.from({ length: count }, (_, i) => <SkeletonRow key={i} />)
}

export function SkeletonText({ lines = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={`shimmer h-3 rounded ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}
