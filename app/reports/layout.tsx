export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
        <p className="text-muted-foreground mt-1">Analyze your agency performance and financials.</p>
      </div>
      <div className="bg-card border rounded-lg shadow-sm p-6 min-h-[600px]">
        {children}
      </div>
    </div>
  )
}
