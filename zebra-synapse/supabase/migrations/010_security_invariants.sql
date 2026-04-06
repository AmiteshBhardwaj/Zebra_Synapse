-- Enforce ownership and relationship invariants for clinical records.

create or replace function public.is_doctor_profile(profile_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = profile_id and role = 'doctor'
  );
$$;

create or replace function public.is_patient_profile(profile_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = profile_id and role = 'patient'
  );
$$;

create or replace function public.has_care_relationship(doctor_profile_id uuid, patient_profile_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.care_relationships
    where doctor_id = doctor_profile_id
      and patient_id = patient_profile_id
  );
$$;

create or replace function public.validate_care_relationship_row()
returns trigger
language plpgsql
as $$
begin
  if new.doctor_id = new.patient_id then
    raise exception 'doctor_id and patient_id must be distinct';
  end if;

  if not public.is_doctor_profile(new.doctor_id) then
    raise exception 'doctor_id must reference a doctor profile';
  end if;

  if not public.is_patient_profile(new.patient_id) then
    raise exception 'patient_id must reference a patient profile';
  end if;

  if tg_op = 'UPDATE' then
    if new.doctor_id <> old.doctor_id then
      raise exception 'doctor_id is immutable';
    end if;

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

drop trigger if exists validate_care_relationship_row on public.care_relationships;
create trigger validate_care_relationship_row
  before insert or update on public.care_relationships
  for each row execute function public.validate_care_relationship_row();

create or replace function public.validate_prescription_row()
returns trigger
language plpgsql
as $$
begin
  if not public.is_doctor_profile(new.prescribed_by) then
    raise exception 'prescribed_by must reference a doctor profile';
  end if;

  if not public.is_patient_profile(new.patient_id) then
    raise exception 'patient_id must reference a patient profile';
  end if;

  if not public.has_care_relationship(new.prescribed_by, new.patient_id) then
    raise exception 'doctor must be linked to patient before writing prescriptions';
  end if;

  if tg_op = 'UPDATE' then
    if new.prescribed_by <> old.prescribed_by then
      raise exception 'prescribed_by is immutable';
    end if;

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

drop trigger if exists validate_prescription_row on public.prescriptions;
create trigger validate_prescription_row
  before insert or update on public.prescriptions
  for each row execute function public.validate_prescription_row();

create or replace function public.validate_care_action_row()
returns trigger
language plpgsql
as $$
begin
  if new.doctor_id = new.patient_id then
    raise exception 'doctor_id and patient_id must be distinct';
  end if;

  if not public.is_doctor_profile(new.doctor_id) then
    raise exception 'doctor_id must reference a doctor profile';
  end if;

  if not public.is_patient_profile(new.patient_id) then
    raise exception 'patient_id must reference a patient profile';
  end if;

  if not public.has_care_relationship(new.doctor_id, new.patient_id) then
    raise exception 'doctor must be linked to patient before writing care actions';
  end if;

  if tg_op = 'UPDATE' then
    if new.doctor_id <> old.doctor_id then
      raise exception 'doctor_id is immutable';
    end if;

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

drop trigger if exists validate_care_action_row on public.care_actions;
create trigger validate_care_action_row
  before insert or update on public.care_actions
  for each row execute function public.validate_care_action_row();

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

create or replace function public.validate_lab_report_upload_row()
returns trigger
language plpgsql
as $$
begin
  if new.patient_id is null then
    raise exception 'patient_id is required';
  end if;

  if not public.is_patient_profile(new.patient_id) then
    raise exception 'patient_id must reference a patient profile';
  end if;

  if new.storage_path !~ ('^' || new.patient_id::text || '/[A-Za-z0-9._() +\\-]+$') then
    raise exception 'storage_path must stay inside the patient namespace';
  end if;

  new.original_filename := nullif(left(trim(coalesce(new.original_filename, '')), 180), '');
  if new.original_filename is null then
    raise exception 'original_filename is required';
  end if;

  if tg_op = 'UPDATE' then
    if new.patient_id <> old.patient_id then
      raise exception 'patient_id is immutable';
    end if;

    if new.storage_path <> old.storage_path then
      raise exception 'storage_path is immutable';
    end if;

    if new.created_at <> old.created_at then
      raise exception 'created_at is immutable';
    end if;
  end if;

  return new;
end;
$$;
