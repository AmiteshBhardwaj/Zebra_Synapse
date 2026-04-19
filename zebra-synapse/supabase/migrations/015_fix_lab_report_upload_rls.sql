-- Fix patient self-service lab upload RLS on hosted projects where policy
-- subqueries against public.profiles can deny valid patient inserts, and
-- where the upload enqueue trigger can fail against RLS-protected jobs.

create or replace function public.is_patient_profile_unchecked(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = profile_id
      and role = 'patient'
  );
$$;

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
