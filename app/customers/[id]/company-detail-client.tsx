'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { saveCustomer, deleteCustomer, saveContact, deleteContact } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  ArrowLeft, Building2, Mail, Phone, Globe, MapPin,
  Plus, Pencil, Trash2, Star, Linkedin, User,
} from 'lucide-react'
import type { Company } from '../customer-client'
import type { Contact } from '../contacts/contacts-client'

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana",
  "Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands","Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
]

interface SimpleCompany { id: string; name: string }

export function CompanyDetailClient({
  company,
  contacts: initialContacts,
  allCompanies,
}: {
  company: Company
  contacts: Contact[]
  allCompanies: SimpleCompany[]
}) {
  const router = useRouter()
  const [contacts, setContacts] = useState(initialContacts)

  // Company edit
  const [isCompanyEditOpen, setIsCompanyEditOpen] = useState(false)
  const [companyLoading, setCompanyLoading] = useState(false)
  const [clientType, setClientType] = useState<'indian' | 'overseas'>(company.type)

  // Contact form
  const [isContactOpen, setIsContactOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [contactLoading, setContactLoading] = useState(false)
  const [isPrimary, setIsPrimary] = useState(false)

  async function handleCompanySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCompanyLoading(true)
    const result = await saveCustomer(new FormData(e.currentTarget))
    if (result.success) {
      toast.success('Company updated')
      setIsCompanyEditOpen(false)
      router.refresh()
    } else {
      toast.error('Failed: ' + result.error)
    }
    setCompanyLoading(false)
  }

  async function handleDeleteCompany() {
    if (!confirm('Delete this company? All contacts will also be deleted.')) return
    const result = await deleteCustomer(company.id)
    if (result.success) {
      toast.success('Company deleted')
      router.push('/customers')
    } else {
      toast.error('Failed: ' + result.error)
    }
  }

  function openAddContact() {
    setEditingContact(null)
    setIsPrimary(false)
    setIsContactOpen(true)
  }

  function openEditContact(c: Contact) {
    setEditingContact(c)
    setIsPrimary(c.is_primary)
    setIsContactOpen(true)
  }

  function closeContact(open: boolean) {
    setIsContactOpen(open)
    if (!open) { setEditingContact(null); setIsPrimary(false) }
  }

  async function handleContactSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setContactLoading(true)
    const fd = new FormData(e.currentTarget)
    fd.set('is_primary', String(isPrimary))
    const result = await saveContact(fd)
    if (result.success) {
      toast.success(editingContact ? 'Contact updated' : 'Contact added')
      closeContact(false)
      router.refresh()
    } else {
      toast.error('Failed: ' + result.error)
    }
    setContactLoading(false)
  }

  async function handleDeleteContact(id: string) {
    if (!confirm('Delete this contact?')) return
    const result = await deleteContact(id)
    if (result.success) {
      toast.success('Contact deleted')
      setContacts(prev => prev.filter(c => c.id !== id))
    } else {
      toast.error('Failed: ' + result.error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mt-1">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                company.type === 'indian' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {company.type === 'indian' ? 'Indian' : 'Overseas'}
              </span>
            </div>
            {company.industry && <p className="text-sm text-muted-foreground mt-1">{company.industry}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsCompanyEditOpen(true)}>
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDeleteCompany}>
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Contacts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Contacts</h2>
            <Button size="sm" onClick={openAddContact}>
              <Plus className="w-4 h-4 mr-1" />
              Add Contact
            </Button>
          </div>

          {contacts.length === 0 ? (
            <div className="border rounded-xl p-10 text-center text-muted-foreground bg-muted/20">
              <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No contacts yet.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={openAddContact}>
                Add first contact
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {contacts.map(c => (
                <div key={c.id} className="border rounded-xl p-4 bg-card space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{c.name}</p>
                        {c.is_primary && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-700">
                            <Star className="w-2.5 h-2.5" />
                            Primary
                          </span>
                        )}
                      </div>
                      {c.designation && <p className="text-xs text-muted-foreground">{c.designation}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditContact(c)}
                        className="p-1 text-muted-foreground hover:text-foreground">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteContact(c.id)}
                        className="p-1 text-muted-foreground hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 hover:text-foreground">
                        <Mail className="w-3 h-3" /> {c.email}
                      </a>
                    )}
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 hover:text-foreground">
                        <Phone className="w-3 h-3" /> {c.phone}
                      </a>
                    )}
                    {c.linkedin_url && (
                      <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 hover:text-blue-500">
                        <Linkedin className="w-3 h-3" /> LinkedIn
                      </a>
                    )}
                  </div>
                  {c.notes && <p className="text-xs text-muted-foreground border-t pt-2 mt-2">{c.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right — Company details */}
        <div className="space-y-4">
          <div className="border rounded-xl p-5 bg-card space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Company Details</h3>
            <div className="space-y-2.5 text-sm">
              {company.email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <a href={`mailto:${company.email}`} className="hover:underline truncate">{company.email}</a>
                </div>
              )}
              {company.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <a href={`tel:${company.phone}`} className="hover:underline">{company.phone}</a>
                </div>
              )}
              {company.website && (
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <a href={company.website} target="_blank" rel="noopener noreferrer"
                    className="text-blue-500 hover:underline truncate">
                    {company.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              {(company.address || company.state || company.country) && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    {company.address && <p>{company.address}</p>}
                    {company.type === 'indian' && company.state && <p>{company.state}</p>}
                    {company.type === 'overseas' && company.country && <p>{company.country}</p>}
                  </div>
                </div>
              )}
            </div>

            {company.type === 'indian' && (company.gstin || company.pan) && (
              <div className="border-t pt-3 space-y-1.5 text-sm">
                {company.gstin && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GSTIN</span>
                    <span className="font-mono text-xs">{company.gstin}</span>
                  </div>
                )}
                {company.pan && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PAN</span>
                    <span className="font-mono text-xs">{company.pan}</span>
                  </div>
                )}
              </div>
            )}

            {company.type === 'overseas' && company.default_currency && (
              <div className="border-t pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Currency</span>
                  <span className="font-medium">{company.default_currency}</span>
                </div>
              </div>
            )}

            {company.industry && (
              <div className="border-t pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Industry</span>
                  <span>{company.industry}</span>
                </div>
              </div>
            )}

            {company.notes && (
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{company.notes}</p>
              </div>
            )}

            <div className="border-t pt-3 text-xs text-muted-foreground">
              Added {new Date(company.created_at).toLocaleDateString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Company Dialog */}
      <Dialog open={isCompanyEditOpen} onOpenChange={setIsCompanyEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCompanySubmit} className="space-y-5">
            <input type="hidden" name="id" value={company.id} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Company Name *</Label>
                <Input name="name" defaultValue={company.name} required />
              </div>
              <div className="space-y-2">
                <Label>Client Type *</Label>
                <select name="type" value={clientType}
                  onChange={e => setClientType(e.target.value as 'indian' | 'overseas')}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  <option value="indian">Indian</option>
                  <option value="overseas">Overseas</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Input name="industry" defaultValue={company.industry || ''} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="email" type="email" defaultValue={company.email || ''} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input name="phone" defaultValue={company.phone || ''} />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input name="website" placeholder="https://" defaultValue={company.website || ''} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input name="address" defaultValue={company.address || ''} />
              </div>
            </div>
            <div className="border-t pt-4">
              {clientType === 'indian' ? (
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>State</Label>
                    <select name="state" defaultValue={company.state || ''}
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Select State</option>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>GSTIN</Label>
                    <Input name="gstin" defaultValue={company.gstin || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label>PAN</Label>
                    <Input name="pan" defaultValue={company.pan || ''} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input name="country" defaultValue={company.country || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label>Default Currency</Label>
                    <Input name="default_currency" defaultValue={company.default_currency || 'USD'} />
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea name="notes" rows={3}
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
                defaultValue={company.notes || ''} />
            </div>
            <Button type="submit" className="w-full" disabled={companyLoading}>
              {companyLoading ? 'Saving…' : 'Update Company'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Contact Dialog */}
      <Dialog open={isContactOpen} onOpenChange={closeContact}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingContact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleContactSubmit} className="space-y-4">
            {editingContact && <input type="hidden" name="id" value={editingContact.id} />}
            <input type="hidden" name="company_id" value={company.id} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input name="name" defaultValue={editingContact?.name || ''} required />
              </div>
              <div className="space-y-2">
                <Label>Designation / Title</Label>
                <Input name="designation" placeholder="e.g. CEO, Marketing Manager…"
                  defaultValue={editingContact?.designation || ''} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="email" type="email" defaultValue={editingContact?.email || ''} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input name="phone" defaultValue={editingContact?.phone || ''} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>LinkedIn URL</Label>
                <Input name="linkedin_url" placeholder="https://linkedin.com/in/…"
                  defaultValue={editingContact?.linkedin_url || ''} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Notes</Label>
                <textarea name="notes" rows={2}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
                  defaultValue={editingContact?.notes || ''} />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" id="edit_is_primary" checked={isPrimary}
                  onChange={e => setIsPrimary(e.target.checked)}
                  className="rounded border-input w-4 h-4" />
                <Label htmlFor="edit_is_primary" className="cursor-pointer">Primary contact for this company</Label>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={contactLoading}>
              {contactLoading ? 'Saving…' : editingContact ? 'Update Contact' : 'Add Contact'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
