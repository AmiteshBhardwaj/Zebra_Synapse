-- Security hardening pass for PHI-bearing tables.
-- Apply after the existing schema migrations.

create or replace function public.normalize_profile_record()
returns trigger
language plpgsql
as $$
begin
  new.full_name := nullif(left(trim(coalesce(new.full_name, '')), 120), '');
  new.license_number := nullif(upper(left(trim(coalesce(new.license_number, '')), 40)), '');
  return new;
end;
$$;

drop trigger if exists normalize_profile_record on public.profiles;
create trigger normalize_profile_record
  before insert or update on public.profiles
  for each row execute function public.normalize_profile_record();

create or replace function public.protect_profile_security_fields()
returns trigger
language plpgsql
as $$
begin
  if new.id <> old.id then
    raise exception 'profile id is immutable';
  end if;

  if new.role <> old.role then
    raise exception 'profile role cannot be changed';
  end if;

  if new.created_at <> old.created_at then
    raise exception 'profile creation timestamp is immutable';
  end if;

  if auth.uid() = old.id and new.license_number is distinct from old.license_number then
    raise exception 'license number changes require administrator review';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_security_fields on public.profiles;
create trigger protect_profile_security_fields
  before update on public.profiles
  for each row execute function public.protect_profile_security_fields();

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.validate_lab_report_upload_row()
returns trigger
language plpgsql
as $$
begin
  if new.patient_id is null then
    raise exception 'patient_id is required';
  end if;

  if new.storage_path !~ ('^' || new.patient_id::text || '/[A-Za-z0-9._() +\\-]+$') then
    raise exception 'storage_path must stay inside the patient namespace';
  end if;

  new.original_filename := nullif(left(trim(coalesce(new.original_filename, '')), 180), '');
  if new.original_filename is null then
    raise exception 'original_filename is required';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_lab_report_upload_row on public.lab_report_uploads;
create trigger validate_lab_report_upload_row
  before insert or update on public.lab_report_uploads
  for each row execute function public.validate_lab_report_upload_row();

create table if not exists public.security_audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  operation text not null,
  table_name text not null,
  row_id text not null,
  details jsonb not null default '{}'::jsonb
);

create index if not exists security_audit_log_occurred_at_idx
  on public.security_audit_log (occurred_at desc);

create index if not exists security_audit_log_actor_id_idx
  on public.security_audit_log (actor_id, occurred_at desc);

alter table public.security_audit_log enable row level security;
alter table public.security_audit_log force row level security;

create or replace function public.audit_phi_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  record_id text;
  payload jsonb;
begin
  if tg_op = 'DELETE' then
    record_id := coalesce(old.id::text, old.patient_id::text, old.doctor_id::text, 'unknown');
    payload := jsonb_build_object('before', to_jsonb(old));
  else
    record_id := coalesce(new.id::text, new.patient_id::text, new.doctor_id::text, 'unknown');
    payload := jsonb_build_object('after', to_jsonb(new));
    if tg_op = 'UPDATE' then
      payload := payload || jsonb_build_object('before', to_jsonb(old));
    end if;
  end if;

  insert into public.security_audit_log (actor_id, operation, table_name, row_id, details)
  values (auth.uid(), tg_op, tg_table_name, record_id, payload);

  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_profiles_phi_mutation on public.profiles;
create trigger audit_profiles_phi_mutation
  after update on public.profiles
  for each row execute function public.audit_phi_mutation();

drop trigger if exists audit_care_relationships_phi_mutation on public.care_relationships;
create trigger audit_care_relationships_phi_mutation
  after insert or update or delete on public.care_relationships
  for each row execute function public.audit_phi_mutation();

drop trigger if exists audit_prescriptions_phi_mutation on public.prescriptions;
create trigger audit_prescriptions_phi_mutation
  after insert or update or delete on public.prescriptions
  for each row execute function public.audit_phi_mutation();

drop trigger if exists audit_lab_report_uploads_phi_mutation on public.lab_report_uploads;
create trigger audit_lab_report_uploads_phi_mutation
  after insert or update or delete on public.lab_report_uploads
  for each row execute function public.audit_phi_mutation();

drop trigger if exists audit_lab_panels_phi_mutation on public.lab_panels;
create trigger audit_lab_panels_phi_mutation
  after insert or update or delete on public.lab_panels
  for each row execute function public.audit_phi_mutation();

drop trigger if exists audit_care_actions_phi_mutation on public.care_actions;
create trigger audit_care_actions_phi_mutation
  after insert or update or delete on public.care_actions
  for each row execute function public.audit_phi_mutation();

alter table public.profiles force row level security;
alter table public.care_relationships force row level security;
alter table public.prescriptions force row level security;
alter table public.lab_report_uploads force row level security;
alter table public.lab_panels force row level security;
alter table public.care_actions force row level security;
