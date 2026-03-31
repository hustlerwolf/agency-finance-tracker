import { createClient } from '@/lib/supabase/server'
import { ProjectForm } from '../project-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewProjectPage() {
  const supabase = createClient()

  const [{ data: customers }, { data: config }] = await Promise.all([
    supabase.from('customers').select('id, name').order('name'),
    supabase.from('project_config').select('*').order('sort_order', { ascending: true }),
  ])

  const all = config || []
  const options = {
    platforms:     all.filter(c => c.type === 'platform'),
    salesChannels: all.filter(c => c.type === 'sales_channel'),
    industries:    all.filter(c => c.type === 'industry'),
    teamMembers:   all.filter(c => c.type === 'team_member'),
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">New Project</h1>
        <p className="text-gray-400 text-sm mt-1">
          Fill in the details below — you can add the rich-text brief after creating.
        </p>
      </div>

      <div className="bg-gray-900/50 border border-white/10 rounded-xl p-6">
        <ProjectForm customers={customers || []} options={options} />
      </div>
    </div>
  )
}
