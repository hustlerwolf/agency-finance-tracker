'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { saveInvoice, InvoiceData } from './actions'
import { Plus, Trash2 } from 'lucide-react'

export interface InvoiceCustomer {
  id: string;
  name: string;
  type: 'indian' | 'overseas';
  state?: string;
  gstin?: string;
  address?: string;
  default_currency?: string;
}

export interface InvoiceSettings {
  name?: string;
  state?: string;
  gstin?: string;
  default_sac_hsn?: string;
  payment_terms?: string;
  invoice_prefix?: string;
  invoice_next_number?: number;
}

export function InvoiceForm({ 
  customers, 
  settings, 
  initialInvoice 
}: { 
  customers: InvoiceCustomer[], 
  settings: InvoiceSettings | null,
  initialInvoice?: InvoiceData 
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [submitAction, setSubmitAction] = useState<'save' | 'save_and_view'>('save')
  
  // PRE-FILL FORM STATE
  const [customerId, setCustomerId] = useState(initialInvoice?.customer_id || '')
  const [invoiceDate, setInvoiceDate] = useState(initialInvoice?.invoice_date || new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(initialInvoice?.due_date || '')
  const [notes, setNotes] = useState(initialInvoice?.notes || '')
  const [paymentInstructions, setPaymentInstructions] = useState(initialInvoice?.payment_instructions || settings?.payment_terms || '')
  
  const [lineItems, setLineItems] = useState<{ description: string; sac_hsn: string; qty: number; rate: number }[]>(
    initialInvoice?.line_items || [{ description: '', sac_hsn: settings?.default_sac_hsn || '998311', qty: 1, rate: 0 }]
  )

  const selectedCustomer = useMemo(() => customers.find(c => c.id === customerId), [customerId, customers])
  const agencyState = settings?.state || 'Gujarat' 
  const isIndian = selectedCustomer?.type === 'indian'
  const currency = isIndian ? 'INR' : (selectedCustomer?.default_currency || 'USD')
  
  const isLocalGST = isIndian && selectedCustomer?.state === agencyState
  const gstType = !isIndian ? 'none' : (isLocalGST ? 'cgst_sgst' : 'igst')
  
  const subtotal = lineItems.reduce((acc, item) => acc + (item.qty * item.rate), 0)
  
  const cgstAmount = gstType === 'cgst_sgst' ? subtotal * 0.09 : 0
  const sgstAmount = gstType === 'cgst_sgst' ? subtotal * 0.09 : 0
  const igstAmount = gstType === 'igst' ? subtotal * 0.18 : 0
  const totalAmount = subtotal + cgstAmount + sgstAmount + igstAmount

  const addLineItem = () => setLineItems([...lineItems, { description: '', sac_hsn: settings?.default_sac_hsn || '', qty: 1, rate: 0 }])
  const removeLineItem = (index: number) => setLineItems(lineItems.filter((_, i) => i !== index))
  
  const updateLineItem = (index: number, field: string, value: string | number) => {
    const newItems = [...lineItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setLineItems(newItems)
  }

  const generatePDF = async (invoiceNumber: string) => {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF()
    const agencyName = settings?.name || 'Onlee Agency'
    
    doc.setFontSize(20)
    doc.text("INVOICE", 14, 22)
    doc.setFontSize(10)
    doc.text(agencyName, 14, 30)
    if (settings?.gstin) doc.text(`GSTIN: ${settings.gstin}`, 14, 35)
    
    doc.text(`Invoice #: ${invoiceNumber}`, 130, 22)
    doc.text(`Date: ${invoiceDate}`, 130, 27)
    if (dueDate) doc.text(`Due Date: ${dueDate}`, 130, 32)
    
    doc.text("Bill To:", 14, 50)
    doc.setFont('', 'bold')
    doc.text(selectedCustomer?.name || '', 14, 55)
    doc.setFont('', 'normal')
    if (selectedCustomer?.address) doc.text(selectedCustomer.address, 14, 60)
    if (isIndian && selectedCustomer?.gstin) doc.text(`GSTIN: ${selectedCustomer.gstin}`, 14, 65)

    const tableData = lineItems.map(item => [
      item.description,
      item.sac_hsn,
      item.qty.toString(),
      `${currency} ${item.rate.toFixed(2)}`,
      `${currency} ${(item.qty * item.rate).toFixed(2)}`
    ])

    autoTable(doc, {
      startY: 75,
      head: [['Description', 'SAC/HSN', 'Qty', 'Rate', 'Amount']],
      body: tableData,
    })

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

    doc.text(`Subtotal:`, 130, finalY)
    doc.text(`${currency} ${subtotal.toFixed(2)}`, 170, finalY)
    
    let currentY = finalY + 7
    if (isIndian) {
      if (gstType === 'cgst_sgst') {
        doc.text(`CGST (9%):`, 130, currentY)
        doc.text(`${currency} ${cgstAmount.toFixed(2)}`, 170, currentY)
        currentY += 7
        doc.text(`SGST (9%):`, 130, currentY)
        doc.text(`${currency} ${sgstAmount.toFixed(2)}`, 170, currentY)
      } else {
        doc.text(`IGST (18%):`, 130, currentY)
        doc.text(`${currency} ${igstAmount.toFixed(2)}`, 170, currentY)
      }
      currentY += 7
    }

    doc.setFont('', 'bold')
    doc.text(`Total:`, 130, currentY)
    doc.text(`${currency} ${totalAmount.toFixed(2)}`, 170, currentY)
    
    doc.save(`${invoiceNumber}.pdf`)

    // Instead of forcing a download, open the PDF in a new browser tab
    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer) return toast.error("Please select a customer")
    
    setLoading(true)
    
    // Use the existing number if editing, otherwise generate a new one
    const invoiceNumber = initialInvoice?.invoice_number || `${settings?.invoice_prefix || 'INV'}-${String(settings?.invoice_next_number || 1).padStart(4, '0')}`

    const payload: InvoiceData = {
      id: initialInvoice?.id, // Passing ID safely handles updates
      invoice_number: invoiceNumber,
      customer_id: selectedCustomer.id,
      invoice_date: invoiceDate,
      due_date: dueDate,
      type: isIndian ? 'indian' : 'overseas',
      currency,
      line_items: lineItems.map(item => ({ ...item, amount: item.qty * item.rate })),
      subtotal,
      gst_type: gstType as 'cgst_sgst' | 'igst' | 'none',
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      total_amount: totalAmount,
      notes,
      payment_instructions: paymentInstructions
    }

    const result = await saveInvoice(payload)
    
    if (result.success) {
      toast.success(initialInvoice ? "Invoice updated!" : "Invoice created successfully!")
      
      if (submitAction === 'save_and_view') {
        generatePDF(invoiceNumber) 
      }

      router.push('/invoices') 
    } else {
      toast.error("Failed to save invoice: " + result.error)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Top Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label>Customer</Label>
          <select 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={customerId} 
            onChange={e => setCustomerId(e.target.value)}
            required
            disabled={!!initialInvoice} // Prevent changing customer on existing invoice to prevent tax math errors
          >
            <option value="" disabled>Select a customer</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Invoice Date</Label>
          <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
      </div>

      {/* Line Items */}
      <div className="border rounded-md p-4 space-y-4 bg-white shadow-sm">
        <h3 className="font-semibold text-lg">Line Items</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/2">Description</TableHead>
              <TableHead>SAC/HSN</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Rate ({currency})</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map((item, index) => (
              <TableRow key={index}>
                <TableCell><Input value={item.description} onChange={e => updateLineItem(index, 'description', e.target.value)} required /></TableCell>
                <TableCell><Input value={item.sac_hsn} onChange={e => updateLineItem(index, 'sac_hsn', e.target.value)} /></TableCell>
                <TableCell><Input type="number" min="1" value={item.qty} onChange={e => updateLineItem(index, 'qty', parseFloat(e.target.value) || 0)} required /></TableCell>
                <TableCell><Input type="number" min="0" value={item.rate} onChange={e => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)} required /></TableCell>
                <TableCell className="font-medium">{(item.qty * item.rate).toFixed(2)}</TableCell>
                <TableCell>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeLineItem(index)} disabled={lineItems.length === 1}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="mt-2 rounded-md">
          <Plus className="h-4 w-4 mr-2" /> Add Item
        </Button>
      </div>

      {/* Totals & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Thank you for your business!" />
          </div>
          <div className="space-y-2">
            <Label>Payment Instructions</Label>
            <Textarea value={paymentInstructions} onChange={e => setPaymentInstructions(e.target.value)} placeholder="Bank details or payment link..." />
          </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-lg border space-y-3 shadow-sm">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>{currency} {subtotal.toFixed(2)}</span>
          </div>
          
          {isIndian && gstType === 'cgst_sgst' && (
            <>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>CGST (9%):</span>
                <span>{currency} {cgstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>SGST (9%):</span>
                <span>{currency} {sgstAmount.toFixed(2)}</span>
              </div>
            </>
          )}
          
          {isIndian && gstType === 'igst' && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>IGST (18%):</span>
              <span>{currency} {igstAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-lg font-bold border-t pt-3">
            <span>Total:</span>
            <span>{currency} {totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Button type="submit" variant="outline" className="rounded-md" onClick={() => setSubmitAction('save')} disabled={loading}>
          {loading ? "Processing..." : (initialInvoice ? "Update Only" : "Save Invoice Only")}
        </Button>
        <Button type="submit" className="rounded-md" onClick={() => setSubmitAction('save_and_view')} disabled={loading}>
          {loading ? "Processing..." : (initialInvoice ? "Update & View PDF" : "Save & View PDF")}
        </Button>
      </div>
    </form>
  )
}