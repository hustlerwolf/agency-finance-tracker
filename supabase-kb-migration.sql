-- Knowledge Base table
create table if not exists public.knowledge_base (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text,
  tags text[] default '{}',
  url text,
  description text,
  created_by text,
  thumbnail_url text,
  attachments jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- KB Config table for categories and tags
create table if not exists public.kb_config (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('category', 'tag')),
  name text not null,
  created_at timestamptz default now()
);

-- Seed some default categories
insert into public.kb_config (type, name) values
  ('category', 'Design Resources'),
  ('category', 'Development'),
  ('category', 'Brand Guidelines'),
  ('category', 'Client References'),
  ('category', 'Tools & Software'),
  ('tag', 'UI/UX'),
  ('tag', 'Frontend'),
  ('tag', 'Backend'),
  ('tag', 'Typography'),
  ('tag', 'Colors'),
  ('tag', 'Templates');

-- Storage bucket for KB assets
insert into storage.buckets (id, name, public)
values ('kb-assets', 'kb-assets', true)
on conflict (id) do nothing;

-- RLS policies for knowledge_base
alter table public.knowledge_base enable row level security;
create policy "Allow all for authenticated" on public.knowledge_base for all using (auth.role() = 'authenticated');

-- RLS policies for kb_config
alter table public.kb_config enable row level security;
create policy "Allow all for authenticated" on public.kb_config for all using (auth.role() = 'authenticated');

-- Storage policies for kb-assets
create policy "Allow authenticated uploads to kb-assets"
on storage.objects for insert
to authenticated
with check (bucket_id = 'kb-assets');

create policy "Allow public read of kb-assets"
on storage.objects for select
using (bucket_id = 'kb-assets');

create policy "Allow authenticated delete of kb-assets"
on storage.objects for delete
to authenticated
using (bucket_id = 'kb-assets');
