import { createClient } from '@/lib/supabase/server'
import { ProfitChart } from './profit-chart'

interface RawData {
  amount?: number;
  inr_amount?: number;
  inr_received?: number;
  invoice_date?: string;
  expense_date?: string;
}

export default async function ProfitReportPage() {
  const supabase = createClient()

  const { data: income } = await supabase.from('income_entries').select('inr_received, invoice_date').eq('status', 'paid')
  const { data: expenses } = await supabase.from('expense_entries').select('inr_amount, expense_date')

  const monthlyData: Record<string, { month: string; income: number; expenses: number }> = {}

  const getMonthKey = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleString('default', { month: 'short', year: 'numeric' })
  }

  income?.forEach((inc: RawData) => {
    const key = getMonthKey(inc.invoice_date!)
    if (!monthlyData[key]) monthlyData[key] = { month: key, income: 0, expenses: 0 }
    monthlyData[key].income += Number(inc.inr_received) || 0
  })

  expenses?.forEach((exp: RawData) => {
    const key = getMonthKey(exp.expense_date!)
    if (!monthlyData[key]) monthlyData[key] = { month: key, income: 0, expenses: 0 }
    monthlyData[key].expenses += Number(exp.inr_amount) || 0
  })

  const chartData = Object.values(monthlyData)
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
    .map(d => ({ ...d, profit: d.income - d.expenses }))

  const totalNetProfit = chartData.reduce((sum, item) => sum + item.profit, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profit & Loss Trend</h2>
        <p className="text-muted-foreground">Month-over-month comparison of your agency performance.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 h-[450px] border rounded-md p-6 bg-muted/30">
          <ProfitChart data={chartData} />
        </div>

        <div className="space-y-4">
          <div className={`p-4 rounded-md shadow-sm border ${
            totalNetProfit >= 0
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
          }`}>
            <h3 className="text-sm font-medium opacity-80">Lifetime Net Profit</h3>
            <p className="text-2xl font-bold mt-1">₹{totalNetProfit.toLocaleString('en-IN')}</p>
          </div>

          <div className="border rounded-md bg-card overflow-hidden">
            <div className="bg-muted px-4 py-2 border-b text-xs font-bold uppercase text-muted-foreground tracking-wider">
              Monthly Snapshot
            </div>
            <div className="divide-y max-h-[300px] overflow-y-auto">
              {chartData.reverse().map((item, idx) => (
                <div key={idx} className="px-4 py-3 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-foreground">
                    <span>{item.month}</span>
                    <span className={item.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {item.profit >= 0 ? '+' : ''}₹{item.profit.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Inc: ₹{item.income.toLocaleString('en-IN')}</span>
                    <span>Exp: ₹{item.expenses.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
