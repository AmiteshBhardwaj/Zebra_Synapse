-- Migration 022: Add age, gender, and blood_type to profiles table
alter table public.profiles
  add column if not exists age integer,
  add column if not exists gender text,
  add column if not exists blood_type text;
