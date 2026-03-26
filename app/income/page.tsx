import { createClient } from '@/lib/supabase/server'
import { IncomeClient } from './income-client'

interface RawIncome {
  id: string;
  invoice_date: string; 
  payment_date: string | null;
  invoice_amount: number | null;
  inr_received: number | null;
  currency: string;
  invoice_number: string | null;
  description: string | null;
  payment_platform: string | null;
  status: string | null;
  customer_id: string | null;
  invoice_id: string | null;
  customers: { name: string } | { name: string }[] | null;
}

export default async function IncomePage() {
  const supabase = createClient()
  
  const { data: rawIncome } = await supabase
    .from('income_entries')
    .select(`
      id, invoice_date, payment_date, invoice_amount, inr_received, currency, invoice_number, description, payment_platform, status, customer_id, invoice_id,
      customers ( name )
    `)
    .order('invoice_date', { ascending: false })

  const { data: customers } = await supabase.from('customers').select('id, name').order('name')
  const { data: invoices } = await supabase.from('invoices').select('id, invoice_number, total_amount, currency, customer_id').order('created_at', { ascending: false })

  const formattedIncome = (rawIncome || []).map((inc: RawIncome) => ({
    id: inc.id,
    invoice_date: inc.invoice_date,
    payment_date: inc.payment_date ?? undefined,
    invoice_amount: inc.invoice_amount || 0,
    inr_received: inc.inr_received || 0,
    currency: inc.currency || 'INR',
    invoice_number: inc.invoice_number ?? undefined,
    description: inc.description ?? undefined,
    payment_platform: inc.payment_platform ?? undefined,
    status: inc.status ?? 'sent',
    customer_id: inc.customer_id ?? undefined,
    invoice_id: inc.invoice_id ?? undefined,
    customers: Array.isArray(inc.customers) ? inc.customers[0] : inc.customers,
  }))

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <IncomeClient 
        incomeEntries={formattedIncome} 
        customers={customers || []} 
        invoices={invoices || []}
      />
    </div>
  )
}