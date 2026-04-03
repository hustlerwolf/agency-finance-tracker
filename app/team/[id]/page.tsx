import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUserAccess } from '@/lib/auth-utils'
import { notFound } from 'next/navigation'
import { MemberDetailClient } from './member-detail-client'

export const dynamic = 'force-dynamic'

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()
  const admin = createAdminClient()
  const { isAdmin } = await getCurrentUserAccess()

  const [
    { data: member },
    { data: departments },
    { data: allMembers },
    { data: leaves },
    { data: attendance },
    { data: presets },
  ] = await Promise.all([
    supabase.from('team_members').select('*, departments(name)').eq('id', id).single(),
    supabase.from('departments').select('*').order('name'),
    supabase.from('team_members').select('id, full_name').order('full_name'),
    supabase.from('leave_requests').select('*').eq('team_member_id', id).order('created_at', { ascending: false }).limit(20),
    supabase.from('attendance').select('*').eq('team_member_id', id).order('date', { ascending: false }).limit(30),
    isAdmin ? admin.from('access_presets').select('*').order('name') : Promise.resolve({ data: [] }),
  ])

  if (!member) notFound()

  let memberProfile: { role: string; allowed_modules: string[]; hidden_fields: Record<string, string[]>; module_permissions: Record<string, Record<string, boolean>> } | null = null
  if (member.auth_user_id && isAdmin) {
    const { data } = await admin
      .from('user_profiles')
      .select('role, allowed_modules, hidden_fields, module_permissions')
      .eq('id', member.auth_user_id)
      .single()
    memberProfile = data
  }

  const reportingTo = allMembers?.find(m => m.id === member.reporting_to)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <MemberDetailClient
        member={member}
        departments={departments || []}
        allMembers={allMembers || []}
        reportingToName={reportingTo?.full_name || null}
        leaves={leaves || []}
        attendance={attendance || []}
        isAdmin={isAdmin}
        memberProfile={memberProfile}
        presets={presets || []}
      />
    </div>
  )
}
