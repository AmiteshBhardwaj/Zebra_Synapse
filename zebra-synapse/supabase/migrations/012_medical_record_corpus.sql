-- Persist sanitized extracted PDF text so inference can read text features server-side.

create table if not exists public.medical_record_corpus (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  upload_id uuid not null references public.lab_report_uploads (id) on delete cascade,
  file_name text not null,
  text text not null,
  char_count integer not null default 0 check (char_count >= 0),
  created_at timestamptz not null default now(),
  constraint medical_record_corpus_upload_unique unique (upload_id)
);

create index if not exists medical_record_corpus_patient_created_idx
  on public.medical_record_corpus (patient_id, created_at desc);

alter table public.medical_record_corpus enable row level security;
alter table public.medical_record_corpus force row level security;

drop policy if exists "medical_record_corpus_select_participant" on public.medical_record_corpus;
create policy "medical_record_corpus_select_participant"
  on public.medical_record_corpus for select
  using (
    auth.uid() = patient_id
    or exists (
      select 1
      from public.care_relationships c
      where c.patient_id = medical_record_corpus.patient_id
        and c.doctor_id = auth.uid()
    )
  );

drop policy if exists "medical_record_corpus_insert_own" on public.medical_record_corpus;
create policy "medical_record_corpus_insert_own"
  on public.medical_record_corpus for insert
  with check (
    auth.uid() = patient_id
    and exists (
      select 1
      from public.lab_report_uploads r
      where r.id = medical_record_corpus.upload_id
        and r.patient_id = auth.uid()
    )
  );

drop policy if exists "medical_record_corpus_update_own" on public.medical_record_corpus;
create policy "medical_record_corpus_update_own"
  on public.medical_record_corpus for update
  using (auth.uid() = patient_id)
  with check (auth.uid() = patient_id);

create or replace function public.validate_medical_record_corpus_row()
returns trigger
language plpgsql
as $$
declare
  upload_patient_id uuid;
begin
  if not public.is_patient_profile(new.patient_id) then
    raise exception 'patient_id must reference a patient profile';
  end if;

  select patient_id
  into upload_patient_id
  from public.lab_report_uploads
  where id = new.upload_id;

  if upload_patient_id is null then
    raise exception 'upload_id must reference an existing lab report upload';
  end if;

  if upload_patient_id <> new.patient_id then
    raise exception 'upload_id must belong to the same patient';
  end if;

  new.file_name := nullif(left(trim(coalesce(new.file_name, '')), 180), '');
  if new.file_name is null then
    raise exception 'file_name is required';
  end if;

  new.text := left(trim(coalesce(new.text, '')), 12000);
  new.char_count := char_length(new.text);

  if new.char_count < 60 then
    raise exception 'medical record corpus text is too short to persist';
  end if;

  if tg_op = 'UPDATE' then
    if new.patient_id <> old.patient_id then
      raise exception 'patient_id is immutable';
    end if;

    if new.upload_id <> old.upload_id then
      raise exception 'upload_id is immutable';
    end if;

    if new.created_at <> old.created_at then
      raise exception 'created_at is immutable';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_medical_record_corpus_row on public.medical_record_corpus;
create trigger validate_medical_record_corpus_row
  before insert or update on public.medical_record_corpus
  for each row execute function public.validate_medical_record_corpus_row();

drop trigger if exists audit_medical_record_corpus_phi_mutation on public.medical_record_corpus;
create trigger audit_medical_record_corpus_phi_mutation
  after insert or update or delete on public.medical_record_corpus
  for each row execute function public.audit_phi_mutation();
