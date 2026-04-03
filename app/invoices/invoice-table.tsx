'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SortableHeader, useSort } from '@/components/sortable-header'
import { InvoiceActions } from './invoice-actions'
import { ViewPdfButton } from './view-pdf-button'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Invoice = Record<string, any>

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function InvoiceTable({ invoices, settings }: { invoices: Invoice[]; settings: any }) {
  const { sortKey, sortDir, handleSort, sortData } = useSort()
  const sorted = sortData(invoices)

  return (
    <div className="border rounded-lg bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead><SortableHeader label="Date" sortKey="invoice_date" currentSortKey={sortKey} currentDirection={sortDir} onSort={handleSort} /></TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>PDF</TableHead>
            <TableHead className="text-right">Total Amount</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
              <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
              <TableCell>{invoice.customers?.name || 'Unknown'}</TableCell>
              <TableCell>
                <ViewPdfButton invoice={invoice as never} settings={settings as never} />
              </TableCell>
              <TableCell className="text-right font-medium">
                {invoice.currency} {invoice.total_amount.toFixed(2)}
              </TableCell>
              <TableCell className="text-right">
                <InvoiceActions invoiceId={invoice.id} />
              </TableCell>
            </TableRow>
          ))}
          {sorted.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                No invoices found. Create your first one!
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
