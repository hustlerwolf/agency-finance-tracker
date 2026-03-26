'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveVendor(formData: FormData) {
  const supabase = createClient()
  const id = formData.get('id') as string

  const vendorData = {
    name: formData.get('name') as string,
    email: formData.get('email') as string || null,
    phone: formData.get('phone') as string || null,
    notes: formData.get('notes') as string || null,
  }

  let error;

  if (id) {
    // UPDATE EXISTING
    const { error: updateError } = await supabase
      .from('vendors')
      .update(vendorData)
      .eq('id', id)
    error = updateError
  } else {
    // INSERT NEW
    const { error: insertError } = await supabase
      .from('vendors')
      .insert([vendorData])
    error = insertError
  }

  if (error) return { success: false, error: error.message }

  revalidatePath('/vendors')
  return { success: true }
}

export async function deleteVendor(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('vendors').delete().eq('id', id)
  
  if (error) return { success: false, error: error.message }
  
  revalidatePath('/vendors')
  return { success: true }
}