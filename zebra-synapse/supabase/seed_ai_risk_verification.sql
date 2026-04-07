-- Seed one reproducible AI-risk verification record set on top of seed_doctors_patients.sql.
-- Target patient: zebra-seed-patient-3@example.test
-- Linked doctor: zebra-seed-doctor-1@example.test
--
-- This creates:
-- - one lab_report_uploads row
-- - one lab_panels row
-- - one medical_record_corpus row
--
-- After applying, sign in as the seeded patient or linked doctor and open the AI insight views.

begin;

with target_patient as (
  select id
  from auth.users
  where email = 'zebra-seed-patient-3@example.test'
),
existing_upload as (
  select l.id
  from public.lab_report_uploads l
  join target_patient p on p.id = l.patient_id
  where l.original_filename = 'seed-ai-risk-patient-3.pdf'
),
removed_corpus as (
  delete from public.medical_record_corpus
  where upload_id in (select id from existing_upload)
  returning upload_id
),
removed_panel as (
  delete from public.lab_panels
  where upload_id in (select id from existing_upload)
  returning upload_id
),
removed_upload as (
  delete from public.lab_report_uploads
  where id in (select id from existing_upload)
  returning patient_id
),
inserted_upload as (
  insert into public.lab_report_uploads (
    patient_id,
    storage_path,
    original_filename
  )
  select
    p.id,
    p.id::text || '/seed-ai-risk-patient-3.pdf',
    'seed-ai-risk-patient-3.pdf'
  from target_patient p
  returning id, patient_id
),
inserted_panel as (
  insert into public.lab_panels (
    patient_id,
    upload_id,
    recorded_at,
    biomarkers,
    hemoglobin_a1c,
    fasting_glucose,
    total_cholesterol,
    ldl,
    hdl,
    triglycerides,
    hemoglobin,
    wbc,
    platelets,
    creatinine,
    notes
  )
  select
    u.patient_id,
    u.id,
    current_date - 2,
    jsonb_build_object(
      'hemoglobin_a1c', 6.8,
      'fasting_glucose', 142,
      'ldl', 168,
      'hdl', 38,
      'triglycerides', 214,
      'hemoglobin', 10.9,
      'wbc', 3900,
      'platelets', 146000,
      'creatinine', 1.42,
      'esr', 34,
      'microalbumin_urine', 42.1
    )::jsonb,
    6.8,
    142,
    248,
    168,
    38,
    214,
    10.9,
    3900,
    146000,
    1.42,
    'Seeded verification panel for AI-risk inference.'
  from inserted_upload u
  returning upload_id
)
insert into public.medical_record_corpus (
  patient_id,
  upload_id,
  file_name,
  text
)
select
  u.patient_id,
  u.id,
  'seed-ai-risk-patient-3.pdf',
  'Patient reports fatigue, swollen joints, intermittent rash, and foamy urine.
   Recent follow-up notes mention arthralgia, malaise, and kidney involvement.
   Clinician is reviewing persistent cytopenias, elevated ESR, and worsening glucose control.
   The chart also mentions recurrent abdominal pain, neuropathy, and two emergency visits over the last year.'
from inserted_upload u;

commit;
