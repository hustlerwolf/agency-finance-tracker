'use client'

import { useState } from 'react'
import Link from 'next/link'
import { saveContact, deleteContact } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Building2, Linkedin, Star } from 'lucide-react'

export interface Contact {
  id: string
  company_id: string | null
  name: string
  email?: string | null
  phone?: string | null
  designation?: string | null
  linkedin_url?: string | null
  notes?: string | null
  is_primary: boolean
  created_at: string
  customers?: { id: string; name: string } | null
}

interface SimpleCompany { id: string; name: string }

export function ContactsClient({ contacts, companies }: { contacts: Contact[]; companies: SimpleCompany[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [isPrimary, setIsPrimary] = useState(false)
  const [search, setSearch] = useState('')

  function openAdd(companyId?: string) {
    setEditing(null)
    setIsPrimary(false)
    setIsOpen(true)
    if (companyId) {
      setTimeout(() => {
        const sel = document.getElementById('contact_company_id') as HTMLSelectElement | null
        if (sel) sel.value = companyId
      }, 50)
    }
  }

  function openEdit(c: Contact) {
    setEditing(c)
    setIsPrimary(c.is_primary)
    setIsOpen(true)
  }

  function handleClose(open: boolean) {
    setIsOpen(open)
    if (!open) { setEditing(null); setIsPrimary(false) }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    fd.set('is_primary', String(isPrimary))
    const result = await saveContact(fd)
    if (result.success) {
      toast.success(editing ? 'Contact updated' : 'Contact added')
      handleClose(false)
    } else {
      toast.error('Failed: ' + result.error)
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this contact?')) return
    const result = await deleteContact(id)
    if (result.success) toast.success('Contact deleted')
    else toast.error('Failed: ' + result.error)
  }

  const filtered = contacts.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q)
      || (c.designation || '').toLowerCase().includes(q)
      || (c.email || '').toLowerCase().includes(q)
      || (c.customers?.name || '').toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">Individual contacts at your client companies</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/customers">
              <Building2 className="w-4 h-4 mr-2" />
              View Companies
            </Link>
          </Button>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => openAdd()}>
            <Plus className="w-4 h-4 mr-1" />
            Add Contact
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <Input placeholder="Search contacts…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Primary</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {c.name}
                    {c.linkedin_url && (
                      <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600">
                        <Linkedin className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {c.customers ? (
                    <Link href={`/customers/${c.customers.id}`}
                      className="text-sm hover:underline text-primary flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {c.customers.name}
                    </Link>
                  ) : <span className="text-muted-foreground text-sm">—</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.designation || '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.email || '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.phone || '—'}</TableCell>
                <TableCell>
                  {c.is_primary && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                      <Star className="w-3 h-3" />
                      Primary
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(c)}>Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(c.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No contacts found. Add contacts from a company page or click "Add Contact".
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="contact_company_id">Company</Label>
                <select id="contact_company_id" name="company_id"
                  defaultValue={editing?.company_id || ''}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  <option value="">— No Company —</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_name">Name *</Label>
                <Input id="contact_name" name="name" defaultValue={editing?.name || ''} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_designation">Designation / Title</Label>
                <Input id="contact_designation" name="designation" placeholder="e.g. CEO, Marketing Manager…"
                  defaultValue={editing?.designation || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Email</Label>
                <Input id="contact_email" name="email" type="email" defaultValue={editing?.email || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Phone</Label>
                <Input id="contact_phone" name="phone" defaultValue={editing?.phone || ''} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="contact_linkedin">LinkedIn URL</Label>
                <Input id="contact_linkedin" name="linkedin_url" placeholder="https://linkedin.com/in/…"
                  defaultValue={editing?.linkedin_url || ''} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="contact_notes">Notes</Label>
                <textarea id="contact_notes" name="notes" rows={2}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
                  defaultValue={editing?.notes || ''} />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" id="is_primary" checked={isPrimary}
                  onChange={e => setIsPrimary(e.target.checked)}
                  className="rounded border-input w-4 h-4" />
                <Label htmlFor="is_primary" className="cursor-pointer">Primary contact for this company</Label>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Saving…' : editing ? 'Update Contact' : 'Add Contact'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
