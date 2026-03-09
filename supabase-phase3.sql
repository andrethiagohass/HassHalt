-- ============================================
-- HASSHALT — Phase 3 SQL
-- Run this in the Supabase SQL Editor
-- ============================================

-- Security-definer function to get current user's family_id without recursion
create or replace function hh_get_my_family_id()
returns uuid
language sql
security definer
stable
as $$
  select family_id from hh_family_members where user_id = auth.uid() limit 1
$$;

-- Allow all family members to see each other (no more self-referential recursion)
drop policy if exists "hh_family_members_select" on hh_family_members;

create policy "hh_family_members_select" on hh_family_members
  for select using (family_id = hh_get_my_family_id());

-- Credit cards table (Phase 3)
create table if not exists hh_cards (
  id           uuid default gen_random_uuid() primary key,
  family_id    uuid references hh_families(id) on delete cascade,
  name         text not null,
  last_digits  text,
  limit_amount numeric(12,2),
  closing_day  int check (closing_day between 1 and 31),
  due_day      int check (due_day between 1 and 31),
  color        text default '#0f766e',
  active       boolean default true,
  created_at   timestamp with time zone default now()
);

alter table hh_cards enable row level security;

create policy "hh_cards_all" on hh_cards
  for all using (
    family_id in (select family_id from hh_family_members where user_id = auth.uid())
  );

-- Add card_id column to expenses
alter table hh_expenses add column if not exists card_id uuid references hh_cards(id) on delete set null;

create index if not exists idx_hh_cards_family on hh_cards(family_id);
create index if not exists idx_hh_expenses_card on hh_expenses(card_id);
