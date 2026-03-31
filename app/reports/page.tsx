import { createClient } from '@/lib/supabase/server'
import { ExpenseChart } from './expense-chart'

export default async function ExpenseReportPage() {
  const supabase = createClient()

  const { data: expenses } = await supabase
    .from('expense_entries')
    .select(`inr_amount, expense_categories ( name )`)

  const categoryTotals: Record<string, number> = {}

  expenses?.forEach((exp) => {
    const categoryData = Array.isArray(exp.expense_categories)
      ? exp.expense_categories[0]
      : exp.expense_categories
    const categoryName = categoryData?.name || 'Uncategorized'
    const amount = Number(exp.inr_amount) || 0
    categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + amount
  })

  const chartData = Object.keys(categoryTotals)
    .map(name => ({ name, value: categoryTotals[name] }))
    .sort((a, b) => b.value - a.value)

  const totalExpenses = chartData.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Expense Breakdown</h2>
        <p className="text-muted-foreground">View your total spending categorized by where your money goes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-[400px] border rounded-md p-4 bg-muted/30 flex items-center justify-center">
          {chartData.length > 0 ? (
            <ExpenseChart data={chartData} />
          ) : (
            <p className="text-muted-foreground">No expense data available to chart.</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-primary text-primary-foreground rounded-md">
            <h3 className="text-sm font-medium opacity-80">Total INR Expenses</h3>
            <p className="text-3xl font-bold mt-1">
              ₹{totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="border rounded-md overflow-hidden bg-card">
            <div className="bg-muted px-4 py-2 border-b font-medium text-sm text-muted-foreground">
              Category Summary
            </div>
            <ul className="divide-y max-h-[290px] overflow-y-auto">
              {chartData.map((item, index) => (
                <li key={index} className="flex justify-between items-center px-4 py-3 text-sm">
                  <span className="font-medium text-foreground">{item.name}</span>
                  <span className="text-muted-foreground">
                    ₹{item.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </li>
              ))}
              {chartData.length === 0 && (
                <li className="px-4 py-4 text-center text-muted-foreground text-sm">No data yet.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
