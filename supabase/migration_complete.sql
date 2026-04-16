-- Fast Estimator: Complete Database Migration
-- Run this in your Supabase SQL Editor

-- User Profiles table
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_name text,
  company_address text,
  company_email text,
  default_markup numeric default 15,
  logo_url text,
  vat_pct numeric default 20,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Projects table (keep for backward compatibility)
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  address text,
  client_name text,
  client_email text,
  created_at timestamptz default now()
);

-- Clients table (new - proper client management)
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  company_name text,
  email text,
  phone text,
  address text,
  vat_number text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Estimates table
create table if not exists estimates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  estimate_number text not null,
  title text,
  scope text,
  line_items jsonb default '[]'::jsonb,
  subtotal numeric default 0,
  markup_pct numeric default 15,
  vat_pct numeric default 20,
  total_inc_vat numeric default 0,
  time_estimate integer default 0,
  validity_days integer default 30,
  notes text,
  status text default 'draft',
  review_token uuid,
  accepted_at timestamptz,
  decline_reason text,
  ai_draft jsonb,
  pdf_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Estimate photos table
create table if not exists estimate_photos (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid references estimates(id) on delete cascade,
  url text not null,
  caption text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table user_profiles enable row level security;
alter table projects enable row level security;
alter table clients enable row level security;
alter table estimates enable row level security;
alter table estimate_photos enable row level security;

-- RLS policies for user_profiles
create policy "Users can view own profile"
  on user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on user_profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on user_profiles for insert
  with check (auth.uid() = id);

-- RLS policies for projects
create policy "Users can view own projects"
  on projects for select
  using (auth.uid() = user_id);

create policy "Users can insert own projects"
  on projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on projects for delete
  using (auth.uid() = user_id);

-- RLS policies for clients
create policy "Users can view own clients"
  on clients for select
  using (auth.uid() = user_id);

create policy "Users can insert own clients"
  on clients for insert
  with check (auth.uid() = user_id);

create policy "Users can update own clients"
  on clients for update
  using (auth.uid() = user_id);

create policy "Users can delete own clients"
  on clients for delete
  using (auth.uid() = user_id);

-- RLS policies for estimates
create policy "Users can view own estimates"
  on estimates for select
  using (auth.uid() = user_id);

create policy "Users can insert own estimates"
  on estimates for insert
  with check (auth.uid() = user_id);

create policy "Users can update own estimates"
  on estimates for update
  using (auth.uid() = user_id);

create policy "Users can delete own estimates"
  on estimates for delete
  using (auth.uid() = user_id);

create policy "Anyone can view estimates by review token"
  on estimates for select
  using (review_token is not null);

create policy "Anyone can update estimates by review token"
  on estimates for update
  using (review_token is not null);

-- RLS policies for estimate photos
create policy "Users can manage estimate photos"
  on estimate_photos for all
  using (
    exists (
      select 1 from estimates
      where estimates.id = estimate_photos.estimate_id
      and estimates.user_id = auth.uid()
    )
  );

-- Storage bucket for photos
insert into storage.buckets (id, name, public)
values ('estimate-photos', 'estimate-photos', true)
on conflict (id) do nothing;

-- Storage bucket for PDFs
insert into storage.buckets (id, name, public)
values ('estimate-pdfs', 'estimate-pdfs', true)
on conflict (id) do nothing;

-- Create indexes for better performance
create index if not exists estimates_user_id_idx on estimates(user_id);
create index if not exists estimates_project_id_idx on estimates(project_id);
create index if not exists estimates_client_id_idx on estimates(client_id);
create index if not exists projects_user_id_idx on projects(user_id);
create index if not exists clients_user_id_idx on clients(user_id);
