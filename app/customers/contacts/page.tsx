import { createClient } from '@/lib/supabase/server'
import { ContactsClient } from './contacts-client'

export default async function ContactsPage() {
  const supabase = createClient()

  const [{ data: contacts }, { data: companies }] = await Promise.all([
    supabase.from('contacts').select('*, customers(id, name)').order('name'),
    supabase.from('customers').select('id, name').order('name'),
  ])

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <ContactsClient contacts={contacts || []} companies={companies || []} />
    </div>
  )
}
