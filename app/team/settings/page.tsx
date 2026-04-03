import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TeamSettingsClient } from './settings-client'

export const dynamic = 'force-dynamic'

export default async function TeamSettingsPage() {
  const supabase = createClient()
  const admin = createAdminClient()

  const [
    { data: departments },
    { data: presets },
    { data: notifSettings },
    { data: teamMembers },
  ] = await Promise.all([
    supabase.from('departments').select('*').order('name'),
    admin.from('access_presets').select('*').order('name'),
    admin.from('notification_settings').select('*').limit(1).single(),
    admin.from('team_members').select('id, full_name, email, slack_member_id, slack_email').eq('status', 'active').order('full_name'),
  ])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TeamSettingsClient
        departments={departments || []}
        presets={presets || []}
        notifSettings={notifSettings}
        teamMembers={teamMembers || []}
      />
    </div>
  )
}
