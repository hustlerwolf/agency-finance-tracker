'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveCategory(formData: FormData) {
  const supabase = createClient()
  const id = formData.get('id') as string

  const categoryData = {
    name: formData.get('name') as string,
    description: formData.get('description') as string || null,
  }

  let error;

  if (id) {
    const { error: updateError } = await supabase.from('expense_categories').update(categoryData).eq('id', id)
    error = updateError
  } else {
    const { error: insertError } = await supabase.from('expense_categories').insert([categoryData])
    error = insertError
  }

  // If the name is already taken, Supabase will throw a unique constraint error
  if (error) return { success: false, error: error.message }

  revalidatePath('/categories')
  return { success: true }
}

export async function deleteCategory(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('expense_categories').delete().eq('id', id)
  
  if (error) return { success: false, error: "Cannot delete this category. It might be in use by an existing expense." }
  
  revalidatePath('/categories')
  return { success: true }
}