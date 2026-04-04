-- Seed demo network: 10 doctors, 50 patients, care_relationships (5 patients per doctor).
-- Run in Supabase SQL Editor (Dashboard → SQL) after migrations 001–002 (003 optional).
--
-- Requires: extension pgcrypto (enabled by default on Supabase) for crypt().
-- Your handle_new_user trigger must create public.profiles from raw_user_meta_data (001_profiles.sql).
--
-- Sign-in (if identities insert succeeds): password for all seed accounts is:
--   SeedPassword123!
-- Emails: zebra-seed-doctor-1@example.test … zebra-seed-doctor-10@example.test
--        zebra-seed-patient-1@example.test … zebra-seed-patient-50@example.test
--
-- Re-run: execute the cleanup below alone first, then run this whole file again.
--
-- delete from auth.users
-- where email like 'zebra-seed-doctor-%@example.test'
--    or email like 'zebra-seed-patient-%@example.test';

begin;

create temporary table seed_doctor_ids (
  id uuid not null,
  rn int not null primary key
);

create temporary table seed_patient_ids (
  id uuid not null,
  rn int not null primary key
);

-- 10 doctors (profiles created by trigger from raw_user_meta_data)
with inserted as (
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  select
    coalesce(
      (select id from auth.instances limit 1),
      '00000000-0000-0000-0000-000000000000'::uuid
    ),
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'zebra-seed-doctor-' || n || '@example.test',
    crypt('SeedPassword123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'role', 'doctor',
      'full_name', 'Dr. Seed ' || n,
      'license_number', 'LIC-DOC-' || lpad(n::text, 4, '0')
    ),
    now(),
    now(),
    '',
    '',
    '',
    ''
  from generate_series(1, 10) as n
  returning id
)
insert into seed_doctor_ids (id, rn)
select id, row_number() over (order by id)
from inserted;

-- 50 patients
with inserted as (
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  select
    coalesce(
      (select id from auth.instances limit 1),
      '00000000-0000-0000-0000-000000000000'::uuid
    ),
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'zebra-seed-patient-' || n || '@example.test',
    crypt('SeedPassword123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'role', 'patient',
      'full_name', 'Seed Patient ' || n
    ),
    now(),
    now(),
    '',
    '',
    '',
    ''
  from generate_series(1, 50) as n
  returning id
)
insert into seed_patient_ids (id, rn)
select id, row_number() over (order by id)
from inserted;

-- Email provider identities (needed for password login on current Supabase Auth)
insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  u.id,
  u.email,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true
  ),
  'email',
  now(),
  now(),
  now()
from auth.users u
where u.email like 'zebra-seed-doctor-%@example.test'
   or u.email like 'zebra-seed-patient-%@example.test';

-- Link each patient to exactly one doctor: patients 1–5 → doctor 1, 6–10 → doctor 2, …
insert into public.care_relationships (
  doctor_id,
  patient_id,
  last_visit,
  primary_condition,
  heart_rate,
  blood_pressure_systolic,
  blood_pressure_diastolic,
  glucose,
  health_status,
  risk_flags
)
select
  d.id,
  p.id,
  (current_date - ((p.rn % 45) + 1))::date,
  (array[
    'Hypertension',
    'Type 2 diabetes',
    'Asthma',
    'Hypothyroidism',
    'GERD'
  ])[(p.rn % 5) + 1],
  62 + (p.rn % 35),
  108 + (p.rn % 25),
  68 + (p.rn % 18),
  85 + (p.rn % 60),
  (array['normal', 'normal', 'elevated', 'risk']::text[])[(p.rn % 4) + 1],
  case
    when p.rn % 11 = 0 then array['Review meds', 'Follow-up labs']::text[]
    when p.rn % 7 = 0 then array['Elevated BP trend']::text[]
    else '{}'::text[]
  end
from seed_patient_ids p
join seed_doctor_ids d on d.rn = ((p.rn - 1) / 5) + 1;

commit;
