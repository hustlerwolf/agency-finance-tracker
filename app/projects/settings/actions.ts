'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ConfigType = 'platform' | 'sales_channel' | 'industry' | 'team_member'

export async function addConfigItem(type: ConfigType, name: string) {
  if (!name.trim()) return { success: false, error: 'Name is required' }

  const supabase = createClient()

  // Get max sort_order for this type
  const { data: existing } = await supabase
    .from('project_config')
    .select('sort_order')
    .eq('type', type)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1

  const { error } = await supabase
    .from('project_config')
    .insert({ type, name: name.trim(), sort_order: nextOrder })

  if (error) {
    if (error.code === '23505') return { success: false, error: 'Already exists' }
    return { success: false, error: error.message }
  }

  revalidatePath('/projects/settings')
  revalidatePath('/projects')
  return { success: true }
}

export async function deleteConfigItem(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('project_config').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/projects/settings')
  revalidatePath('/projects')
  return { success: true }
}

export async function renameConfigItem(id: string, name: string) {
  if (!name.trim()) return { success: false, error: 'Name is required' }
  const supabase = createClient()
  const { error } = await supabase
    .from('project_config')
    .update({ name: name.trim() })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/projects/settings')
  revalidatePath('/projects')
  return { success: true }
}
