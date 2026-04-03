import { createClient } from '@/lib/supabase/server'
import { RevenueChart } from './revenue-chart'

interface RawIncome {
  inr_received: number;
  customers: { name: string } | { name: string }[] | null;
}

export default async function RevenueReportPage() {
  const supabase = createClient()

  const { data: income } = await supabase
    .from('income_entries')
    .select(`inr_received, customers ( name )`)
    .eq('status', 'paid') as { data: RawIncome[] | null }

  const clientTotals: Record<string, number> = {}

  income?.forEach((inc) => {
    const customerData = Array.isArray(inc.customers) ? inc.customers[0] : inc.customers
    const clientName = customerData?.name || 'One-off Client'
    const amount = Number(inc.inr_received) || 0
    clientTotals[clientName] = (clientTotals[clientName] || 0) + amount
  })

  const chartData = Object.keys(clientTotals)
    .map(name => ({ name, amount: clientTotals[name] }))
    .sort((a, b) => b.amount - a.amount)

  const totalRevenue = chartData.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Revenue & Growth</h2>
        <p className="text-muted-foreground">Analyze your top-performing clients and total collections.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 h-[450px] border rounded-lg p-6 bg-muted/30">
          {chartData.length > 0 ? (
            <RevenueChart data={chartData} />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No paid income data available.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-green-600 text-foreground rounded-lg shadow-sm">
            <h3 className="text-sm font-medium opacity-80">Total Revenue (INR)</h3>
            <p className="text-2xl font-bold mt-1">₹{totalRevenue.toLocaleString('en-IN')}</p>
          </div>

          <div className="border rounded-lg bg-card overflow-hidden">
            <div className="bg-muted px-4 py-2 border-b text-xs font-bold uppercase text-muted-foreground tracking-wider">
              Top Clients
            </div>
            <div className="divide-y max-h-[300px] overflow-y-auto">
              {chartData.slice(0, 10).map((item, idx) => (
                <div key={idx} className="px-4 py-3 flex justify-between items-center text-sm">
                  <span className="font-medium truncate mr-2 text-foreground">{item.name}</span>
                  <span className="text-green-600 dark:text-green-400 font-bold">
                    ₹{item.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
