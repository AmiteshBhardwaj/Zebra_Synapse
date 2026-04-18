-- Seed cn2.pdf lab data for zebra-seed-patient-1@example.test.
-- This seeds the relational records only. The PDF binary itself is not uploaded by SQL.

do $$
declare
  seed_patient_id uuid;
  seeded_upload_id constant uuid := '7d5d95bb-a9d5-4f11-a7b4-8d0ef43df0dd';
  seeded_created_at constant timestamptz := '2026-04-01T14:33:00+05:30'::timestamptz;
begin
  select u.id
  into seed_patient_id
  from auth.users u
  where u.email = 'zebra-seed-patient-1@example.test';

  if seed_patient_id is null then
    raise exception 'Could not find seed patient 1. Run seed_doctors_patients.sql first.';
  end if;

  insert into public.lab_report_uploads (
    id,
    patient_id,
    storage_path,
    original_filename,
    created_at
  )
  values (
    seeded_upload_id,
    seed_patient_id,
    seed_patient_id::text || '/seed_patient_1_cn2.pdf',
    'cn2.pdf',
    seeded_created_at
  )
  on conflict (id) do nothing;

  insert into public.lab_panels (
    patient_id,
    upload_id,
    recorded_at,
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
    biomarkers,
    notes,
    created_at
  )
  values (
    seed_patient_id,
    seeded_upload_id,
    '2026-04-01'::date,
    7.7,
    161,
    139,
    89.9,
    33,
    82,
    12.7,
    6050,
    267000,
    0.62,
    '{
      "hemoglobin": 12.7,
      "hematocrit": 35.6,
      "rbc_count": 4.46,
      "mcv": 79.9,
      "mch": 28.4,
      "mchc": 35.5,
      "wbc": 6050,
      "neutrophils_percent": 50.5,
      "lymphocytes_percent": 45.4,
      "eosinophils_percent": 1.2,
      "monocytes_percent": 1.9,
      "basophils_percent": 1,
      "absolute_neutrophil_count": 3055.25,
      "absolute_lymphocyte_count": 2746.7,
      "absolute_eosinophil_count": 72.6,
      "absolute_monocyte_count": 114.95,
      "absolute_basophil_count": 60.5,
      "platelets": 267000,
      "mpv": 10.5,
      "fasting_glucose": 161,
      "hemoglobin_a1c": 7.7,
      "mean_blood_glucose": 174,
      "total_cholesterol": 139,
      "triglycerides": 82,
      "hdl": 33,
      "ldl": 89.9,
      "vldl": 16.4,
      "chol_hdl_ratio": 4.25,
      "total_bilirubin": 0.21,
      "conjugated_bilirubin": 0.05,
      "unconjugated_bilirubin": 0.16,
      "sgpt": 10,
      "sgot": 22,
      "total_protein": 6.51,
      "albumin": 3.68,
      "globulin": 2.83,
      "ag_ratio": 1.3,
      "creatinine": 0.62,
      "urea": 17,
      "blood_urea_nitrogen": 7.9,
      "uric_acid": 2.61,
      "calcium": 9.1,
      "sodium": 135.38,
      "potassium": 3.9,
      "chloride": 103.51,
      "iron": 46,
      "tibc": 269,
      "transferrin_saturation": 17.1,
      "tsh": 0.508,
      "vitamin_d_25_oh": 44.49,
      "vitamin_b12": 229
    }'::jsonb,
    'Seeded from cn2.pdf for demo patient 1. Values were extracted from the provided lab report and should be reviewed if the seed dataset changes.',
    seeded_created_at
  )
  on conflict (upload_id) do update
  set
    recorded_at = excluded.recorded_at,
    hemoglobin_a1c = excluded.hemoglobin_a1c,
    fasting_glucose = excluded.fasting_glucose,
    total_cholesterol = excluded.total_cholesterol,
    ldl = excluded.ldl,
    hdl = excluded.hdl,
    triglycerides = excluded.triglycerides,
    hemoglobin = excluded.hemoglobin,
    wbc = excluded.wbc,
    platelets = excluded.platelets,
    creatinine = excluded.creatinine,
    biomarkers = excluded.biomarkers,
    notes = excluded.notes;
end
$$;
