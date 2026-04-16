-- Fast Estimator: Database Migration
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- Estimates table
create table if not exists estimates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
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
  caption text
);

-- Enable RLS
alter table estimates enable row level security;
alter table estimate_photos enable row level security;

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

-- Storage bucket for estimate PDFs (photos use existing vo-photos bucket)
insert into storage.buckets (id, name, public)
values ('estimate-pdfs', 'estimate-pdfs', true)
on conflict (id) do nothing;
