'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── COMPANIES ────────────────────────────────────────────────────────────────

export async function saveCustomer(formData: FormData) {
  const supabase = createClient()
  const id = formData.get('id') as string
  const type = formData.get('type') as 'indian' | 'overseas'

  const data: Record<string, unknown> = {
    name: formData.get('name') as string,
    type,
    email: (formData.get('email') as string) || null,
    phone: (formData.get('phone') as string) || null,
    address: (formData.get('address') as string) || null,
    website: (formData.get('website') as string) || null,
    industry: (formData.get('industry') as string) || null,
    notes: (formData.get('notes') as string) || null,
    state: type === 'indian' ? (formData.get('state') as string) || null : null,
    gstin: type === 'indian' ? (formData.get('gstin') as string) || null : null,
    pan: type === 'indian' ? (formData.get('pan') as string) || null : null,
    country: type === 'overseas' ? (formData.get('country') as string) || null : null,
    default_currency: type === 'overseas' ? (formData.get('default_currency') as string) || 'USD' : 'INR',
  }

  let error
  if (id) {
    const { error: e } = await supabase.from('customers').update(data).eq('id', id)
    error = e
  } else {
    const { error: e } = await supabase.from('customers').insert([data])
    error = e
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

// ─── CONTACTS ─────────────────────────────────────────────────────────────────

export async function saveContact(formData: FormData) {
  const supabase = createClient()
  const id = formData.get('id') as string

  const data: Record<string, unknown> = {
    company_id: (formData.get('company_id') as string) || null,
    name: formData.get('name') as string,
    email: (formData.get('email') as string) || null,
    phone: (formData.get('phone') as string) || null,
    designation: (formData.get('designation') as string) || null,
    linkedin_url: (formData.get('linkedin_url') as string) || null,
    notes: (formData.get('notes') as string) || null,
    is_primary: formData.get('is_primary') === 'true',
    updated_at: new Date().toISOString(),
  }

  let error
  if (id) {
    const { error: e } = await supabase.from('contacts').update(data).eq('id', id)
    error = e
  } else {
    const { error: e } = await supabase.from('contacts').insert([data])
    error = e
  }

  if (error) return { success: false, error: error.message }
  revalidatePath('/customers')
  revalidatePath('/customers/contacts')
  return { success: true }
}

export async function deleteContact(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('contacts').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/customers')
  revalidatePath('/customers/contacts')
  return { success: true }
}
