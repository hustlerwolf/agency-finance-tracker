import { createClient } from '@/lib/supabase/server'
import { CompaniesClient } from './customer-client'

export default async function CustomersPage() {
  const supabase = createClient()

  const { data: companies } = await supabase
    .from('customers')
    .select('*, contacts(id)')
    .order('name')

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <CompaniesClient companies={companies || []} />
    </div>
  )
}