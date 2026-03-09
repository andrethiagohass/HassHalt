-- ============================================
-- HASSHALT — Adicionar campo "Quem pagou"
-- Run this in the Supabase SQL Editor
-- ============================================

-- Add paid_by column to hh_expenses
alter table hh_expenses add column if not exists paid_by uuid references auth.users(id) on delete set null;

create index if not exists idx_hh_expenses_paid_by on hh_expenses(paid_by);

-- ============================================
-- Admin: allow admin to remove other members
-- ============================================

create or replace function hh_is_family_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists(
    select 1 from hh_family_members
    where user_id = auth.uid() and role = 'admin'
  )
$$;

drop policy if exists "hh_family_members_delete" on hh_family_members;
drop policy if exists "hh_family_members_self_delete" on hh_family_members;

-- Admin can remove other members from the family
create policy "hh_family_members_delete" on hh_family_members
  for delete using (
    family_id = hh_get_my_family_id()
    and user_id != auth.uid()
    and hh_is_family_admin()
  );

-- Any user can remove themselves (to leave and join another family)
create policy "hh_family_members_self_delete" on hh_family_members
  for delete using (user_id = auth.uid());
