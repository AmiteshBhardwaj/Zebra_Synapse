-- Async lab-report analysis pipeline with extraction review and publish flow.

alter table public.lab_report_uploads
  add column if not exists analysis_status text not null default 'queued',
  add column if not exists document_type text,
  add column if not exists analysis_version text not null default 'lab-pipeline-v1',
  add column if not exists last_error text,
  add column if not exists processed_at timestamptz;

alter table public.lab_report_uploads
  drop constraint if exists lab_report_uploads_analysis_status_check;

alter table public.lab_report_uploads
  add constraint lab_report_uploads_analysis_status_check
  check (analysis_status in ('uploaded', 'queued', 'processing', 'review_required', 'ready', 'failed'));

alter table public.lab_report_uploads
  drop constraint if exists lab_report_uploads_document_type_check;

alter table public.lab_report_uploads
  add constraint lab_report_uploads_document_type_check
  check (document_type is null or document_type in ('lab_report', 'unsupported'));

create table if not exists public.lab_report_analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.lab_report_uploads (id) on delete cascade,
  status text not null default 'queued',
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lab_report_analysis_jobs
  drop constraint if exists lab_report_analysis_jobs_status_check;

alter table public.lab_report_analysis_jobs
  add constraint lab_report_analysis_jobs_status_check
  check (status in ('queued', 'processing', 'completed', 'failed'));

create index if not exists lab_report_analysis_jobs_status_idx
  on public.lab_report_analysis_jobs (status, available_at, created_at);

create unique index if not exists lab_report_analysis_jobs_upload_active_idx
  on public.lab_report_analysis_jobs (upload_id)
  where status in ('queued', 'processing');

create table if not exists public.lab_report_extractions (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null unique references public.lab_report_uploads (id) on delete cascade,
  schema_version text not null default 'lab-extraction-v1',
  raw_text text,
  ocr_text text,
  extracted_recorded_at date,
  biomarkers_json jsonb not null default '{}'::jsonb,
  field_sources_json jsonb not null default '{}'::jsonb,
  field_confidence_json jsonb not null default '{}'::jsonb,
  warnings_json jsonb not null default '[]'::jsonb,
  review_state text not null default 'pending',
  review_notes text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lab_report_extractions
  drop constraint if exists lab_report_extractions_review_state_check;

alter table public.lab_report_extractions
  add constraint lab_report_extractions_review_state_check
  check (review_state in ('pending', 'review_required', 'published', 'auto_published', 'rejected'));

create index if not exists lab_report_extractions_review_state_idx
  on public.lab_report_extractions (review_state, updated_at desc);

alter table public.lab_report_extractions enable row level security;
alter table public.lab_report_extractions force row level security;

alter table public.lab_report_analysis_jobs enable row level security;
alter table public.lab_report_analysis_jobs force row level security;

alter table public.lab_panels
  add column if not exists source_extraction_id uuid references public.lab_report_extractions (id) on delete set null;

create or replace function public.touch_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_lab_report_analysis_jobs_updated_at on public.lab_report_analysis_jobs;
create trigger touch_lab_report_analysis_jobs_updated_at
  before update on public.lab_report_analysis_jobs
  for each row execute function public.touch_updated_at_column();

drop trigger if exists touch_lab_report_extractions_updated_at on public.lab_report_extractions;
create trigger touch_lab_report_extractions_updated_at
  before update on public.lab_report_extractions
  for each row execute function public.touch_updated_at_column();

create or replace function public.enqueue_lab_report_analysis_job()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.lab_report_analysis_jobs (upload_id, status, available_at)
  values (new.id, 'queued', now())
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists enqueue_lab_report_analysis_job on public.lab_report_uploads;
create trigger enqueue_lab_report_analysis_job
  after insert on public.lab_report_uploads
  for each row execute function public.enqueue_lab_report_analysis_job();

drop policy if exists "lab_report_uploads_update_own" on public.lab_report_uploads;
create policy "lab_report_uploads_update_own"
  on public.lab_report_uploads for update
  using (
    auth.uid() = patient_id
    and public.is_patient_profile_unchecked(patient_id)
  )
  with check (
    auth.uid() = patient_id
    and public.is_patient_profile_unchecked(patient_id)
  );

drop policy if exists "lab_report_extractions_select_own" on public.lab_report_extractions;
create policy "lab_report_extractions_select_own"
  on public.lab_report_extractions for select
  using (
    exists (
      select 1
      from public.lab_report_uploads r
      where r.id = lab_report_extractions.upload_id
        and r.patient_id = auth.uid()
    )
  );

drop policy if exists "lab_report_extractions_update_own" on public.lab_report_extractions;
create policy "lab_report_extractions_update_own"
  on public.lab_report_extractions for update
  using (
    exists (
      select 1
      from public.lab_report_uploads r
      where r.id = lab_report_extractions.upload_id
        and r.patient_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.lab_report_uploads r
      where r.id = lab_report_extractions.upload_id
        and r.patient_id = auth.uid()
    )
  );

create or replace function public.validate_lab_panel_row()
returns trigger
language plpgsql
as $$
begin
  if not public.is_patient_profile(new.patient_id) then
    raise exception 'patient_id must reference a patient profile';
  end if;

  if new.upload_id is not null and not exists (
    select 1
    from public.lab_report_uploads
    where id = new.upload_id
      and patient_id = new.patient_id
  ) then
    raise exception 'upload_id must reference a lab upload owned by the same patient';
  end if;

  if new.source_extraction_id is not null and not exists (
    select 1
    from public.lab_report_extractions e
    join public.lab_report_uploads r on r.id = e.upload_id
    where e.id = new.source_extraction_id
      and r.patient_id = new.patient_id
  ) then
    raise exception 'source_extraction_id must reference an extraction owned by the same patient';
  end if;

  if tg_op = 'UPDATE' then
    if new.patient_id <> old.patient_id then
      raise exception 'patient_id is immutable';
    end if;

    if new.created_at <> old.created_at then
      raise exception 'created_at is immutable';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_lab_panel_row on public.lab_panels;
create trigger validate_lab_panel_row
  before insert or update on public.lab_panels
  for each row execute function public.validate_lab_panel_row();

drop trigger if exists audit_lab_report_extractions_phi_mutation on public.lab_report_extractions;
create trigger audit_lab_report_extractions_phi_mutation
  after insert or update or delete on public.lab_report_extractions
  for each row execute function public.audit_phi_mutation();

update public.lab_report_uploads u
set
  document_type = coalesce(u.document_type, 'lab_report'),
  analysis_status = case
    when exists (
      select 1 from public.lab_panels p
      where p.upload_id = u.id
    ) then 'ready'
    else coalesce(nullif(u.analysis_status, ''), 'queued')
  end,
  processed_at = case
    when exists (
      select 1 from public.lab_panels p
      where p.upload_id = u.id
    ) then coalesce(u.processed_at, u.created_at)
    else u.processed_at
  end,
  analysis_version = coalesce(nullif(u.analysis_version, ''), 'lab-pipeline-v1');

insert into public.lab_report_analysis_jobs (upload_id, status, available_at, created_at, updated_at)
select u.id, 'queued', now(), now(), now()
from public.lab_report_uploads u
where u.analysis_status in ('uploaded', 'queued', 'failed')
  and not exists (
    select 1
    from public.lab_report_analysis_jobs j
    where j.upload_id = u.id
      and j.status in ('queued', 'processing')
  )
  and not exists (
    select 1
    from public.lab_panels p
    where p.upload_id = u.id
  );
