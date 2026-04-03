export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="animate-pulse space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded-lg" />
            <div className="h-4 w-32 bg-muted/50 rounded" />
          </div>
          <div className="h-9 w-32 bg-muted rounded-lg" />
        </div>
        <div className="h-10 w-full max-w-sm bg-muted/50 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="h-40 bg-muted/30 rounded-xl border border-border" />
          ))}
        </div>
      </div>
    </div>
  )
}
