'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Task Statuses ────────────────────────────────────────────────────────────

export async function saveTaskStatus(formData: FormData) {
  const supabase = createClient()
  const id = formData.get('id') as string
  const data = {
    name: formData.get('name') as string,
    color: (formData.get('color') as string) || '#6b7280',
    status_order: parseInt(formData.get('status_order') as string) || 0,
  }

  let error
  if (id) {
    const { error: e } = await supabase.from('task_statuses').update(data).eq('id', id)
    error = e
  } else {
    const { error: e } = await supabase.from('task_statuses').insert([data])
    error = e
  }

  if (error) return { success: false, error: error.message }
  revalidatePath('/tasks')
  revalidatePath('/tasks/settings')
  return { success: true }
}

export async function deleteTaskStatus(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('task_statuses').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/tasks')
  revalidatePath('/tasks/settings')
  return { success: true }
}

// ─── Task Labels ──────────────────────────────────────────────────────────────

export async function saveTaskLabel(formData: FormData) {
  const supabase = createClient()
  const id = formData.get('id') as string
  const data = {
    name: formData.get('name') as string,
    color: (formData.get('color') as string) || '#6b7280',
  }

  let error
  if (id) {
    const { error: e } = await supabase.from('task_labels').update(data).eq('id', id)
    error = e
  } else {
    const { error: e } = await supabase.from('task_labels').insert([data])
    error = e
  }

  if (error) return { success: false, error: error.message }
  revalidatePath('/tasks')
  revalidatePath('/tasks/settings')
  return { success: true }
}

export async function deleteTaskLabel(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('task_labels').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/tasks')
  revalidatePath('/tasks/settings')
  return { success: true }
}
