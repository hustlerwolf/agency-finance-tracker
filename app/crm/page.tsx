import { createClient } from '@/lib/supabase/server'
import { CrmClient } from './crm-client'

export default async function CrmPage() {
  const supabase = createClient()

  const [
    { data: leads },
    { data: stages },
    { data: sources },
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('*, stage:lead_stages(id, name, color, stage_order), source:lead_sources(id, name)')
      .order('created_at', { ascending: false }),
    supabase.from('lead_stages').select('*').order('stage_order'),
    supabase.from('lead_sources').select('*').order('name'),
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <CrmClient
        leads={leads || []}
        stages={stages || []}
        sources={sources || []}
      />
    </div>
  )
}
