-- Remove all seeded/demo data for zebra-seed-patient-1@example.test
-- except the seeded cn2.pdf medical report and its linked structured panel.

do $$
declare
  seed_patient_id uuid;
  seeded_upload_id constant uuid := '7d5d95bb-a9d5-4f11-a7b4-8d0ef43df0dd';
begin
  select u.id
  into seed_patient_id
  from auth.users u
  where u.email = 'zebra-seed-patient-1@example.test';

  if seed_patient_id is null then
    raise exception 'Could not find seed patient 1. Run seed_doctors_patients.sql first.';
  end if;

  delete from public.care_actions
  where patient_id = seed_patient_id;

  delete from public.prescriptions
  where patient_id = seed_patient_id;

  delete from public.care_relationships
  where patient_id = seed_patient_id;

  delete from public.lab_panels
  where patient_id = seed_patient_id
    and (upload_id is distinct from seeded_upload_id);

  delete from public.lab_report_uploads
  where patient_id = seed_patient_id
    and id <> seeded_upload_id;
end
$$;
