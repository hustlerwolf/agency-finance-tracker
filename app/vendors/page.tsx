import { createClient } from '@/lib/supabase/server'
import { VendorClient } from './vendor-client'

export default async function VendorsPage() {
  const supabase = createClient()
  
  const { data: vendors } = await supabase
    .from('vendors')
    .select('*')
    .order('name', { ascending: true })

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <VendorClient vendors={vendors || []} />
    </div>
  )
}