import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './dashboard-client'

interface DashboardIncome {
  id: string;
  invoice_date: string; // CHANGED: Fixed column name
  inr_received: number;
  description: string | null;
  customers: { name: string } | { name: string }[] | null;
}

interface DashboardExpense {
  id: string;
  expense_date: string;
  inr_amount: number;
  description: string | null;
  vendors: { name: string } | { name: string }[] | null;
}

export default async function DashboardPage() {
  const supabase = createClient()

  // 1. Fetch all Income using the correct invoice_date column
  const { data: incomeData } = await supabase
    .from('income_entries')
    .select('id, invoice_date, inr_received, description, customers(name)')
    .order('invoice_date', { ascending: false })

  // 2. Fetch all Expenses
  const { data: expenseData } = await supabase
    .from('expense_entries')
    .select('id, expense_date, inr_amount, description, vendors(name)')
    .order('expense_date', { ascending: false })

  // 3. Calculate Totals (in INR)
  const totalIncome = (incomeData || []).reduce((sum, item) => sum + (Number(item.inr_received) || 0), 0)
  const totalExpenses = (expenseData || []).reduce((sum, item) => sum + (Number(item.inr_amount) || 0), 0)
  const netProfit = totalIncome - totalExpenses

  // 4. Safely format data for the client
  const formattedIncome = (incomeData as unknown as DashboardIncome[] || [])
    .filter(inc => inc.inr_received > 0) // <--- ADD THIS LINE TO HIDE 0.00 ENTRIES
    .map(inc => ({
      id: inc.id,
      date: inc.invoice_date,
      type: 'income' as const, 
      amount: inc.inr_received,
      name: Array.isArray(inc.customers) ? inc.customers[0]?.name : inc.customers?.name,
      description: inc.description || undefined
    }))

  const formattedExpenses = (expenseData as unknown as DashboardExpense[] || []).map(exp => ({
    id: exp.id,
    date: exp.expense_date,
    type: 'expense' as const,
    amount: exp.inr_amount,
    name: Array.isArray(exp.vendors) ? exp.vendors[0]?.name : exp.vendors?.name,
    description: exp.description || undefined
  }))

  // 5. Merge and sort recent activity for the feed
  const recentActivity = [...formattedIncome, ...formattedExpenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10) 

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back. Here is your agency financial overview.</p>
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