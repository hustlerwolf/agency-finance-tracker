import { createClient } from '@/lib/supabase/server'
import { ProjectsClient } from './projects-client'

export default async function ProjectsPage() {
  const supabase = createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select('*, customers(name)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <ProjectsClient projects={projects || []} />
    </div>
  )
}
