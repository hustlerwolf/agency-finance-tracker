'use client'

import { useState } from 'react'
import { saveExpense, deleteExpense } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Paperclip } from 'lucide-react'

export interface Expense {
  id: string;
  date: string;
  amount: number;
  inr_amount: number;
  currency: string;
  description?: string;
  receipt_url?: string;
  category_id?: string;
  vendor_id?: string;
  expense_categories?: { name: string } | null;
  vendors?: { name: string } | null;
}

export function ExpenseClient({ 
  expenses, 
  categories, 
  vendors 
}: { 
  expenses: Expense[], 
  categories: { id: string, name: string }[], 
  vendors: { id: string, name: string }[] 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState('INR')
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  function openEditModal(expense: Expense) {
    setEditingExpense(expense)
    setSelectedCurrency(expense.currency)
    setIsOpen(true)
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open)
    if (!open) {
      setEditingExpense(null)
      setSelectedCurrency('INR')
    }
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await saveExpense(formData)
    if (result.success) {
      toast.success(editingExpense ? "Expense updated!" : "Expense logged successfully!")
      handleOpenChange(false)
    } else {
      toast.error("Failed to save: " + result.error)
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this expense?")) return
    const result = await deleteExpense(id)
    if (result.success) toast.success("Expense deleted")
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
        <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild><Button>Log Expense</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingExpense ? 'Edit Expense' : 'Log New Expense'}</DialogTitle></DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              
              {editingExpense && <input type="hidden" name="id" value={editingExpense.id} />}
              {editingExpense?.receipt_url && <input type="hidden" name="existing_receipt_url" value={editingExpense.receipt_url} />}

              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input id="date" name="date" type="date" defaultValue={editingExpense ? editingExpense.date : new Date().toISOString().split('T')[0]} required />
              </div>

              <div className="grid grid-cols-3 gap-4 border p-4 rounded-md bg-slate-50">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <select 
                    id="currency" 
                    name="currency" 
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AUD">AUD (A$)</option>
                    <option value="SGD">SGD (S$)</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="amount">Bill Amount *</Label>
                  <Input id="amount" name="amount" type="number" step="0.01" min="0" defaultValue={editingExpense?.amount} placeholder="0.00" required />
                </div>

                {selectedCurrency !== 'INR' && (
                  <div className="space-y-2">
                    <Label htmlFor="inr_amount">INR Paid *</Label>
                    <Input id="inr_amount" name="inr_amount" type="number" step="0.01" min="0" defaultValue={editingExpense?.inr_amount} placeholder="Bank deduction" required />
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category_id">Category *</Label>
                  <select id="category_id" name="category_id" defaultValue={editingExpense?.category_id || ''} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendor_id">Vendor</Label>
                  <select id="vendor_id" name="vendor_id" defaultValue={editingExpense?.vendor_id || ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">None</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" defaultValue={editingExpense?.description || ''} placeholder="e.g. Hosting renewal" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receipt">
                  {editingExpense?.receipt_url ? "Upload New Receipt (Overwrites old)" : "Receipt (Optional)"}
                </Label>
                <Input id="receipt" name="receipt" type="file" accept="image/*,.pdf" className="cursor-pointer" />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving..." : (editingExpense ? "Update Expense" : "Save Expense")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Receipt</TableHead>
              <TableHead className="text-right">Bill Amount</TableHead>
              <TableHead className="text-right">INR Paid</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>{formatDate(expense.date)}</TableCell>
                <TableCell>{expense.description || '-'}</TableCell>
                <TableCell>{expense.expense_categories?.name || '-'}</TableCell>
                <TableCell>
                  {expense.receipt_url ? (
                    <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline text-sm">
                      <Paperclip className="h-4 w-4 mr-1" /> View
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium text-muted-foreground">
                  {expense.currency} {expense.amount.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-bold">
                  ₹{expense.inr_amount.toFixed(2)}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" className="rounded-md" onClick={() => openEditModal(expense)}>Edit</Button>
                  <Button variant="destructive" size="sm" className="rounded-md" onClick={() => handleDelete(expense.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
            {expenses.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No expenses logged yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}