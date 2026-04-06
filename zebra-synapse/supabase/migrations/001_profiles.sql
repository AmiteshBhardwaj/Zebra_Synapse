-- Run this in the Supabase SQL Editor (Dashboard → SQL) for a new project.
-- Creates profiles linked to auth.users and a trigger to populate on sign-up.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('patient', 'doctor')),
  full_name text,
  license_number text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text;
begin
  r := coalesce(new.raw_user_meta_data->>'role', 'patient');
  if r not in ('patient', 'doctor') then
    r := 'patient';
  end if;

  insert into public.profiles (id, role, full_name, license_number)
  values (
    new.id,
    r,
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'license_number'), '')
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
-- Use `execute function` instead of `execute procedure` if your Postgres version prefers it (e.g. PG 14+).
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
