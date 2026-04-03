'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// Verify caller is admin
async function assertAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') throw new Error('Admin access required')
  return user
}

// ─── Team Member Account Management ──────────────────────────────────────────

export async function createTeamMemberAccount(
  teamMemberId: string,
  email: string,
  password: string,
  allowedModules: string[],
  hiddenFields: Record<string, string[]> = {},
  role: string = 'member'
) {
  try {
    await assertAdmin()
    const admin = createAdminClient()

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
    })
    if (authError) return { success: false, error: authError.message }

    const authUserId = authData.user.id

    const { error: linkError } = await admin
      .from('team_members')
      .update({ auth_user_id: authUserId, email })
      .eq('id', teamMemberId)
    if (linkError) return { success: false, error: linkError.message }

    const { error: profileError } = await admin
      .from('user_profiles')
      .insert({
        id: authUserId,
        full_name: email,
        role: role === 'admin' ? 'admin' : 'member',
        allowed_modules: allowedModules,
        hidden_fields: hiddenFields,
      })
    if (profileError) return { success: false, error: profileError.message }

    revalidatePath('/team')
    revalidatePath(`/team/${teamMemberId}`)
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function updateTeamMemberAccess(
  authUserId: string,
  allowedModules: string[],
  hiddenFields: Record<string, string[]> = {},
  role: string = 'member'
) {
  try {
    await assertAdmin()
    const admin = createAdminClient()

    const { error } = await admin
      .from('user_profiles')
      .update({ allowed_modules: allowedModules, hidden_fields: hiddenFields, role: role === 'admin' ? 'admin' : 'member' })
      .eq('id', authUserId)

    if (error) return { success: false, error: error.message }
    revalidatePath('/team')
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function applyPresetToMember(
  authUserId: string,
  presetId: string
) {
  try {
    await assertAdmin()
    const admin = createAdminClient()

    const { data: preset, error: presetError } = await admin
      .from('access_presets')
      .select('allowed_modules, hidden_fields')
      .eq('id', presetId)
      .single()
    if (presetError || !preset) return { success: false, error: 'Preset not found' }

    const { error } = await admin
      .from('user_profiles')
      .update({
        allowed_modules: preset.allowed_modules,
        hidden_fields: preset.hidden_fields,
      })
      .eq('id', authUserId)

    if (error) return { success: false, error: error.message }
    revalidatePath('/team')
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function resetTeamMemberPassword(
  authUserId: string,
  newPassword: string
) {
  try {
    await assertAdmin()
    const admin = createAdminClient()
    const { error } = await admin.auth.admin.updateUserById(authUserId, { password: newPassword })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

// ─── Access Presets ───────────────────────────────────────────────────────────

export async function savePreset(formData: FormData) {
  try {
    await assertAdmin()
    const admin = createAdminClient()
    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const allowedModules = JSON.parse(formData.get('allowed_modules') as string || '[]')
    const hiddenFields = JSON.parse(formData.get('hidden_fields') as string || '{}')

    const data = {
      name,
      allowed_modules: allowedModules,
      hidden_fields: hiddenFields,
      updated_at: new Date().toISOString(),
    }

    let error
    if (id) {
      const { error: e } = await admin.from('access_presets').update(data).eq('id', id)
      error = e
    } else {
      const { error: e } = await admin.from('access_presets').insert([data])
      error = e
    }

    if (error) return { success: false, error: error.message }
    revalidatePath('/team/settings')
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function deletePreset(id: string) {
  try {
    await assertAdmin()
    const admin = createAdminClient()
    const { error } = await admin.from('access_presets').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    revalidatePath('/team/settings')
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

// ─── Slack / Notification Settings ────────────────────────────────────────────

export async function saveNotificationSettings(formData: FormData) {
  try {
    await assertAdmin()
    const admin = createAdminClient()
    const id = formData.get('id') as string

    const data = {
      slack_bot_token: (formData.get('slack_bot_token') as string) || null,
      slack_webhook_url: (formData.get('slack_webhook_url') as string) || null,
      slack_enabled: formData.get('slack_enabled') === 'true',
      updated_at: new Date().toISOString(),
    }

    if (id) {
      const { error } = await admin.from('notification_settings').update(data).eq('id', id)
      if (error) return { success: false, error: error.message }
    } else {
      const { error } = await admin.from('notification_settings').insert([data])
      if (error) return { success: false, error: error.message }
    }

    revalidatePath('/team/settings')
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function updateTeamMemberSlackId(memberId: string, slackEmail: string) {
  try {
    await assertAdmin()
    const admin = createAdminClient()
    // Save slack_email and clear cached slack_member_id so it re-lookups
    const { error } = await admin.from('team_members').update({
      slack_email: slackEmail || null,
      slack_member_id: null,
    }).eq('id', memberId)
    if (error) return { success: false, error: error.message }
    revalidatePath('/team/settings')
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}
