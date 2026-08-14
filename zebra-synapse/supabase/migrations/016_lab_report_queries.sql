-- 016_lab_report_queries.sql
-- Table for persisting patient queries, AI generated answers, and doctor verification/revision.

create table if not exists public.lab_report_queries (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.lab_report_uploads (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  doctor_id uuid references public.profiles (id) on delete set null,
  user_query text not null,
  ai_response text not null,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'verified', 'rejected_and_replaced')),
  doctor_response text,
  doctor_notes text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lab_report_queries_upload_id_idx on public.lab_report_queries (upload_id);
create index if not exists lab_report_queries_patient_id_idx on public.lab_report_queries (patient_id);
create index if not exists lab_report_queries_doctor_id_idx on public.lab_report_queries (doctor_id);
create index if not exists lab_report_queries_status_idx on public.lab_report_queries (status);

alter table public.lab_report_queries enable row level security;

-- Patient can select their own queries
drop policy if exists "lab_report_queries_select_patient" on public.lab_report_queries;
create policy "lab_report_queries_select_patient"
  on public.lab_report_queries for select
  using (auth.uid() = patient_id);

-- Connected doctor can select patient queries
drop policy if exists "lab_report_queries_select_doctor" on public.lab_report_queries;
create policy "lab_report_queries_select_doctor"
  on public.lab_report_queries for select
  using (
    exists (
      select 1 from public.care_relationships c
      where c.patient_id = lab_report_queries.patient_id
        and c.doctor_id = auth.uid()
    )
  );

-- Patient can insert their own queries
drop policy if exists "lab_report_queries_insert_patient" on public.lab_report_queries;
create policy "lab_report_queries_insert_patient"
  on public.lab_report_queries for insert
  with check (
    auth.uid() = patient_id
    and exists (
      select 1 from public.lab_report_uploads u
      where u.id = upload_id and u.patient_id = auth.uid()
    )
  );

-- Connected doctor can update query review status
drop policy if exists "lab_report_queries_update_doctor" on public.lab_report_queries;
create policy "lab_report_queries_update_doctor"
  on public.lab_report_queries for update
  using (
    exists (
      select 1 from public.care_relationships c
      where c.patient_id = lab_report_queries.patient_id
        and c.doctor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.care_relationships c
      where c.patient_id = lab_report_queries.patient_id
        and c.doctor_id = auth.uid()
    )
  );

-- Patient can delete their own queries (clear session history)
drop policy if exists "lab_report_queries_delete_patient" on public.lab_report_queries;
create policy "lab_report_queries_delete_patient"
  on public.lab_report_queries for delete
  using (auth.uid() = patient_id);


-- Trigger for auto-updating updated_at
create or replace function public.touch_lab_report_queries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_lab_report_queries_updated_at on public.lab_report_queries;
create trigger touch_lab_report_queries_updated_at
  before update on public.lab_report_queries
  for each row execute function public.touch_lab_report_queries_updated_at();
