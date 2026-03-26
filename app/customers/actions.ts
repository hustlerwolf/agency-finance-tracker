'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveCustomer(formData: FormData) {
  const supabase = createClient()
  
  const id = formData.get('id') as string // Look for the hidden ID field
  const type = formData.get('type') as 'indian' | 'overseas'
  
  const customerData = {
    name: formData.get('name') as string,
    type: type,
    email: formData.get('email') as string || null,
    phone: formData.get('phone') as string || null,
    address: formData.get('address') as string || null,
    // Indian specific fields
    state: type === 'indian' ? formData.get('state') as string : null,
    gstin: type === 'indian' ? formData.get('gstin') as string : null,
    pan: type === 'indian' ? formData.get('pan') as string : null,
    // Overseas specific fields
    country: type === 'overseas' ? formData.get('country') as string : null,
    default_currency: type === 'overseas' ? (formData.get('default_currency') as string || 'INR') : 'INR',
  }

  let error;

  if (id) {
    // UPDATE EXISTING
    const { error: updateError } = await supabase
      .from('customers')
      .update(customerData)
      .eq('id', id)
    error = updateError
  } else {
    // INSERT NEW
    const { error: insertError } = await supabase
      .from('customers')
      .insert([customerData])
    error = insertError
  }

  if (error) return { success: false, error: error.message }

  revalidatePath('/customers')
  return { success: true }
}

export async function deleteCustomer(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('customers').delete().eq('id', id)
  
  if (error) return { success: false, error: error.message }
  
  revalidatePath('/customers')
  return { success: true }
}