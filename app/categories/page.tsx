import { createClient } from '@/lib/supabase/server'
import { CategoryClient } from './category-client'

export default async function CategoriesPage() {
  const supabase = createClient()
  
  const { data: categories } = await supabase
    .from('expense_categories')
    .select('*')
    .order('name', { ascending: true })

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <CategoryClient categories={categories || []} />
    </div>
  )
}