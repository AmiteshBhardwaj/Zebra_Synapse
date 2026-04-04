alter table public.lab_panels
  add column if not exists biomarkers jsonb not null default '{}'::jsonb;

update public.lab_panels
set biomarkers = jsonb_strip_nulls(
  coalesce(biomarkers, '{}'::jsonb) ||
  jsonb_build_object(
    'hemoglobin_a1c', hemoglobin_a1c,
    'fasting_glucose', fasting_glucose,
    'total_cholesterol', total_cholesterol,
    'ldl', ldl,
    'hdl', hdl,
    'triglycerides', triglycerides,
    'hemoglobin', hemoglobin,
    'wbc', wbc,
    'platelets', platelets,
    'creatinine', creatinine
  )
)
where biomarkers = '{}'::jsonb
   or biomarkers is null;
