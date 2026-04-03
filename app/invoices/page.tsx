import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { InvoiceActions } from './invoice-actions'
import { ViewPdfButton } from './view-pdf-button'

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">Manage and view your generated invoices.</p>
        </div>
        <Link href="/invoices/new">
          <Button className="rounded-lg">Create New Invoice</Button>
        </Link>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>PDF</TableHead> {/* NEW COLUMN */}
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices?.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                <TableCell>{invoice.customers?.name || 'Unknown'}</TableCell>
                
                {/* NEW PDF VIEW BUTTON */}
                <TableCell>
                  <ViewPdfButton invoice={invoice} settings={settings || {}} />
                </TableCell>

                <TableCell className="text-right font-medium">
                  {invoice.currency} {invoice.total_amount.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  <InvoiceActions invoiceId={invoice.id} />
                </TableCell>
              </TableRow>
            ))}
            {!invoices?.length && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  No invoices found. Create your first one!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}