'use client'

import { useState } from 'react'
import { saveVendor, deleteVendor } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'

export interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export function VendorClient({ vendors }: { vendors: Vendor[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // State to track which vendor is being edited
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)

  function openEditModal(vendor: Vendor) {
    setEditingVendor(vendor)
    setIsOpen(true)
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open)
    if (!open) {
      setEditingVendor(null)
    }
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await saveVendor(formData)
    
    if (result.success) {
      toast.success(editingVendor ? "Vendor updated successfully!" : "Vendor added successfully!")
      handleOpenChange(false)
    } else {
      toast.error("Failed to save: " + result.error)
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this vendor?")) return
    
    const result = await deleteVendor(id)
    if (result.success) {
      toast.success("Vendor deleted")
    } else {
      toast.error("Failed to delete: " + result.error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button>Add Vendor</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              
              {editingVendor && <input type="hidden" name="id" value={editingVendor.id} />}

              <div className="space-y-2">
                <Label htmlFor="name">Vendor Name *</Label>
                <Input id="name" name="name" defaultValue={editingVendor?.name || ''} placeholder="e.g., Vercel, Upwork..." required />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" defaultValue={editingVendor?.email || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" defaultValue={editingVendor?.phone || ''} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" defaultValue={editingVendor?.notes || ''} placeholder="Account details, portal links..." />
              </div>

              <Button type="submit" className="w-full mt-4" disabled={loading}>
                {loading ? "Saving..." : (editingVendor ? "Update Vendor" : "Save Vendor")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor Name</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((vendor) => (
              <TableRow key={vendor.id}>
                <TableCell className="font-medium">{vendor.name}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    {vendor.email && <div>{vendor.email}</div>}
                    {vendor.phone && <div className="text-muted-foreground">{vendor.phone}</div>}
                    {!vendor.email && !vendor.phone && <span className="text-muted-foreground">-</span>}
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">
                  {vendor.notes || '-'}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" className="rounded-md" onClick={() => openEditModal(vendor)}>Edit</Button>
                  <Button variant="destructive" size="sm" className="rounded-md" onClick={() => handleDelete(vendor.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
            {vendors.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                  No vendors found. Add your first software provider or contractor.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}