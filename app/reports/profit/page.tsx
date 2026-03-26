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

  // 1. Fetch all Income and Expenses
  const { data: income } = await supabase.from('income_entries').select('inr_received, invoice_date').eq('status', 'paid')
  const { data: expenses } = await supabase.from('expense_entries').select('inr_amount, expense_date')

  // 2. Process data into a monthly map
  const monthlyData: Record<string, { month: string; income: number; expenses: number }> = {}

  // Helper to get "MMM YYYY" key
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

  // 3. Convert to sorted array and calculate Profit
  const chartData = Object.values(monthlyData)
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
    .map(d => ({
      ...d,
      profit: d.income - d.expenses
    }))

  const totalNetProfit = chartData.reduce((sum, item) => sum + item.profit, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profit & Loss Trend</h2>
        <p className="text-muted-foreground">Month-over-month comparison of your agency performance.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 h-[450px] border rounded-md p-6 bg-slate-50">
          <ProfitChart data={chartData} />
        </div>

        <div className="space-y-4">
          <div className={`p-4 rounded-md shadow-sm border ${totalNetProfit >= 0 ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
            <h3 className="text-sm font-medium opacity-80">Lifetime Net Profit</h3>
            <p className="text-2xl font-bold mt-1">₹{totalNetProfit.toLocaleString('en-IN')}</p>
          </div>
          
          <div className="border rounded-md bg-white overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b text-xs font-bold uppercase text-slate-500 tracking-wider">
              Monthly Snapshot
            </div>
            <div className="divide-y max-h-[300px] overflow-y-auto">
              {chartData.reverse().map((item, idx) => (
                <div key={idx} className="px-4 py-3 text-xs space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>{item.month}</span>
                    <span className={item.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {item.profit >= 0 ? '+' : ''}₹{item.profit.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
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