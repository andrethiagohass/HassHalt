-- ============================================
-- HASSHALT — Supabase Setup
-- Run this in the Supabase SQL Editor
-- (same project as HAsset — new tables only)
-- ============================================

-- Families
create table if not exists hh_families (
  id         uuid default gen_random_uuid() primary key,
  name       text not null default 'Família',
  created_at timestamp with time zone default now()
);

-- Family members
create table if not exists hh_family_members (
  id           uuid default gen_random_uuid() primary key,
  family_id    uuid references hh_families(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete cascade,
  display_name text,
  role         text default 'member',
  created_at   timestamp with time zone default now(),
  unique(family_id, user_id)
);

-- Categories
create table if not exists hh_categories (
  id         uuid default gen_random_uuid() primary key,
  family_id  uuid references hh_families(id) on delete cascade,
  name       text not null,
  icon       text default '💰',
  color      text default '#0f766e',
  is_default boolean default false,
  active     boolean default true,
  created_at timestamp with time zone default now()
);

-- Expenses
create table if not exists hh_expenses (
  id           uuid default gen_random_uuid() primary key,
  family_id    uuid references hh_families(id) on delete cascade,
  user_id      uuid references auth.users(id),
  category_id  uuid references hh_categories(id) on delete set null,
  description  text not null,
  amount       numeric(12,2) not null check (amount > 0),
  date         date not null default current_date,
  payment_type text default 'pix' check (payment_type in ('pix','debit','credit','cash')),
  shared       boolean default false,
  paid         boolean default true,
  notes        text,
  created_at   timestamp with time zone default now()
);

-- ============================================
-- Row Level Security
-- ============================================

alter table hh_families        enable row level security;
alter table hh_family_members  enable row level security;
alter table hh_categories      enable row level security;
alter table hh_expenses        enable row level security;

-- hh_families: visible to members
create policy "hh_families_select" on hh_families
  for select using (
    id in (select family_id from hh_family_members where user_id = auth.uid())
  );

create policy "hh_families_insert" on hh_families
  for insert with check (auth.uid() is not null);

-- hh_family_members: users can see/manage their own membership
create policy "hh_family_members_select" on hh_family_members
  for select using (auth.uid() = user_id);

create policy "hh_family_members_insert" on hh_family_members
  for insert with check (auth.uid() = user_id);

-- hh_categories: full access for family members
create policy "hh_categories_all" on hh_categories
  for all using (
    family_id in (select family_id from hh_family_members where user_id = auth.uid())
  );

-- hh_expenses: full access for family members
create policy "hh_expenses_all" on hh_expenses
  for all using (
    family_id in (select family_id from hh_family_members where user_id = auth.uid())
  );

-- ============================================
-- Indexes for performance
-- ============================================

create index if not exists idx_hh_expenses_family_date
  on hh_expenses(family_id, date);

create index if not exists idx_hh_family_members_user
  on hh_family_members(user_id);
