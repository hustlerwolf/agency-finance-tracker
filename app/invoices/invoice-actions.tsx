'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { deleteInvoice } from './new/actions'
import { useRouter } from 'next/navigation'

export function InvoiceActions({ invoiceId }: { invoiceId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this invoice?")) return
    
    setLoading(true)
    const result = await deleteInvoice(invoiceId)
    
    if (result.success) {
      toast.success("Invoice deleted successfully")
    } else {
      toast.error("Failed to delete: " + result.error)
    }
    setLoading(false)
  }

  function handleEdit() {
    // For now, we will route to the new page with the ID in the URL.
    // We will update your form to read this next!
    router.push(`/invoices/new?edit=${invoiceId}`)
  }

  return (
    <div className="flex justify-end space-x-2">
      <Button variant="outline" size="sm" className="rounded-lg" onClick={handleEdit}>
        Edit
      </Button>
      <Button variant="destructive" size="sm" className="rounded-lg" disabled={loading} onClick={handleDelete}>
        Delete
      </Button>
    </div>
  )
}