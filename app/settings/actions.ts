'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveSettings(formData: FormData) {
  const supabase = createClient()
  
  const settingsData = {
    name: formData.get('name') as string,
    email: formData.get('email') as string || null,
    phone: formData.get('phone') as string || null,
    address: formData.get('address') as string || null,
    gstin: formData.get('gstin') as string || null,
    pan: formData.get('pan') as string || null,
    state: formData.get('state') as string || 'Gujarat',
    invoice_prefix: formData.get('invoice_prefix') as string || 'INV',
    invoice_next_number: parseInt(formData.get('invoice_next_number') as string) || 1,
    payment_terms: formData.get('payment_terms') as string || '',
    default_sac_hsn: formData.get('default_sac_hsn') as string || '998311',
  }

  const { data: existing } = await supabase.from('agency_settings').select('id').maybeSingle()

  let error;
  if (existing) {
    const { error: updateError } = await supabase.from('agency_settings').update(settingsData).eq('id', existing.id)
    error = updateError
  } else {
    const { error: insertError } = await supabase.from('agency_settings').insert([settingsData])
    error = insertError
  }

  if (error) return { success: false, error: error.message }
  revalidatePath('/settings')
  return { success: true }
}