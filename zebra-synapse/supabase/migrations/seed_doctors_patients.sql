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
begin;

-- Automatically clean up existing seed demo users so this script is idempotent and safe to re-run
delete from auth.users
where email like 'zebra-seed-doctor-%@example.test'
   or email like 'zebra-seed-patient-%@example.test';

create temporary table seed_doctor_ids (
  id uuid not null,
  rn int not null primary key
);

create temporary table seed_patient_ids (
  id uuid not null,
  rn int not null primary key
);

create temporary table seed_doctors_data (
  rn int primary key,
  email text not null unique,
  full_name text not null,
  license_number text not null
);

insert into seed_doctors_data (rn, email, full_name, license_number)
values
  (1, 'zebra-seed-doctor-1@example.test', 'Dr. Amelia Hart', 'LIC-DOC-1001'),
  (2, 'zebra-seed-doctor-2@example.test', 'Dr. Benjamin Ortiz', 'LIC-DOC-1002'),
  (3, 'zebra-seed-doctor-3@example.test', 'Dr. Chloe Menon', 'LIC-DOC-1003'),
  (4, 'zebra-seed-doctor-4@example.test', 'Dr. Daniel Kim', 'LIC-DOC-1004'),
  (5, 'zebra-seed-doctor-5@example.test', 'Dr. Evelyn Brooks', 'LIC-DOC-1005'),
  (6, 'zebra-seed-doctor-6@example.test', 'Dr. Farah Siddiqui', 'LIC-DOC-1006'),
  (7, 'zebra-seed-doctor-7@example.test', 'Dr. Gabriel Chen', 'LIC-DOC-1007'),
  (8, 'zebra-seed-doctor-8@example.test', 'Dr. Hannah Patel', 'LIC-DOC-1008'),
  (9, 'zebra-seed-doctor-9@example.test', 'Dr. Isaac Romero', 'LIC-DOC-1009'),
  (10, 'zebra-seed-doctor-10@example.test', 'Dr. Julia Nguyen', 'LIC-DOC-1010');

create temporary table seed_patients_data (
  rn int primary key,
  email text not null unique,
  full_name text not null,
  height_cm numeric(5,2) not null,
  weight_kg numeric(5,2) not null,
  age int not null default 34,
  gender text not null default 'Female',
  blood_type text not null default 'O+',
  dietary_preference text,
  food_allergies text[] not null default '{}',
  dietary_conditions text[] not null default '{}',
  last_visit_offset int not null,
  primary_condition text,
  heart_rate int,
  blood_pressure_systolic int,
  blood_pressure_diastolic int,
  glucose int,
  health_status text not null check (health_status in ('normal', 'elevated', 'risk')),
  risk_flags text[] not null default '{}'
);

