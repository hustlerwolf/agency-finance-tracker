'use client'

import { useState } from 'react'
import { saveCustomer, deleteCustomer } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
]

export interface Customer {
  id: string;
  name: string;
  type: 'indian' | 'overseas';
  email?: string;
  phone?: string;
  address?: string;
  state?: string;
  gstin?: string;
  pan?: string;
  country?: string;
  default_currency?: string;
}

export function CustomerClient({ customers }: { customers: Customer[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [clientType, setClientType] = useState<'indian' | 'overseas'>('indian')
  
  // NEW: State to track which customer is being edited
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

  // NEW: Function to open modal in "Edit" mode
  function openEditModal(customer: Customer) {
    setEditingCustomer(customer)
    setClientType(customer.type)
    setIsOpen(true)
  }

  // NEW: Clean up state when modal closes so "Add New" is blank
  function handleOpenChange(open: boolean) {
    setIsOpen(open)
    if (!open) {
      setEditingCustomer(null)
      setClientType('indian')
    }
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await saveCustomer(formData)
    
    if (result.success) {
      toast.success(editingCustomer ? "Customer updated successfully!" : "Customer saved successfully!")
      handleOpenChange(false) // Close and reset
    } else {
      toast.error("Failed to save: " + result.error)
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this customer?")) return
    
    const result = await deleteCustomer(id)
    if (result.success) {
      toast.success("Customer deleted")
    } else {
      toast.error("Failed to delete: " + result.error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button onClick={() => setClientType('indian')}>Add Customer</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              
              {/* NEW: Hidden input to pass the ID if we are editing */}
              {editingCustomer && <input type="hidden" name="id" value={editingCustomer.id} />}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Company / Name *</Label>
                  <Input id="name" name="name" defaultValue={editingCustomer?.name || ''} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Client Type *</Label>
                  <select 
                    id="type" 
                    name="type" 
                    value={clientType}
                    onChange={(e) => setClientType(e.target.value as 'indian' | 'overseas')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="indian">Indian</option>
                    <option value="overseas">Overseas</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" defaultValue={editingCustomer?.email || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" defaultValue={editingCustomer?.phone || ''} />
                </div>
              </div>

              {/* Conditional Fields: Indian vs Overseas */}
              {clientType === 'indian' ? (
                <div className="grid grid-cols-3 gap-4 border-t pt-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <select 
                      id="state" 
                      name="state" 
                      defaultValue={editingCustomer?.state || ''}
                      required 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select State</option>
                      {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gstin">GSTIN</Label>
                    <Input id="gstin" name="gstin" defaultValue={editingCustomer?.gstin || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pan">PAN</Label>
                    <Input id="pan" name="pan" defaultValue={editingCustomer?.pan || ''} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Input id="country" name="country" defaultValue={editingCustomer?.country || ''} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="default_currency">Default Currency</Label>
                    <Input id="default_currency" name="default_currency" defaultValue={editingCustomer?.default_currency || 'USD'} placeholder="USD, EUR, SGD..." />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full mt-6" disabled={loading}>
                {loading ? "Saving..." : (editingCustomer ? "Update Customer" : "Save Customer")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell className="capitalize">{customer.type}</TableCell>
                <TableCell>{customer.type === 'indian' ? customer.state : customer.country}</TableCell>
                <TableCell>{customer.email || '-'}</TableCell>
                <TableCell className="text-right space-x-2">
                  {/* NEW: Added Edit Button */}
                  <Button variant="outline" size="sm" className="rounded-md" onClick={() => openEditModal(customer)}>Edit</Button>
                  <Button variant="destructive" size="sm" className="rounded-md" onClick={() => handleDelete(customer.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  No customers found. Add your first client to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}