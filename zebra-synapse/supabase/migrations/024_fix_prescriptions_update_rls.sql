-- 024_fix_prescriptions_update_rls.sql
-- Allow attending care doctors to update and mark completed prescriptions for their linked patients

-- 1. Helper care relationship check must be SECURITY DEFINER to avoid RLS recursion/hiding across doctors
create or replace function public.has_care_relationship(doctor_profile_id uuid, patient_profile_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.care_relationships
    where doctor_id = doctor_profile_id
      and patient_id = patient_profile_id
  );
$$;

-- 2. Prescription validation trigger: only verify care relationship on INSERT, preserve immutability on UPDATE
create or replace function public.validate_prescription_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_doctor_profile(new.prescribed_by) then
    raise exception 'prescribed_by must reference a doctor profile';
  end if;

  if not public.is_patient_profile(new.patient_id) then
    raise exception 'patient_id must reference a patient profile';
  end if;

  if tg_op = 'INSERT' then
    if not public.has_care_relationship(new.prescribed_by, new.patient_id) then
      raise exception 'doctor must be linked to patient before writing prescriptions';
    end if;
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

-- 3. Update and delete RLS policies allowing attending doctors with care relationship to update status
drop policy if exists "prescriptions_update_prescriber" on public.prescriptions;
drop policy if exists "prescriptions_update_doctor" on public.prescriptions;

create policy "prescriptions_update_doctor"
  on public.prescriptions for update
  using (
    prescribed_by = auth.uid()
    or exists (
      select 1 from public.care_relationships c
      where c.doctor_id = auth.uid() and c.patient_id = prescriptions.patient_id
    )
  )
  with check (
    prescribed_by = auth.uid()
    or exists (
      select 1 from public.care_relationships c
      where c.doctor_id = auth.uid() and c.patient_id = prescriptions.patient_id
    )
  );

drop policy if exists "prescriptions_delete_prescriber" on public.prescriptions;
drop policy if exists "prescriptions_delete_doctor" on public.prescriptions;

create policy "prescriptions_delete_doctor"
  on public.prescriptions for delete
  using (
    prescribed_by = auth.uid()
    or exists (
      select 1 from public.care_relationships c
      where c.doctor_id = auth.uid() and c.patient_id = prescriptions.patient_id
    )
  );
