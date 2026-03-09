-- ============================================
-- HASSHALT — Phase 2 Tables
-- Run this in the Supabase SQL Editor
-- ============================================

-- Monthly budgets per category
create table if not exists hh_budgets (
  id          uuid default gen_random_uuid() primary key,
  family_id   uuid references hh_families(id) on delete cascade,
  category_id uuid references hh_categories(id) on delete cascade,
  month       int not null check (month between 1 and 12),
  year        int not null,
  amount      numeric(12,2) not null check (amount > 0),
  created_at  timestamp with time zone default now(),
  unique(family_id, category_id, month, year)
);

alter table hh_budgets enable row level security;

create policy "hh_budgets_all" on hh_budgets
  for all using (
    family_id in (select family_id from hh_family_members where user_id = auth.uid())
  );

-- Recurring expense templates
create table if not exists hh_recurring (
  id           uuid default gen_random_uuid() primary key,
  family_id    uuid references hh_families(id) on delete cascade,
  category_id  uuid references hh_categories(id) on delete set null,
  description  text not null,
  amount       numeric(12,2) not null check (amount > 0),
  day_of_month int not null check (day_of_month between 1 and 31),
  payment_type text default 'debit' check (payment_type in ('pix','debit','credit','cash')),
  shared       boolean default true,
  active       boolean default true,
  created_at   timestamp with time zone default now()
);

alter table hh_recurring enable row level security;

create policy "hh_recurring_all" on hh_recurring
  for all using (
    family_id in (select family_id from hh_family_members where user_id = auth.uid())
  );

-- Update hh_family_members RLS to allow viewing all members of own family
drop policy if exists "hh_family_members_select" on hh_family_members;

create policy "hh_family_members_select" on hh_family_members
  for select using (auth.uid() = user_id);

-- Indexes
create index if not exists idx_hh_budgets_family_month
  on hh_budgets(family_id, month, year);

create index if not exists idx_hh_recurring_family
  on hh_recurring(family_id);
