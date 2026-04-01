'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── LEADS ───────────────────────────────────────────────────────────────────

export async function saveLead(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const id = formData.get('id') as string

  const leadData: Record<string, unknown> = {
    contact_person: formData.get('contact_person') as string,
    company_name: (formData.get('company_name') as string) || null,
    email: (formData.get('email') as string) || null,
    phone: (formData.get('phone') as string) || null,
    website: (formData.get('website') as string) || null,
    linkedin_url: (formData.get('linkedin_url') as string) || null,
    stage_id: (formData.get('stage_id') as string) || null,
    source_id: (formData.get('source_id') as string) || null,
    priority: (formData.get('priority') as string) || 'Medium',
    requirements: (formData.get('requirements') as string) || null,
    next_action_date: (formData.get('next_action_date') as string) || null,
    status: (formData.get('status') as string) || 'open',
    lost_reason: (formData.get('lost_reason') as string) || null,
    updated_at: new Date().toISOString(),
  }

  let error
  if (id) {
    const { error: e } = await supabase.from('leads').update(leadData).eq('id', id)
    error = e
  } else {
    const { error: e } = await supabase.from('leads').insert([{ ...leadData, created_by: user?.id }])
    error = e
  }

  if (error) return { success: false, error: error.message }
  revalidatePath('/crm')
  return { success: true }
}

export async function updateLeadBrief(id: string, brief: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('leads')
    .update({ requirements: brief, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/crm/${id}`)
  return { success: true }
}

export async function deleteLead(id: string) {
  const supabase = createClient()
  await supabase.from('lead_notes').delete().eq('lead_id', id)
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/crm')
  return { success: true }
}

export async function updateLeadStage(leadId: string, stageId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('leads')
    .update({ stage_id: stageId || null, updated_at: new Date().toISOString() })
    .eq('id', leadId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/crm')
  return { success: true }
}

export async function convertLeadToCustomer(leadId: string) {
  const supabase = createClient()

  const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single()
  if (!lead) return { success: false, error: 'Lead not found' }

  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .insert([{
      name: lead.company_name || lead.contact_person,
      type: 'overseas',
      email: lead.email || null,
      phone: lead.phone || null,
      website: lead.website || null,
    }])
    .select()
    .single()

  if (custErr) return { success: false, error: custErr.message }

  await supabase
    .from('leads')
    .update({ status: 'won', converted_customer_id: customer.id, updated_at: new Date().toISOString() })
    .eq('id', leadId)

  revalidatePath('/crm')
  revalidatePath('/customers')
  return { success: true, customerId: customer.id }
}

// ─── NOTES ───────────────────────────────────────────────────────────────────

export async function addLeadNote(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const leadId = formData.get('lead_id') as string

  const { error } = await supabase.from('lead_notes').insert([{
    lead_id: leadId,
    note_content: formData.get('note_content') as string,
    note_type: (formData.get('note_type') as string) || 'general',
    created_by: user?.id,
  }])

  await supabase.from('leads').update({ updated_at: new Date().toISOString() }).eq('id', leadId)

  if (error) return { success: false, error: error.message }
  revalidatePath(`/crm/${leadId}`)
  return { success: true }
}

export async function deleteLeadNote(noteId: string, leadId: string) {
  const supabase = createClient()
  const { error } = await supabase.from('lead_notes').delete().eq('id', noteId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/crm/${leadId}`)
  return { success: true }
}

// ─── ADMIN: STAGES ───────────────────────────────────────────────────────────

export async function saveLeadStage(formData: FormData) {
  const supabase = createClient()
  const id = formData.get('id') as string
  const stageData = {
    name: formData.get('name') as string,
    color: (formData.get('color') as string) || '#cbd5e1',
    stage_order: parseInt(formData.get('stage_order') as string) || 0,
  }

  let error
  if (id) {
    const { error: e } = await supabase.from('lead_stages').update(stageData).eq('id', id)
    error = e
  } else {
    const { error: e } = await supabase.from('lead_stages').insert([stageData])
    error = e
  }

  if (error) return { success: false, error: error.message }
  revalidatePath('/crm')
  return { success: true }
}

export async function deleteLeadStage(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('lead_stages').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/crm')
  return { success: true }
}

// ─── ADMIN: SOURCES ──────────────────────────────────────────────────────────

export async function saveLeadSource(name: string, id?: string) {
  const supabase = createClient()
  let error
  if (id) {
    const { error: e } = await supabase.from('lead_sources').update({ name }).eq('id', id)
    error = e
  } else {
    const { error: e } = await supabase.from('lead_sources').insert([{ name }])
    error = e
  }
  if (error) return { success: false, error: error.message }
  revalidatePath('/crm')
  return { success: true }
}

export async function deleteLeadSource(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('lead_sources').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/crm')
  return { success: true }
}
