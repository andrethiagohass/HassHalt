-- ============================================
-- HASSHALT — HOTFIX: revert family members policy
-- Run this FIRST (close the app before running)
-- ============================================

-- Revert hh_family_members SELECT policy to the safe, non-recursive version.
-- The Phase 3 policy (using hh_get_my_family_id() inside the policy itself)
-- causes a silent deadlock in PostgREST and the query never returns.

drop policy if exists "hh_family_members_select" on hh_family_members;

create policy "hh_family_members_select" on hh_family_members
  for select using (auth.uid() = user_id);

-- Security-definer RPC to let the app read ALL family members
-- (bypasses RLS safely — called explicitly, not inside a policy)
create or replace function hh_get_family_members(p_family_id uuid)
returns table(
  id           uuid,
  family_id    uuid,
  user_id      uuid,
  display_name text,
  role         text,
  created_at   timestamptz
)
language sql
security definer
stable
as $$
  select id, family_id, user_id, display_name, role, created_at
  from hh_family_members
  where family_id = p_family_id
$$;
