-- Migration: Fix RLS policies and validation functions for linking patients to doctors

-- 1. Make profile verification functions SECURITY DEFINER so triggers and policy checks can verify roles without RLS recursion
create or replace function public.is_doctor_profile(profile_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = profile_id and role = 'doctor'
  );
$$;

create or replace function public.is_patient_profile(profile_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = profile_id and role = 'patient'
  );
$$;

-- 2. Update profiles SELECT policy using security definer helper to avoid infinite RLS recursion on public.profiles
drop policy if exists "profiles_select_linked_care_team" on public.profiles;
create policy "profiles_select_linked_care_team"
  on public.profiles for select
  using (
    auth.uid() = id
    or (
      role = 'patient'
      and public.is_doctor_profile(auth.uid())
    )
    or exists (
      select 1
      from public.care_relationships cr
      where (
        cr.doctor_id = auth.uid()
        and cr.patient_id = profiles.id
      ) or (
        cr.patient_id = auth.uid()
        and cr.doctor_id = profiles.id
      )
    )
  );
