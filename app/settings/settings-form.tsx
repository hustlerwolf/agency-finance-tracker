'use client'

import { useState } from 'react'
import { saveSettings } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Building2, FileDigit, Landmark } from 'lucide-react'

// Define the settings interface
interface AgencySettings {
  id?: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  gstin: string | null;
  pan: string | null;
  state: string;
  invoice_prefix: string;
  invoice_next_number: number;
  payment_terms: string | null;
  default_sac_hsn: string | null;
}

export function SettingsForm({ initialData }: { initialData: AgencySettings | null }) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = await saveSettings(formData)
    
    if (result.success) {
      toast.success("Settings updated successfully!")
    } else {
      toast.error("Error: " + result.error)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border rounded-lg p-6 bg-card shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Building2 className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-lg">Business Profile</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Agency Name *</Label>
            <Input id="name" name="name" defaultValue={initialData?.name || ''} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">Base State</Label>
            <Input id="state" name="state" defaultValue={initialData?.state || 'Gujarat'} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea id="address" name="address" defaultValue={initialData?.address || ''} rows={2} />
        </div>
      </div>

      <div className="border rounded-lg p-6 bg-card shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Landmark className="h-5 w-5 text-green-600" />
          <h2 className="font-semibold text-lg">Tax Details</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gstin">GSTIN</Label>
            <Input id="gstin" name="gstin" defaultValue={initialData?.gstin || ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pan">PAN</Label>
            <Input id="pan" name="pan" defaultValue={initialData?.pan || ''} />
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-6 bg-card shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <FileDigit className="h-5 w-5 text-purple-600" />
          <h2 className="font-semibold text-lg">Invoicing</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="invoice_prefix">Prefix</Label>
            <Input id="invoice_prefix" name="invoice_prefix" defaultValue={initialData?.invoice_prefix || 'INV'} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice_next_number">Next #</Label>
            <Input id="invoice_next_number" name="invoice_next_number" type="number" defaultValue={initialData?.invoice_next_number || 1} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="payment_terms">Bank Details / Terms</Label>
          <Textarea id="payment_terms" name="payment_terms" defaultValue={initialData?.payment_terms || ''} rows={3} />
        </div>
      </div>

      <Button type="submit" className="w-full rounded-md" disabled={loading}>
        {loading ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  )
}