-- Structured lab values attached to uploaded reports.
-- Run after 004_lab_reports.sql.

create table if not exists public.lab_panels (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  upload_id uuid references public.lab_report_uploads (id) on delete set null,
  recorded_at date not null default current_date,
  hemoglobin_a1c numeric(4,1),
  fasting_glucose numeric(5,1),
  total_cholesterol numeric(5,1),
  ldl numeric(5,1),
  hdl numeric(5,1),
  triglycerides numeric(6,1),
  hemoglobin numeric(4,1),
  wbc numeric(6,1),
  platelets numeric(7,1),
  creatinine numeric(4,2),
  notes text,
  created_at timestamptz not null default now(),
  constraint lab_panels_upload_unique unique (upload_id)
);

create index if not exists lab_panels_patient_id_idx
  on public.lab_panels (patient_id, recorded_at desc, created_at desc);

alter table public.lab_panels enable row level security;

drop policy if exists "lab_panels_select_own" on public.lab_panels;
create policy "lab_panels_select_own"
  on public.lab_panels for select
  using (auth.uid() = patient_id);

drop policy if exists "lab_panels_insert_own" on public.lab_panels;
create policy "lab_panels_insert_own"
  on public.lab_panels for insert
  with check (
    auth.uid() = patient_id
    and public.is_patient_profile_unchecked(patient_id)
    and (
      upload_id is null
      or exists (
        select 1 from public.lab_report_uploads r
        where r.id = upload_id and r.patient_id = auth.uid()
      )
    )
  );

drop policy if exists "lab_panels_update_own" on public.lab_panels;
create policy "lab_panels_update_own"
  on public.lab_panels for update
  using (auth.uid() = patient_id)
  with check (auth.uid() = patient_id);

drop policy if exists "lab_panels_delete_own" on public.lab_panels;
create policy "lab_panels_delete_own"
  on public.lab_panels for delete
  using (auth.uid() = patient_id);

drop policy if exists "lab_panels_select_caring_doctor" on public.lab_panels;
create policy "lab_panels_select_caring_doctor"
  on public.lab_panels for select
  using (
    exists (
      select 1 from public.care_relationships c
      where c.patient_id = lab_panels.patient_id
        and c.doctor_id = auth.uid()
    )
  );
