import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from './settings-form'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: settings } = await supabase.from('agency_settings').select('*').maybeSingle()

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 font-sans">
        <h1 className="text-3xl font-bold tracking-tight">Agency Settings</h1>
        <p className="text-muted-foreground">Manage your business profile and invoicing defaults.</p>
      </div>
      <SettingsForm initialData={settings} />
    </div>
  )
}