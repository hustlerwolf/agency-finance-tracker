import { createClient } from '@/lib/supabase/server'
import { CrmClient } from './crm-client'

export default async function CrmPage() {
  const supabase = createClient()

  const [
    { data: leads },
    { data: stages },
    { data: sources },
    { data: companies },
    { data: contacts },
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('*, stage:lead_stages(id, name, color, stage_order), source:lead_sources(id, name), company:customers(id, name), contact:contacts(id, name, designation)')
      .order('created_at', { ascending: false }),
    supabase.from('lead_stages').select('*').order('stage_order'),
    supabase.from('lead_sources').select('*').order('name'),
    supabase.from('customers').select('id, name').order('name'),
    supabase.from('contacts').select('id, company_id, name, designation').order('name'),
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <CrmClient
        leads={leads || []}
        stages={stages || []}
        sources={sources || []}
        companies={companies || []}
        contacts={contacts || []}
      />
    </div>
  )
}
