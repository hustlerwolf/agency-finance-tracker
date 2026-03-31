import { createClient } from '@/lib/supabase/server'
import { ProjectForm } from '../project-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function NewProjectPage() {
  const supabase = createClient()
  const { data: customers } = await supabase
    .from('customers')
    .select('id, name')
    .order('name')

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">New Project</h1>
        <p className="text-gray-400 text-sm mt-1">Fill in the details below. You can add the project brief after creating.</p>
      </div>

      <div className="bg-gray-900/50 border border-white/10 rounded-xl p-6">
        <ProjectForm customers={customers || []} />
      </div>
    </div>
  )
}