insert into seed_patients_data (
  rn,
  email,
  full_name,
  height_cm,
  weight_kg,
  age,
  gender,
  blood_type,
  dietary_preference,
  food_allergies,
  dietary_conditions,
  last_visit_offset,
  primary_condition,
  heart_rate,
  blood_pressure_systolic,
  blood_pressure_diastolic,
  glucose,
  health_status,
  risk_flags
)
values
  (1, 'zebra-seed-patient-1@example.test', 'Maya Thompson', 165.0, 68.5, 34, 'Female', 'O+', 'omnivore', '{}'::text[], array['hypertension']::text[], 4, 'Hypertension', 72, 120, 80, 95, 'normal', array['Routine BP review']::text[]),
  (2, 'zebra-seed-patient-2@example.test', 'Liam Carter', 178.0, 76.0, 41, 'Male', 'A+', 'vegetarian', array['lactose']::text[], '{}'::text[], 11, 'Hyperlipidemia', 68, 118, 76, 92, 'normal', '{}'::text[]),
  (3, 'zebra-seed-patient-3@example.test', 'Sofia Bennett', 162.0, 79.5, 52, 'Female', 'B+', 'omnivore', '{}'::text[], array['diabetes']::text[], 7, 'Type 2 diabetes', 76, 132, 84, 148, 'risk', array['High glucose']::text[]),
  (4, 'zebra-seed-patient-4@example.test', 'Noah Patel', 182.0, 74.0, 29, 'Male', 'AB+', 'vegan', array['peanuts']::text[], '{}'::text[], 18, 'Asthma', 74, 116, 74, 90, 'normal', array['Inhaler refill due']::text[]),
  (5, 'zebra-seed-patient-5@example.test', 'Ava Richardson', 158.0, 54.0, 36, 'Female', 'O+', 'vegetarian', '{}'::text[], array['gerd']::text[], 9, 'GERD', 70, 114, 72, 88, 'normal', '{}'::text[]),
  (6, 'zebra-seed-patient-6@example.test', 'Ethan Brooks', 175.0, 72.5, 45, 'Male', 'A-', 'omnivore', array['gluten']::text[], '{}'::text[], 13, 'Hypothyroidism', 66, 112, 70, 91, 'normal', '{}'::text[]),
  (7, 'zebra-seed-patient-7@example.test', 'Isabella Hughes', 168.0, 71.0, 38, 'Female', 'B-', 'pescatarian', '{}'::text[], array['hypertension']::text[], 6, 'Hypertension', 79, 138, 88, 102, 'elevated', array['Elevated BP trend']::text[]),
  (8, 'zebra-seed-patient-8@example.test', 'Mason Flores', 173.0, 84.0, 49, 'Male', 'O-', 'omnivore', '{}'::text[], array['diabetes']::text[], 15, 'Prediabetes', 73, 124, 80, 109, 'elevated', array['Glucose watch']::text[]),
  (9, 'zebra-seed-patient-9@example.test', 'Mia Sanders', 160.0, 55.5, 27, 'Female', 'A+', 'vegan', array['soy']::text[], array['gerd']::text[], 21, 'Migraine', 71, 118, 75, 87, 'normal', '{}'::text[]),
  (10, 'zebra-seed-patient-10@example.test', 'Lucas Reed', 180.0, 91.0, 58, 'Male', 'O+', 'omnivore', array['shellfish']::text[], array['diabetes']::text[], 5, 'Type 2 diabetes', 82, 140, 90, 156, 'risk', array['High glucose', 'Foot exam follow-up']::text[]),
  (11, 'zebra-seed-patient-11@example.test', 'Harper Price', 164.0, 63.0, 44, 'Female', 'B+', 'vegetarian', array['lactose']::text[], '{}'::text[], 12, 'Osteoarthritis', 69, 122, 78, 94, 'normal', '{}'::text[]),
  (12, 'zebra-seed-patient-12@example.test', 'James Howard', 176.0, 82.0, 61, 'Male', 'A+', 'omnivore', '{}'::text[], array['kidney_disease', 'hypertension']::text[], 8, 'CKD stage 3a', 78, 136, 86, 110, 'elevated', array['Renal panel follow-up']::text[]),
  (13, 'zebra-seed-patient-13@example.test', 'Ella Morris', 157.0, 51.0, 31, 'Female', 'O+', 'vegetarian', '{}'::text[], '{}'::text[], 24, 'Iron-deficiency anemia', 88, 110, 70, 89, 'elevated', array['Fatigue review']::text[]),
  (14, 'zebra-seed-patient-14@example.test', 'Benjamin Ross', 181.0, 88.0, 56, 'Male', 'O+', 'omnivore', '{}'::text[], '{}'::text[], 14, 'COPD', 84, 130, 82, 101, 'elevated', array['Smoking cessation counseling']::text[]),
  (15, 'zebra-seed-patient-15@example.test', 'Grace Kelly', 167.0, 60.0, 48, 'Female', 'A-', 'vegan', array['gluten']::text[], '{}'::text[], 19, 'Rheumatoid arthritis', 76, 120, 76, 93, 'normal', '{}'::text[]),
  (16, 'zebra-seed-patient-16@example.test', 'Henry Cooper', 177.0, 86.5, 63, 'Male', 'B+', 'omnivore', '{}'::text[], array['hypertension', 'gerd']::text[], 3, 'Coronary artery disease', 80, 142, 88, 115, 'risk', array['Cardiology follow-up']::text[]),
  (17, 'zebra-seed-patient-17@example.test', 'Chloe Ward', 163.0, 73.0, 33, 'Female', 'O+', 'eggetarian', array['lactose']::text[], array['diabetes']::text[], 17, 'PCOS', 72, 126, 82, 104, 'elevated', array['Metabolic screening']::text[]),
  (18, 'zebra-seed-patient-18@example.test', 'Jack Foster', 174.0, 85.0, 47, 'Male', 'A+', 'omnivore', '{}'::text[], array['gerd']::text[], 10, 'NAFLD', 77, 134, 86, 112, 'elevated', array['Liver enzymes monitor']::text[]),
  (19, 'zebra-seed-patient-19@example.test', 'Lily Murphy', 166.0, 58.0, 26, 'Female', 'O+', 'vegetarian', '{}'::text[], array['ibs']::text[], 22, 'Depression with insomnia', 74, 118, 76, 95, 'normal', array['Sleep hygiene check']::text[]),
  (20, 'zebra-seed-patient-20@example.test', 'Alexander Perry', 183.0, 95.0, 54, 'Male', 'B+', 'omnivore', '{}'::text[], array['diabetes', 'hypertension']::text[], 4, 'Type 2 diabetes', 86, 146, 92, 164, 'risk', array['High glucose', 'Medication adherence']::text[]),
  (21, 'zebra-seed-patient-21@example.test', 'Zoe Coleman', 161.0, 53.5, 30, 'Female', 'AB+', 'vegan', array['tree_nuts']::text[], '{}'::text[], 16, 'Asthma', 72, 117, 75, 90, 'normal', '{}'::text[]),
  (22, 'zebra-seed-patient-22@example.test', 'Sebastian Powell', 179.0, 80.0, 43, 'Male', 'O+', 'omnivore', '{}'::text[], array['hypertension']::text[], 7, 'Hypertension', 78, 136, 84, 98, 'elevated', array['Home BP review']::text[]),
  (23, 'zebra-seed-patient-23@example.test', 'Nora Long', 159.0, 62.0, 39, 'Female', 'A+', 'gluten-free', array['gluten']::text[], '{}'::text[], 20, 'Hashimoto thyroiditis', 68, 114, 72, 92, 'normal', '{}'::text[]),
  (24, 'zebra-seed-patient-24@example.test', 'William Jenkins', 175.0, 78.0, 51, 'Male', 'O+', 'omnivore', '{}'::text[], array['gerd', 'gastritis']::text[], 26, 'GERD', 71, 119, 77, 91, 'normal', '{}'::text[]),
  (25, 'zebra-seed-patient-25@example.test', 'Hannah Russell', 165.0, 75.0, 46, 'Female', 'B+', 'vegetarian', '{}'::text[], array['diabetes']::text[], 9, 'Prediabetes', 75, 128, 82, 108, 'elevated', array['Nutrition follow-up']::text[]),
  (26, 'zebra-seed-patient-26@example.test', 'Samuel Bryant', 178.0, 89.0, 65, 'Male', 'A+', 'omnivore', '{}'::text[], array['hypertension', 'kidney_disease']::text[], 5, 'Heart failure with preserved EF', 83, 144, 90, 118, 'risk', array['Daily weight check', 'Cardiology review']::text[]),
  (27, 'zebra-seed-patient-27@example.test', 'Avery Simmons', 170.0, 67.0, 35, 'Female', 'O+', 'pescatarian', array['lactose']::text[], '{}'::text[], 18, 'Hyperlipidemia', 70, 120, 78, 96, 'normal', '{}'::text[]),
  (28, 'zebra-seed-patient-28@example.test', 'David Barnes', 182.0, 87.0, 59, 'Male', 'B+', 'omnivore', '{}'::text[], array['kidney_disease']::text[], 11, 'Chronic kidney disease', 79, 138, 88, 113, 'elevated', array['Renal labs due']::text[]),
  (29, 'zebra-seed-patient-29@example.test', 'Scarlett Cox', 162.0, 69.0, 42, 'Female', 'A+', 'vegan', '{}'::text[], array['gerd']::text[], 15, 'Rheumatoid arthritis', 76, 124, 80, 99, 'elevated', array['Inflammation flare']::text[]),
  (30, 'zebra-seed-patient-30@example.test', 'Joseph Hayes', 185.0, 96.0, 53, 'Male', 'O+', 'omnivore', '{}'::text[], array['diabetes']::text[], 6, 'Type 2 diabetes', 84, 148, 94, 172, 'risk', array['High glucose', 'A1c overdue']::text[]),
  (31, 'zebra-seed-patient-31@example.test', 'Aria Peterson', 164.0, 56.0, 25, 'Female', 'A-', 'vegetarian', '{}'::text[], '{}'::text[], 21, 'Migraine', 69, 116, 74, 89, 'normal', '{}'::text[]),
  (32, 'zebra-seed-patient-32@example.test', 'Matthew Gray', 176.0, 92.0, 50, 'Male', 'O+', 'omnivore', '{}'::text[], array['gerd', 'hypertension']::text[], 13, 'Obstructive sleep apnea', 74, 130, 84, 101, 'elevated', array['CPAP adherence']::text[]),
  (33, 'zebra-seed-patient-33@example.test', 'Penelope Ramirez', 160.0, 68.0, 37, 'Female', 'B+', 'omnivore', array['lactose']::text[], array['hypertension']::text[], 8, 'Hypertension', 77, 140, 86, 106, 'elevated', array['Elevated BP trend']::text[]),
  (34, 'zebra-seed-patient-34@example.test', 'Daniel Bell', 174.0, 70.0, 32, 'Male', 'O+', 'vegetarian', array['gluten']::text[], array['ibs']::text[], 23, 'Ulcerative colitis', 81, 122, 78, 97, 'normal', array['GI follow-up']::text[]),
  (35, 'zebra-seed-patient-35@example.test', 'Layla Bailey', 158.0, 59.0, 40, 'Female', 'A+', 'omnivore', '{}'::text[], '{}'::text[], 27, 'Hypothyroidism', 67, 112, 70, 90, 'normal', '{}'::text[]),
  (36, 'zebra-seed-patient-36@example.test', 'Owen Cooper', 180.0, 85.0, 62, 'Male', 'O+', 'omnivore', '{}'::text[], array['hypertension']::text[], 4, 'Coronary artery disease', 82, 145, 92, 120, 'risk', array['Chest symptom monitoring']::text[]),
  (37, 'zebra-seed-patient-37@example.test', 'Riley Nelson', 169.0, 77.0, 44, 'Female', 'AB-', 'vegan', array['soy']::text[], array['diabetes']::text[], 14, 'Prediabetes', 73, 126, 80, 111, 'elevated', array['Glucose watch']::text[]),
  (38, 'zebra-seed-patient-38@example.test', 'Carter Morgan', 177.0, 83.0, 57, 'Male', 'A+', 'omnivore', '{}'::text[], array['gerd']::text[], 19, 'COPD', 85, 134, 84, 105, 'elevated', array['Pulmonary rehab review']::text[]),
  (39, 'zebra-seed-patient-39@example.test', 'Stella Mitchell', 156.0, 49.0, 28, 'Female', 'O+', 'vegetarian', '{}'::text[], '{}'::text[], 10, 'Iron-deficiency anemia', 90, 108, 68, 86, 'elevated', array['Repeat CBC']::text[]),
  (40, 'zebra-seed-patient-40@example.test', 'Wyatt Turner', 178.0, 76.0, 55, 'Male', 'B+', 'pescatarian', '{}'::text[], '{}'::text[], 28, 'Osteoarthritis', 72, 118, 76, 93, 'normal', '{}'::text[]),
  (41, 'zebra-seed-patient-41@example.test', 'Audrey Perez', 163.0, 72.0, 36, 'Female', 'A+', 'omnivore', array['lactose']::text[], array['diabetes']::text[], 17, 'PCOS', 74, 124, 78, 103, 'elevated', array['Cycle tracking']::text[]),
  (42, 'zebra-seed-patient-42@example.test', 'Levi Edwards', 182.0, 94.0, 60, 'Male', 'O+', 'omnivore', '{}'::text[], array['diabetes', 'hypertension']::text[], 5, 'Type 2 diabetes', 88, 150, 96, 178, 'risk', array['High glucose', 'Retinal exam needed']::text[]),
  (43, 'zebra-seed-patient-43@example.test', 'Brooklyn Collins', 167.0, 61.0, 29, 'Female', 'O+', 'vegetarian', array['peanuts']::text[], array['ibs']::text[], 22, 'Anxiety disorder', 78, 120, 76, 94, 'normal', array['Behavioral health check-in']::text[]),
  (44, 'zebra-seed-patient-44@example.test', 'Julian Stewart', 175.0, 81.0, 47, 'Male', 'A+', 'omnivore', '{}'::text[], array['hypertension']::text[], 9, 'Hypertension', 76, 138, 86, 100, 'elevated', array['Home BP review']::text[]),
  (45, 'zebra-seed-patient-45@example.test', 'Savannah Cook', 165.0, 84.0, 51, 'Female', 'O+', 'vegan', '{}'::text[], array['gerd']::text[], 12, 'NAFLD', 75, 132, 84, 109, 'elevated', array['Weight management']::text[]),
  (46, 'zebra-seed-patient-46@example.test', 'Nathan Hughes', 179.0, 82.0, 58, 'Male', 'B+', 'omnivore', '{}'::text[], array['hypertension']::text[], 6, 'Atrial fibrillation', 92, 136, 82, 107, 'risk', array['Rhythm follow-up']::text[]),
  (47, 'zebra-seed-patient-47@example.test', 'Claire Flores', 160.0, 54.0, 32, 'Female', 'O-', 'vegetarian', array['lactose']::text[], '{}'::text[], 18, 'Asthma', 73, 118, 74, 91, 'normal', '{}'::text[]),
  (48, 'zebra-seed-patient-48@example.test', 'Isaac Bennett', 173.0, 86.0, 64, 'Male', 'A+', 'omnivore', '{}'::text[], array['kidney_disease', 'hypertension']::text[], 7, 'Chronic kidney disease', 80, 142, 88, 114, 'risk', array['Renal panel follow-up', 'BP control']::text[]),
  (49, 'zebra-seed-patient-49@example.test', 'Eleanor Hughes', 168.0, 64.0, 43, 'Female', 'O+', 'pescatarian', '{}'::text[], array['gerd']::text[], 20, 'Hyperlipidemia', 68, 119, 76, 95, 'normal', '{}'::text[]),
  (50, 'zebra-seed-patient-50@example.test', 'Caleb Foster', 184.0, 97.0, 52, 'Male', 'AB+', 'omnivore', array['shellfish']::text[], array['diabetes']::text[], 4, 'Type 2 diabetes', 85, 147, 93, 168, 'risk', array['High glucose', 'Medication titration']::text[]);

