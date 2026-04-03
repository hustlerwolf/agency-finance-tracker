import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { InvoiceTable } from './invoice-table'

export default async function InvoicesPage() {
  const supabase = createClient()

  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      *,
      customers ( name, address, gstin )
    `)
    .order('created_at', { ascending: false })

  const { data: settings } = await supabase.from('agency_settings').select('*').maybeSingle()

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">Manage and view your generated invoices.</p>
        </div>
        <Link href="/invoices/new">
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">Create New Invoice</Button>
        </Link>
      </div>

      <InvoiceTable invoices={invoices || []} settings={settings || {}} />
    </div>
  )
}
