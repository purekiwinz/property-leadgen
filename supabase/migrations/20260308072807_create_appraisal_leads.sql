-- Create the appraisal_leads table
create table if not exists public.appraisal_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  address text,
  timeline text,
  buying_next text,
  first_name text,
  last_name text,
  email text,
  phone text
);

-- Enable Row Level Security
alter table public.appraisal_leads enable row level security;

-- Create policy to allow anonymous inserts from the lead gen form
create policy "Allow anonymous inserts" on public.appraisal_leads
  for insert with check (true);

-- Create policy to allow the authenticated users (Ed) to view the leads
create policy "Allow authenticated users to view leads" on public.appraisal_leads
  for select using (auth.role() = 'authenticated');
