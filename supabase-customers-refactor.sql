-- Add new fields to customers table (Companies)
alter table public.customers
  add column if not exists website text,
  add column if not exists industry text,
  add column if not exists notes text;

-- Create contacts table
create table if not exists public.contacts (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.customers(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  designation text,
  linkedin_url text,
  notes text,
  is_primary boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add company/contact linking to leads
alter table public.leads
  add column if not exists company_id uuid references public.customers(id) on delete set null,
  add column if not exists contact_id uuid references public.contacts(id) on delete set null;

-- RLS for contacts
alter table public.contacts enable row level security;
create policy "Allow all for authenticated" on public.contacts
  for all using (auth.role() = 'authenticated');
