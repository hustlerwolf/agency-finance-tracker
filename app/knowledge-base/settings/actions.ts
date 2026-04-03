'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addKbConfigItem(type: string, name: string) {
  const supabase = createClient()
  const { error } = await supabase.from('kb_config').insert([{ type, name }])
  if (error) return { success: false, error: error.message }
  revalidatePath('/knowledge-base/settings')
  return { success: true }
}

export async function deleteKbConfigItem(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('kb_config').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/knowledge-base/settings')
  return { success: true }
}

export async function renameKbConfigItem(id: string, name: string) {
  const supabase = createClient()
  const { error } = await supabase.from('kb_config').update({ name }).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/knowledge-base/settings')
  return { success: true }
}
