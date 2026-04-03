import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CompanyDetailClient } from './company-detail-client'

export default async function CompanyDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: company }, { data: contacts }, { data: allCompanies }] = await Promise.all([
    supabase.from('customers').select('*').eq('id', params.id).single(),
    supabase.from('contacts').select('*').eq('company_id', params.id).order('is_primary', { ascending: false }),
    supabase.from('customers').select('id, name').order('name'),
  ])

  if (!company) notFound()

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <CompanyDetailClient
        company={company}
        contacts={contacts || []}
        allCompanies={allCompanies || []}
      />
    </div>
  )
}
