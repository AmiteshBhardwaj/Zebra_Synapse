-- Run in Supabase SQL Editor after 001_profiles.sql.
-- Links doctors to patients and stores optional list-card clinical snapshot fields.

create table public.care_relationships (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.profiles (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_visit date,
  primary_condition text,
  heart_rate int,
  blood_pressure_systolic int,
  blood_pressure_diastolic int,
  glucose int,
  health_status text not null default 'normal'
    check (health_status in ('normal', 'elevated', 'risk')),
  risk_flags text[] not null default '{}',
  constraint care_relationships_doctor_patient_unique unique (doctor_id, patient_id)
);

create index care_relationships_doctor_id_idx on public.care_relationships (doctor_id);
create index care_relationships_patient_id_idx on public.care_relationships (patient_id);

alter table public.care_relationships enable row level security;

create policy "care_relationships_select_participant"
  on public.care_relationships for select
  using (auth.uid() = doctor_id or auth.uid() = patient_id);

create policy "care_relationships_insert_doctor"
  on public.care_relationships for insert
  with check (
    doctor_id = auth.uid()
    and exists (
      select 1 from public.profiles d
      where d.id = auth.uid() and d.role = 'doctor'
    )
    and exists (
      select 1 from public.profiles p
      where p.id = patient_id and p.role = 'patient'
    )
    and doctor_id <> patient_id
  );

create policy "care_relationships_update_doctor"
  on public.care_relationships for update
  using (doctor_id = auth.uid())
  with check (doctor_id = auth.uid());

create policy "care_relationships_delete_doctor"
  on public.care_relationships for delete
  using (doctor_id = auth.uid());

create policy "care_relationships_delete_patient"
  on public.care_relationships for delete
  using (patient_id = auth.uid());

-- Manual test seed (replace UUIDs with real ids from auth.users / public.profiles):
-- insert into public.care_relationships (
--   doctor_id, patient_id, last_visit, primary_condition,
--   heart_rate, blood_pressure_systolic, blood_pressure_diastolic, glucose,
--   health_status, risk_flags
-- ) values (
--   '00000000-0000-0000-0000-000000000001',
--   '00000000-0000-0000-0000-000000000002',
--   '2026-04-01',
--   'Type 2 Diabetes',
--   78, 128, 85, 145,
--   'elevated',
--   array['High glucose', 'Elevated BP']
-- );