-- 10 doctors (profiles created by trigger from raw_user_meta_data)
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
  d.email,
  crypt('SeedPassword123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object(
    'role', 'doctor',
    'full_name', d.full_name,
    'license_number', d.license_number
  ),
  now(),
  now(),
  '',
  '',
  '',
  ''
from seed_doctors_data d;

insert into seed_doctor_ids (id, rn)
select u.id, d.rn
from auth.users u
join seed_doctors_data d on d.email = u.email;

-- 50 patients (profiles created by trigger from raw_user_meta_data)
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
  p.email,
  crypt('SeedPassword123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object(
    'role', 'patient',
    'full_name', p.full_name,
    'height_cm', p.height_cm,
    'weight_kg', p.weight_kg,
    'age', p.age,
    'gender', p.gender,
    'blood_type', p.blood_type,
    'dietary_preference', p.dietary_preference,
    'food_allergies', to_jsonb(p.food_allergies),
    'dietary_conditions', to_jsonb(p.dietary_conditions)
  ),
  now(),
  now(),
  '',
  '',
  '',
  ''
from seed_patients_data p;

insert into seed_patient_ids (id, rn)
select u.id, p.rn
from auth.users u
join seed_patients_data p on p.email = u.email;

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
  pids.id,
  (current_date - p.last_visit_offset)::date,
  p.primary_condition,
  p.heart_rate,
  p.blood_pressure_systolic,
  p.blood_pressure_diastolic,
  p.glucose,
  p.health_status,
  p.risk_flags
from seed_patients_data p
join seed_patient_ids pids on pids.rn = p.rn
join seed_doctor_ids d on d.rn = ((p.rn - 1) / 5) + 1;

commit;
