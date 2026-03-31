import { createClient } from '@/lib/supabase/server'
import { ProjectSettingsClient } from './settings-client'
import Link from 'next/link'
import { ArrowLeft, Settings } from 'lucide-react'

export default async function ProjectSettingsPage() {
  const supabase = createClient()

  const { data: config } = await supabase
    .from('project_config')
    .select('*')
    .order('sort_order', { ascending: true })

  const all = config || []
  const platforms    = all.filter(c => c.type === 'platform')
  const salesChannels = all.filter(c => c.type === 'sales_channel')
  const industries   = all.filter(c => c.type === 'industry')
  const teamMembers  = all.filter(c => c.type === 'team_member')

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-800 border border-white/10 flex items-center justify-center">
            <Settings className="w-4.5 h-4.5 text-gray-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Project Settings</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Manage dropdown options used across all project forms
            </p>
          </div>
        </div>
      </div>

      <ProjectSettingsClient
        platforms={platforms}
        salesChannels={salesChannels}
        industries={industries}
        teamMembers={teamMembers}
      />
    </div>
  )
}
