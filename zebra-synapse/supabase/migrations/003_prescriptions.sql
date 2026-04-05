-- Run in Supabase SQL Editor after 002_care_relationships.sql.
-- Prescriptions added by linked doctors; patients and those doctors can read.

create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  prescribed_by uuid not null references public.profiles (id) on delete cascade,
  details text not null,
  status text not null default 'active'
    check (status in ('active', 'completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index prescriptions_patient_id_idx on public.prescriptions (patient_id);
create index prescriptions_prescribed_by_idx on public.prescriptions (prescribed_by);

alter table public.prescriptions enable row level security;

create policy "prescriptions_select_patient"
  on public.prescriptions for select
  using (auth.uid() = patient_id);

create policy "prescriptions_select_doctor_cared"
  on public.prescriptions for select
  using (
    exists (
      select 1 from public.care_relationships c
      where c.doctor_id = auth.uid() and c.patient_id = prescriptions.patient_id
    )
  );

create policy "prescriptions_insert_doctor"
  on public.prescriptions for insert
  with check (
    prescribed_by = auth.uid()
    and exists (
      select 1 from public.profiles d
      where d.id = auth.uid() and d.role = 'doctor'
    )
    and exists (
      select 1 from public.care_relationships c
      where c.doctor_id = auth.uid() and c.patient_id = patient_id
    )
    and exists (
      select 1 from public.profiles p
      where p.id = patient_id and p.role = 'patient'
    )
  );

create policy "prescriptions_update_prescriber"
  on public.prescriptions for update
  using (prescribed_by = auth.uid())
  with check (prescribed_by = auth.uid());

create policy "prescriptions_delete_prescriber"
  on public.prescriptions for delete
  using (prescribed_by = auth.uid());
