-- Lab report file metadata + Storage bucket for patient uploads (run after 001_profiles).

create table public.lab_report_uploads (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  created_at timestamptz not null default now()
);

create index lab_report_uploads_patient_id_idx on public.lab_report_uploads (patient_id);

alter table public.lab_report_uploads enable row level security;

create policy "lab_report_uploads_select_own"
  on public.lab_report_uploads for select
  using (auth.uid() = patient_id);

create policy "lab_report_uploads_insert_own"
  on public.lab_report_uploads for insert
  with check (
    auth.uid() = patient_id
    and exists (
      select 1 from public.profiles p
      where p.id = patient_id and p.role = 'patient'
    )
  );

create policy "lab_report_uploads_delete_own"
  on public.lab_report_uploads for delete
  using (auth.uid() = patient_id);

create policy "lab_report_uploads_select_caring_doctor"
  on public.lab_report_uploads for select
  using (
    exists (
      select 1 from public.care_relationships c
      where c.patient_id = lab_report_uploads.patient_id
        and c.doctor_id = auth.uid()
    )
  );

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
drop policy if exists "lab_reports_storage_select" on storage.objects;
drop policy if exists "lab_reports_storage_update" on storage.objects;
drop policy if exists "lab_reports_storage_delete" on storage.objects;

create policy "lab_reports_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'lab-reports'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "lab_reports_storage_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'lab-reports'
    and split_part(name, '/', 1) = auth.uid()::text
  );

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

create policy "lab_reports_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'lab-reports'
    and split_part(name, '/', 1) = auth.uid()::text
  );
