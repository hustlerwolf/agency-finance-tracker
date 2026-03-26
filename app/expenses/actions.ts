'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveExpense(formData: FormData) {
  const supabase = createClient()
  const id = formData.get('id') as string
  
  // Keep the old receipt if they don't upload a new one during an edit
  let receiptUrl = formData.get('existing_receipt_url') as string | null
  const file = formData.get('receipt') as File | null

  if (file && file.size > 0) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, file)
    if (uploadError) return { success: false, error: "File upload failed: " + uploadError.message }

    const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName)
    receiptUrl = publicUrl
  }

  const vendorId = formData.get('vendor_id') as string
  const finalVendorId = vendorId && vendorId.trim() !== '' ? vendorId : null
  
  const currency = formData.get('currency') as string || 'INR'
  const amountVal = parseFloat(formData.get('amount') as string)
  const inrAmountVal = currency === 'INR' ? amountVal : parseFloat(formData.get('inr_amount') as string)

  const expenseData = {
    expense_date: formData.get('date') as string, 
    amount: amountVal,
    inr_amount: inrAmountVal, 
    currency: currency, 
    category_id: formData.get('category_id') as string,
    vendor_id: finalVendorId,
    description: formData.get('description') as string || null,
    receipt_url: receiptUrl,
  }

  if (id) {
    const { error } = await supabase.from('expense_entries').update(expenseData).eq('id', id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase.from('expense_entries').insert([expenseData])
    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/expenses')
  return { success: true }
}

export async function deleteExpense(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('expense_entries').delete().eq('id', id)
  
  if (error) return { success: false, error: error.message }
  
  revalidatePath('/expenses')
  return { success: true }
}