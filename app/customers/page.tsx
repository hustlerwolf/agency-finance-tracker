import { createClient } from '@/lib/supabase/server'
import { CustomerClient } from './customer-client'

export default async function CustomersPage() {
  const supabase = createClient()
  
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <CustomerClient customers={customers || []} />
    </div>
  )
}