-- ─────────────────────────────────────────────────────────────────────────────
-- Projects module — full migration (v2)
-- Run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Projects table ─────────────────────────────────────────────────────────
create table if not exists projects (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  name              text not null,
  status            text not null default 'not_started'
                      check (status in ('not_started','in_progress','review','on_hold','completed')),
  platform          text,
  sales_channel     text,
  start_date        date,
  complete_date     date,
  designed_by       text,
  developed_by      text,
  customer_id       uuid references customers(id) on delete set null,
  live_link         text,
  staging_link      text,
  readonly_link     text,
  figma_sales_link  text,
  figma_dev_link    text,
  hero_image        text,
  industry          text[] default '{}',
  show_publicly     boolean not null default false,
  design_portfolio  boolean not null default false,
  dev_portfolio     boolean not null default false,
  brief             text
);

-- Auto-update updated_at
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_updated_at on projects;
create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at_column();

alter table projects enable row level security;

drop policy if exists "Authenticated users can do everything on projects" on projects;
create policy "Authenticated users can do everything on projects"
  on projects for all to authenticated
  using (true) with check (true);

create index if not exists projects_status_idx    on projects(status);
create index if not exists projects_customer_idx  on projects(customer_id);


-- ── 2. Project config table (platforms, sales channels, industries, team members) ─
create table if not exists project_config (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type       text not null check (type in ('platform','sales_channel','industry','team_member')),
  name       text not null,
  sort_order int not null default 0,
  unique (type, name)
);

alter table project_config enable row level security;

drop policy if exists "Authenticated users can do everything on project_config" on project_config;
create policy "Authenticated users can do everything on project_config"
  on project_config for all to authenticated
  using (true) with check (true);

-- ── 3. Seed default config values ─────────────────────────────────────────────
insert into project_config (type, name, sort_order) values
  -- Platforms
  ('platform', 'Webflow',     1),
  ('platform', 'Framer',      2),
  ('platform', 'WordPress',   3),
  ('platform', 'Shopify',     4),
  ('platform', 'Wix',         5),
  ('platform', 'Squarespace', 6),
  ('platform', 'Next.js',     7),
  ('platform', 'React',       8),
  ('platform', 'Vue',         9),
  ('platform', 'Other',       10),
  -- Sales Channels
  ('sales_channel', 'Direct',           1),
  ('sales_channel', 'Referral',         2),
  ('sales_channel', 'LinkedIn',         3),
  ('sales_channel', 'Instagram',        4),
  ('sales_channel', 'Cold Outreach',    5),
  ('sales_channel', 'Agency Partner',   6),
  ('sales_channel', 'Marketplace',      7),
  ('sales_channel', 'Other',            8),
  -- Industries
  ('industry', 'E-commerce',   1),
  ('industry', 'SaaS',         2),
  ('industry', 'Healthcare',   3),
  ('industry', 'Finance',      4),
  ('industry', 'Real Estate',  5),
  ('industry', 'Education',    6),
  ('industry', 'Food & Beverage', 7),
  ('industry', 'Fashion',      8),
  ('industry', 'Tech',         9),
  ('industry', 'Media',        10),
  ('industry', 'Travel',       11),
  ('industry', 'Legal',        12),
  ('industry', 'Other',        13)
on conflict (type, name) do nothing;


-- ── 4. Supabase Storage bucket for project assets ─────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-assets',
  'project-assets',
  true,
  5242880,  -- 5 MB limit
  array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']
)
on conflict (id) do nothing;

-- Storage RLS policies
drop policy if exists "Public can read project-assets" on storage.objects;
create policy "Public can read project-assets"
  on storage.objects for select
  using (bucket_id = 'project-assets');

drop policy if exists "Authenticated can upload project-assets" on storage.objects;
create policy "Authenticated can upload project-assets"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'project-assets');

drop policy if exists "Authenticated can update project-assets" on storage.objects;
create policy "Authenticated can update project-assets"
  on storage.objects for update to authenticated
  using (bucket_id = 'project-assets');

drop policy if exists "Authenticated can delete project-assets" on storage.objects;
create policy "Authenticated can delete project-assets"
  on storage.objects for delete to authenticated
  using (bucket_id = 'project-assets');
