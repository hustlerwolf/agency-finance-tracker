'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveKbEntry(formData: FormData) {
  const supabase = createClient()
  const id = formData.get('id') as string

  const tags = formData.getAll('tags') as string[]

  const entryData: Record<string, unknown> = {
    name: formData.get('name') as string,
    category: (formData.get('category') as string) || null,
    tags: tags.filter(Boolean),
    url: (formData.get('url') as string) || null,
    description: (formData.get('description') as string) || null,
    created_by: (formData.get('created_by') as string) || null,
    thumbnail_url: (formData.get('thumbnail_url') as string) || null,
    updated_at: new Date().toISOString(),
  }

  let error
  if (id) {
    const { error: e } = await supabase.from('knowledge_base').update(entryData).eq('id', id)
    error = e
  } else {
    const { error: e } = await supabase.from('knowledge_base').insert([entryData])
    error = e
  }

  if (error) return { success: false, error: error.message }
  revalidatePath('/knowledge-base')
  return { success: true }
}

export async function deleteKbEntry(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('knowledge_base').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/knowledge-base')
  return { success: true }
}

export async function updateKbDescription(id: string, description: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('knowledge_base')
    .update({ description, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/knowledge-base')
  revalidatePath(`/knowledge-base/${id}`)
  return { success: true }
}

export async function updateKbAttachments(id: string, attachments: unknown[]) {
  const supabase = createClient()
  const { error } = await supabase
    .from('knowledge_base')
    .update({ attachments, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/knowledge-base/${id}`)
  return { success: true }
}
