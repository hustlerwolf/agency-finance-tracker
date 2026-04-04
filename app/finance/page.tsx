import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from '../dashboard/dashboard-client'

export default async function FinanceOverviewPage() {
  const supabase = createClient()

  const { data: incomeData } = await supabase
    .from('income_entries')
    .select('id, invoice_date, inr_received, description, customers(name)')
    .order('invoice_date', { ascending: false })

  const { data: expenseData } = await supabase
    .from('expense_entries')
    .select('id, expense_date, inr_amount, description, vendors(name)')
    .order('expense_date', { ascending: false })

  const totalIncome = (incomeData || []).reduce((sum, item) => sum + (Number(item.inr_received) || 0), 0)
  const totalExpenses = (expenseData || []).reduce((sum, item) => sum + (Number(item.inr_amount) || 0), 0)
  const netProfit = totalIncome - totalExpenses

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formattedIncome = (incomeData as any[] || [])
    .filter(inc => inc.inr_received > 0)
    .map(inc => ({
      id: inc.id,
      date: inc.invoice_date,
      type: 'income' as const,
      amount: inc.inr_received,
      name: Array.isArray(inc.customers) ? inc.customers[0]?.name : inc.customers?.name,
      description: inc.description || undefined
    }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formattedExpenses = (expenseData as any[] || []).map(exp => ({
    id: exp.id,
    date: exp.expense_date,
    type: 'expense' as const,
    amount: exp.inr_amount,
    name: Array.isArray(exp.vendors) ? exp.vendors[0]?.name : exp.vendors?.name,
    description: exp.description || undefined
  }))

  const recentActivity = [...formattedIncome, ...formattedExpenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Finance Overview</h1>
        <p className="text-muted-foreground">Your financial summary and recent activity.</p>
      </div>

      <DashboardClient
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
        netProfit={netProfit}
        recentActivity={recentActivity}
      />
    </div>
  )
}
