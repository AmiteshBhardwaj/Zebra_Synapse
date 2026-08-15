-- 020_fix_rls_policies.sql
-- Fix Row-Level Security (RLS) policies for lab report uploads, background jobs, audit logging, and extractions.

-- 1. Remove FORCE ROW LEVEL SECURITY on application and audit tables.
-- With regular ENABLE ROW LEVEL SECURITY, policies still protect all user/client queries,
-- but SECURITY DEFINER functions (e.g. audit triggers and queue enqueuers) can safely operate.
alter table if exists public.security_audit_log no force row level security;
alter table if exists public.lab_report_analysis_jobs no force row level security;
alter table if exists public.lab_report_extractions no force row level security;
alter table if exists public.profiles no force row level security;
alter table if exists public.care_relationships no force row level security;
alter table if exists public.prescriptions no force row level security;
alter table if exists public.lab_report_uploads no force row level security;
alter table if exists public.lab_panels no force row level security;
alter table if exists public.care_actions no force row level security;

-- 2. Helper verification functions (SECURITY DEFINER to prevent RLS recursion)
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

create or replace function public.is_patient_profile_unchecked(profile_id uuid)
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

-- 3. Audit log RLS policies
alter table public.security_audit_log enable row level security;

drop policy if exists "security_audit_log_insert_policy" on public.security_audit_log;
create policy "security_audit_log_insert_policy"
  on public.security_audit_log for insert
  with check (true);

drop policy if exists "security_audit_log_select_policy" on public.security_audit_log;
create policy "security_audit_log_select_policy"
  on public.security_audit_log for select
  using (auth.uid() = actor_id);

-- 4. Lab report uploads policies
alter table public.lab_report_uploads enable row level security;

drop policy if exists "lab_report_uploads_select_own" on public.lab_report_uploads;
create policy "lab_report_uploads_select_own"
  on public.lab_report_uploads for select
  using (
    auth.uid() = patient_id
    or exists (
      select 1 from public.care_relationships c
      where c.patient_id = lab_report_uploads.patient_id
        and c.doctor_id = auth.uid()
    )
  );

drop policy if exists "lab_report_uploads_insert_own" on public.lab_report_uploads;
create policy "lab_report_uploads_insert_own"
  on public.lab_report_uploads for insert
  with check (
    auth.uid() = patient_id
    and public.is_patient_profile_unchecked(patient_id)
  );

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

drop policy if exists "lab_report_uploads_delete_own" on public.lab_report_uploads;
create policy "lab_report_uploads_delete_own"
  on public.lab_report_uploads for delete
  using (auth.uid() = patient_id);

-- 5. Lab report analysis jobs RLS policies
alter table public.lab_report_analysis_jobs enable row level security;

drop policy if exists "lab_report_analysis_jobs_insert_own" on public.lab_report_analysis_jobs;
create policy "lab_report_analysis_jobs_insert_own"
  on public.lab_report_analysis_jobs for insert
  with check (
    exists (
      select 1 from public.lab_report_uploads u
      where u.id = lab_report_analysis_jobs.upload_id
        and u.patient_id = auth.uid()
    )
  );

drop policy if exists "lab_report_analysis_jobs_select_own" on public.lab_report_analysis_jobs;
create policy "lab_report_analysis_jobs_select_own"
  on public.lab_report_analysis_jobs for select
  using (
    exists (
      select 1 from public.lab_report_uploads u
      where u.id = lab_report_analysis_jobs.upload_id
        and (
          u.patient_id = auth.uid()
          or exists (
            select 1 from public.care_relationships c
            where c.patient_id = u.patient_id
              and c.doctor_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "lab_report_analysis_jobs_update_own" on public.lab_report_analysis_jobs;
create policy "lab_report_analysis_jobs_update_own"
  on public.lab_report_analysis_jobs for update
  using (
    exists (
      select 1 from public.lab_report_uploads u
      where u.id = lab_report_analysis_jobs.upload_id
        and u.patient_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.lab_report_uploads u
      where u.id = lab_report_analysis_jobs.upload_id
        and u.patient_id = auth.uid()
    )
  );

-- 6. Lab report extractions RLS policies
alter table public.lab_report_extractions enable row level security;

drop policy if exists "lab_report_extractions_insert_own" on public.lab_report_extractions;
create policy "lab_report_extractions_insert_own"
  on public.lab_report_extractions for insert
  with check (
    exists (
      select 1 from public.lab_report_uploads u
      where u.id = lab_report_extractions.upload_id
        and u.patient_id = auth.uid()
    )
  );

drop policy if exists "lab_report_extractions_select_own" on public.lab_report_extractions;
create policy "lab_report_extractions_select_own"
  on public.lab_report_extractions for select
  using (
    exists (
      select 1
      from public.lab_report_uploads r
      where r.id = lab_report_extractions.upload_id
        and (
          r.patient_id = auth.uid()
          or exists (
            select 1 from public.care_relationships c
            where c.patient_id = r.patient_id
              and c.doctor_id = auth.uid()
          )
        )
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
        and (
          r.patient_id = auth.uid()
          or exists (
            select 1 from public.care_relationships c
            where c.patient_id = r.patient_id
              and c.doctor_id = auth.uid()
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.lab_report_uploads r
      where r.id = lab_report_extractions.upload_id
        and (
          r.patient_id = auth.uid()
          or exists (
            select 1 from public.care_relationships c
            where c.patient_id = r.patient_id
              and c.doctor_id = auth.uid()
          )
        )
    )
  );

-- 7. Lab panels RLS policies
alter table public.lab_panels enable row level security;

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

-- 8. Storage bucket & policies for lab reports
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lab-reports',
  'lab-reports',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "lab_reports_storage_insert" on storage.objects;
create policy "lab_reports_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'lab-reports'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "lab_reports_storage_select" on storage.objects;
create policy "lab_reports_storage_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'lab-reports'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or exists (
        select 1 from public.care_relationships c
        where c.patient_id::text = split_part(name, '/', 1)
          and c.doctor_id = auth.uid()
      )
    )
  );

drop policy if exists "lab_reports_storage_update" on storage.objects;
create policy "lab_reports_storage_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'lab-reports'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'lab-reports'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "lab_reports_storage_delete" on storage.objects;
create policy "lab_reports_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'lab-reports'
    and split_part(name, '/', 1) = auth.uid()::text
  );
