'use client'

import { useState } from 'react'
import { saveIncome, deleteIncome } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

export interface Income {
  id: string;
  invoice_date: string;
  payment_date?: string;
  invoice_amount: number;
  inr_received: number;
  currency: string;
  invoice_number?: string;
  description?: string;
  payment_platform?: string;
  status: string;
  customer_id?: string;
  invoice_id?: string;
  customers?: { name: string } | null;
}

interface InvoiceMaster {
  id: string;
  invoice_number: string;
  total_amount: number;
  currency: string;
  customer_id: string;
}

export function IncomeClient({ 
  incomeEntries, 
  customers,
  invoices
}: { 
  incomeEntries: Income[], 
  customers: { id: string, name: string }[],
  invoices: InvoiceMaster[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingIncome, setEditingIncome] = useState<Income | null>(null)
  
  const [selectedCurrency, setSelectedCurrency] = useState('INR')
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [invoiceAmount, setInvoiceAmount] = useState<string>('')
  const [selectedInvoiceNum, setSelectedInvoiceNum] = useState('')

  function openEditModal(income: Income) {
    setEditingIncome(income)
    setSelectedCurrency(income.currency)
    setSelectedCustomer(income.customer_id || '')
    setInvoiceAmount(income.invoice_amount.toString())
    setSelectedInvoiceNum(income.invoice_number || '')
    setIsOpen(true)
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open)
    if (!open) {
      setEditingIncome(null)
      setSelectedCurrency('INR')
      setSelectedCustomer('')
      setInvoiceAmount('')
      setSelectedInvoiceNum('')
    }
  }

  const handleInvoiceSelect = (invId: string) => {
    const inv = invoices.find(i => i.id === invId)
    if (inv) {
      setSelectedCurrency(inv.currency)
      setSelectedCustomer(inv.customer_id)
      setInvoiceAmount(inv.total_amount.toString())
      setSelectedInvoiceNum(inv.invoice_number)
    } else {
      setSelectedInvoiceNum('')
    }
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await saveIncome(formData)
    if (result.success) {
      toast.success(editingIncome ? "Income updated!" : "Income logged successfully!")
      handleOpenChange(false)
    } else {
      toast.error("Failed to save: " + result.error)
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this record?")) return
    const result = await deleteIncome(id)
    if (result.success) toast.success("Record deleted")
    else toast.error("Failed to delete: " + result.error)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Income</h1>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild><Button size="sm" className="bg-primary hover:bg-primary/90 text-foreground">Log Payment Received</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingIncome ? 'Edit Payment' : 'Log Payment'}</DialogTitle></DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              
              {editingIncome && <input type="hidden" name="id" value={editingIncome.id} />}

              <div className="space-y-2 bg-slate-50 p-4 border rounded-lg">
                <Label htmlFor="invoice_id">Link to Invoice</Label>
                <select 
                  id="invoice_id" 
                  name="invoice_id" 
                  defaultValue={editingIncome?.invoice_id || ''}
                  onChange={(e) => handleInvoiceSelect(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Direct Income (No Invoice)</option>
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} - {inv.currency} {inv.total_amount}
                    </option>
                  ))}
                </select>
                <input type="hidden" name="invoice_number" value={selectedInvoiceNum} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice_date">Invoice Date *</Label>
                  <Input id="invoice_date" name="invoice_date" type="date" defaultValue={editingIncome ? editingIncome.invoice_date : new Date().toISOString().split('T')[0]} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_date">Payment Received Date</Label>
                  <Input id="payment_date" name="payment_date" type="date" defaultValue={editingIncome?.payment_date || new Date().toISOString().split('T')[0]} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border p-4 rounded-lg bg-green-50/50">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <select 
                    id="currency" 
                    name="currency" 
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="invoice_amount">Billed Amount *</Label>
                  <Input 
                    id="invoice_amount" 
                    name="invoice_amount" 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    required 
                  />
                </div>

                {selectedCurrency !== 'INR' && (
                  <div className="space-y-2">
                    <Label htmlFor="inr_received">INR Received *</Label>
                    <Input id="inr_received" name="inr_received" type="number" step="0.01" min="0" defaultValue={editingIncome?.inr_received} placeholder="Bank deposit" required />
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_id">Customer *</Label>
                  <select 
                    id="customer_id" 
                    name="customer_id" 
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    required 
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select Customer</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_platform">Platform</Label>
                  <Input id="payment_platform" name="payment_platform" defaultValue={editingIncome?.payment_platform || ''} placeholder="Wise, Stripe..." />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Notes</Label>
                <Input id="description" name="description" defaultValue={editingIncome?.description || ''} placeholder="Additional details..." />
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-foreground" disabled={loading}>
                {loading ? "Saving..." : (editingIncome ? "Update Payment" : "Log Payment")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Invoice Linked</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Billed Amount</TableHead>
              <TableHead className="text-right">INR Received</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incomeEntries.map((income) => (
              <TableRow key={income.id}>
                <TableCell>{formatDate(income.invoice_date)}</TableCell>
                <TableCell className="font-medium">{income.customers?.name || '-'}</TableCell>
                <TableCell>
                  {income.invoice_number ? <Badge variant="outline">{income.invoice_number}</Badge> : <span className="text-muted-foreground text-sm">None</span>}
                </TableCell>
                <TableCell>
                  {income.status === 'paid' ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">Paid</Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 capitalize">
                      {income.status.replace('_', ' ')}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {income.currency} {income.invoice_amount.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-bold text-green-600">
                  ₹{income.inr_received.toFixed(2)}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {/* BEAUTIFULLY ROUNDED BUTTONS */}
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={() => openEditModal(income)}>Edit</Button>
                  <Button variant="destructive" size="sm" className="rounded-lg" onClick={() => handleDelete(income.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
            {incomeEntries.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No income logged yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}