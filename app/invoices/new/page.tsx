import { createClient } from '@/lib/supabase/server'
import { InvoiceForm } from './invoice-form'

export default async function NewInvoicePage({
  searchParams
}: {
  searchParams: { edit?: string }
}) {
  const supabase = createClient()
  const editId = searchParams.edit
  
  const { data: customers } = await supabase.from('customers').select('*').order('name')
  const { data: settings } = await supabase.from('agency_settings').select('*').maybeSingle()

  // If in edit mode, fetch the specific invoice data
  let initialInvoice = null
  if (editId) {
    const { data } = await supabase.from('invoices').select('*').eq('id', editId).single()
    initialInvoice = data
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          {initialInvoice ? 'Edit Invoice' : 'Create New Invoice'}
        </h1>
        <p className="text-muted-foreground">
          {initialInvoice ? `Modifying Invoice #${initialInvoice.invoice_number}` : 'Fill out the details below to generate and save an invoice.'}
        </p>
      </div>
      
      <InvoiceForm 
        customers={customers || []} 
        settings={settings || {}} 
        initialInvoice={initialInvoice}
      />
    </div>
  )
}