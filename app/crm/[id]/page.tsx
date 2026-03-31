import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { LeadDetailClient } from './lead-detail-client'

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [
    { data: lead },
    { data: notes },
    { data: stages },
    { data: sources },
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('*, stage:lead_stages(id, name, color, stage_order), source:lead_sources(id, name)')
      .eq('id', params.id)
      .single(),
    supabase
      .from('lead_notes')
      .select('*')
      .eq('lead_id', params.id)
      .order('created_at', { ascending: false }),
    supabase.from('lead_stages').select('*').order('stage_order'),
    supabase.from('lead_sources').select('*').order('name'),
  ])

  if (!lead) notFound()

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <LeadDetailClient
        lead={lead}
        notes={notes || []}
        stages={stages || []}
        sources={sources || []}
      />
    </div>
  )
}
