'use client'

import { useState } from 'react'
import Link from 'next/link'
import { saveCustomer, deleteCustomer } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Building2, Users, ExternalLink } from 'lucide-react'
import { SortableHeader, useSort } from '@/components/sortable-header'

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana",
  "Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands","Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
]

export interface Company {
  id: string
  name: string
  type: 'indian' | 'overseas'
  email?: string | null
  phone?: string | null
  address?: string | null
  website?: string | null
  industry?: string | null
  notes?: string | null
  state?: string | null
  gstin?: string | null
  pan?: string | null
  country?: string | null
  default_currency?: string | null
  created_at: string
  contacts?: { id: string }[]
}

// Keep old interface name for backward compat
export type Customer = Company

export function CompaniesClient({ companies }: { companies: Company[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)
  const [clientType, setClientType] = useState<'indian' | 'overseas'>('indian')

  const { sortKey, sortDir, handleSort, sortData } = useSort()

  function openAdd() {
    setEditing(null)
    setClientType('indian')
    setIsOpen(true)
  }

  function openEdit(c: Company) {
    setEditing(c)
    setClientType(c.type)
    setIsOpen(true)
  }

  function handleClose(open: boolean) {
    setIsOpen(open)
    if (!open) { setEditing(null); setClientType('indian') }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const result = await saveCustomer(new FormData(e.currentTarget))
    if (result.success) {
      toast.success(editing ? 'Company updated' : 'Company added')
      handleClose(false)
    } else {
      toast.error('Failed: ' + result.error)
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this company? All its contacts will also be deleted.')) return
    const result = await deleteCustomer(id)
    if (result.success) toast.success('Company deleted')
    else toast.error('Failed: ' + result.error)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your client companies</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/customers/contacts">
              <Users className="w-4 h-4 mr-2" />
              View Contacts
            </Link>
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-foreground" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" />
            Add Company
          </Button>
        </div>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Contacts</TableHead>
              <TableHead><SortableHeader label="Created" sortKey="created_at" currentSortKey={sortKey} currentDirection={sortDir} onSort={handleSort} /></TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortData(companies).map(c => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/customers/${c.id}`} className="font-medium hover:underline flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    {c.name}
                  </Link>
                  {c.industry && <p className="text-xs text-muted-foreground mt-0.5 ml-6">{c.industry}</p>}
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    c.type === 'indian' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {c.type === 'indian' ? 'Indian' : 'Overseas'}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.type === 'indian' ? c.state || '—' : c.country || '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.email || '—'}</TableCell>
                <TableCell className="text-sm">
                  {c.website ? (
                    <a href={c.website} target="_blank" rel="noopener noreferrer"
                      className="text-blue-500 hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      {c.website.replace(/^https?:\/\//, '').split('/')[0]}
                    </a>
                  ) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <Link href={`/customers/${c.id}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    <Users className="w-3 h-3" />
                    {c.contacts?.length ?? 0}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString('en-IN')}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/customers/${c.id}`}>View</Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(c)}>Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(c.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
            {companies.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  No companies yet. Add your first client company to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Company' : 'Add New Company'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            {editing && <input type="hidden" name="id" value={editing.id} />}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Basic Info</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="name">Company Name *</Label>
                  <Input id="name" name="name" defaultValue={editing?.name || ''} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Client Type *</Label>
                  <select id="type" name="type" value={clientType}
                    onChange={e => setClientType(e.target.value as 'indian' | 'overseas')}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                    <option value="indian">Indian</option>
                    <option value="overseas">Overseas</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input id="industry" name="industry" placeholder="e.g. Technology, Healthcare…"
                    defaultValue={editing?.industry || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" defaultValue={editing?.email || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" defaultValue={editing?.phone || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" name="website" placeholder="https://" defaultValue={editing?.website || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" name="address" defaultValue={editing?.address || ''} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Location & Tax</p>
              {clientType === 'indian' ? (
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <select id="state" name="state" defaultValue={editing?.state || ''}
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Select State</option>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gstin">GSTIN</Label>
                    <Input id="gstin" name="gstin" defaultValue={editing?.gstin || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pan">PAN</Label>
                    <Input id="pan" name="pan" defaultValue={editing?.pan || ''} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" name="country" defaultValue={editing?.country || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="default_currency">Default Currency</Label>
                    <Input id="default_currency" name="default_currency" placeholder="USD, EUR, SGD…"
                      defaultValue={editing?.default_currency || 'USD'} />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Additional</p>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea id="notes" name="notes" rows={3}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
                  placeholder="Any additional notes about this company…"
                  defaultValue={editing?.notes || ''} />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Saving…' : editing ? 'Update Company' : 'Add Company'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Keep old export name for backward compat
export { CompaniesClient as CustomerClient }
