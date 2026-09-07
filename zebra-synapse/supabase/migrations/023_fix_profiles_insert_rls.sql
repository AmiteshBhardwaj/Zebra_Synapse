-- 023_fix_profiles_insert_rls.sql
-- Allow authenticated users to insert their own profile row if the sign-up trigger was skipped or delayed.
-- This guarantees self-healing profile initialization on all environments.

alter table if exists public.profiles enable row level security;

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Ensure profiles select/update policies remain intact
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (
    auth.uid() = id
    or exists (
      select 1 from public.care_relationships c
      where (c.patient_id = public.profiles.id and c.doctor_id = auth.uid())
         or (c.doctor_id = public.profiles.id and c.patient_id = auth.uid())
    )
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
