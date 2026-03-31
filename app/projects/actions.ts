'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveProject(formData: FormData) {
  const supabase = createClient()

  const id = formData.get('id') as string | null

  const industry = formData.getAll('industry') as string[]

  const projectData = {
    name: formData.get('name') as string,
    live_link: formData.get('live_link') as string || null,
    staging_link: formData.get('staging_link') as string || null,
    readonly_link: formData.get('readonly_link') as string || null,
    figma_sales_link: formData.get('figma_sales_link') as string || null,
    figma_dev_link: formData.get('figma_dev_link') as string || null,
    hero_image: formData.get('hero_image') as string || null,
    designed_by: formData.get('designed_by') as string || null,
    developed_by: formData.get('developed_by') as string || null,
    sales_channel: formData.get('sales_channel') as string || null,
    industry: industry,
    show_publicly: formData.get('show_publicly') === 'true',
    design_portfolio: formData.get('design_portfolio') === 'true',
    dev_portfolio: formData.get('dev_portfolio') === 'true',
    customer_id: formData.get('customer_id') as string || null,
    status: formData.get('status') as string || 'not_started',
    start_date: formData.get('start_date') as string || null,
    complete_date: formData.get('complete_date') as string || null,
    platform: formData.get('platform') as string || null,
    brief: formData.get('brief') as string || null,
  }

  let error

  if (id) {
    const { error: updateError } = await supabase
      .from('projects')
      .update(projectData)
      .eq('id', id)
    error = updateError
  } else {
    const { error: insertError } = await supabase
      .from('projects')
      .insert([projectData])
    error = insertError
  }

  if (error) return { success: false, error: error.message }

  revalidatePath('/projects')
  return { success: true }
}

export async function deleteProject(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/projects')
  return { success: true }
}

export async function updateProjectBrief(id: string, brief: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('projects')
    .update({ brief })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/projects/${id}`)
  return { success: true }
}
