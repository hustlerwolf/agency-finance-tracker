'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveIncome(formData: FormData) {
  const supabase = createClient()
  
  const id = formData.get('id') as string // Look for the hidden ID field for edits
  const customerId = formData.get('customer_id') as string
  const finalCustomerId = customerId && customerId.trim() !== '' ? customerId : null
  
  const invoiceId = formData.get('invoice_id') as string
  const finalInvoiceId = invoiceId && invoiceId.trim() !== '' ? invoiceId : null
  const invoiceNumber = formData.get('invoice_number') as string || null
  
  const rawCurrency = formData.get('currency') as string || 'INR'
  const currency = rawCurrency.trim().toUpperCase()
  
  const invoiceAmountVal = parseFloat(formData.get('invoice_amount') as string) || 0
  
  let inrReceivedVal = parseFloat(formData.get('inr_received') as string)
  if (isNaN(inrReceivedVal)) {
    inrReceivedVal = invoiceAmountVal
  }

  const incomeData = {
    invoice_date: formData.get('invoice_date') as string, 
    payment_date: formData.get('payment_date') as string || null,
    invoice_amount: invoiceAmountVal,
    inr_received: inrReceivedVal, 
    currency: currency, 
    customer_id: finalCustomerId,
    invoice_id: finalInvoiceId,        
    invoice_number: invoiceNumber,     
    description: formData.get('description') as string || null,
    payment_platform: formData.get('payment_platform') as string || null,
    status: 'paid' 
  }

  if (id) {
    // EXPLICIT EDIT: Update this exact row
    const { error } = await supabase.from('income_entries').update(incomeData).eq('id', id)
    if (error) return { success: false, error: error.message }
  } else if (finalInvoiceId) {
    // SMART OVERWRITE: For a new payment tied to a pending invoice
    const { data: existing } = await supabase
      .from('income_entries')
      .select('id')
      .eq('invoice_id', finalInvoiceId)
      .neq('status', 'paid')
      .limit(1)

    if (existing && existing.length > 0) {
      const { error } = await supabase.from('income_entries').update(incomeData).eq('id', existing[0].id)
      if (error) return { success: false, error: error.message }
      revalidatePath('/income')
      return { success: true }
    } else {
      const { error } = await supabase.from('income_entries').insert([incomeData])
      if (error) return { success: false, error: error.message }
    }
  } else {
    // STANDARD INSERT: No invoice linked
    const { error } = await supabase.from('income_entries').insert([incomeData])
    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/income')
  return { success: true }
}

export async function deleteIncome(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('income_entries').delete().eq('id', id)
  
  if (error) return { success: false, error: error.message }
  
  revalidatePath('/income')
  return { success: true }
}