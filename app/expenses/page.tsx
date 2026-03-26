import { createClient } from '@/lib/supabase/server'
import { ExpenseClient } from './expense-client'

interface RawExpense {
  id: string;
  expense_date: string; 
  amount: number;
  inr_amount: number;
  currency: string;
  description: string | null;
  receipt_url: string | null;
  category_id: string | null;
  vendor_id: string | null;
  expense_categories: { name: string } | { name: string }[] | null;
  vendors: { name: string } | { name: string }[] | null;
}

export default async function ExpensesPage() {
  const supabase = createClient()
  
  const { data: rawExpenses } = await supabase
    .from('expense_entries')
    .select(`
      id, expense_date, amount, inr_amount, currency, description, receipt_url, category_id, vendor_id,
      expense_categories ( name ),
      vendors ( name )
    `)
    .order('expense_date', { ascending: false })

  const { data: categories } = await supabase.from('expense_categories').select('id, name').order('name')
  const { data: vendors } = await supabase.from('vendors').select('id, name').order('name')

  const formattedExpenses = (rawExpenses || []).map((exp: RawExpense) => ({
    id: exp.id,
    date: exp.expense_date, 
    amount: exp.amount,
    inr_amount: exp.inr_amount,
    currency: exp.currency || 'INR',
    description: exp.description ?? undefined,
    receipt_url: exp.receipt_url ?? undefined,
    category_id: exp.category_id ?? undefined,
    vendor_id: exp.vendor_id ?? undefined,
    expense_categories: Array.isArray(exp.expense_categories) ? exp.expense_categories[0] : exp.expense_categories,
    vendors: Array.isArray(exp.vendors) ? exp.vendors[0] : exp.vendors,
  }))

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <ExpenseClient 
        expenses={formattedExpenses} 
        categories={categories || []} 
        vendors={vendors || []} 
      />
    </div>
  )
}