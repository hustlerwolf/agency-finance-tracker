import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { HiddenFieldsMap } from '@/lib/field-access'

// Get current user's role, team_member_id, and hidden_fields (for use in server components/actions)
export async function getCurrentUserAccess() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { user: null, isAdmin: false, teamMemberId: null, hiddenFields: {} as HiddenFieldsMap }

  // Use admin client to bypass RLS for role check
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role, allowed_modules, hidden_fields')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const hiddenFields: HiddenFieldsMap = (isAdmin ? {} : profile?.hidden_fields) || {}

  // Always try to find linked team_member (needed for comments/timer even for admins)
  const { data: tm } = await admin
    .from('team_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  const teamMemberId = tm?.id || null

  return { user, isAdmin, teamMemberId, hiddenFields }
}
