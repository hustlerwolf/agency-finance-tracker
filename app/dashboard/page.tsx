import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUserAccess } from '@/lib/auth-utils'
import { DashboardClient } from './dashboard-client'
import Link from 'next/link'
import { CheckSquare, Calendar, ArrowRight } from 'lucide-react'

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

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient()
  const admin = createAdminClient()
  const { teamMemberId, isAdmin } = await getCurrentUserAccess()

  // Fetch user's assigned tasks (for "My Tasks" widget)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let myTasks: any[] = []
  if (teamMemberId) {
    const { data: assignments } = await admin.from('task_assignees').select('task_id').eq('team_member_id', teamMemberId)
    const taskIds = (assignments || []).map(a => a.task_id)
    if (taskIds.length > 0) {
      const { data } = await admin.from('tasks').select('id, title, priority, due_date, projects(name), task_statuses:status_id(name, color)').in('id', taskIds).order('due_date', { ascending: true }).limit(5)
      myTasks = data || []
    }
  }

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

      {/* My Tasks Widget */}
      {myTasks.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><CheckSquare className="w-4 h-4" /> My Tasks</h2>
            <Link href="/tasks" className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="space-y-2">
            {myTasks.map(t => {
              const overdue = t.due_date && new Date(t.due_date) < new Date(new Date().toDateString())
              const statusColor = (t.task_statuses as { name: string; color: string } | null)?.color || '#6b7280'
              const statusName = (t.task_statuses as { name: string; color: string } | null)?.name || 'No status'
              return (
                <Link key={t.id} href="/tasks" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{t.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span style={{ color: statusColor }}>{statusName}</span>
                      {t.projects && <span>· {(t.projects as { name: string }).name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${t.priority === 'High' ? 'bg-red-500/15 text-red-400 border-red-500/30' : t.priority === 'Low' ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'}`}>{t.priority}</span>
                    {t.due_date && (
                      <span className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-400' : 'text-muted-foreground'}`}>
                        <Calendar className="w-3 h-3" />
                        {new Date(t.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}