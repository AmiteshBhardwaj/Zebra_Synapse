# Demo Guide

This document gives judges a fast path to evaluating Zebra Synapse.

## Demo Link

- YouTube video: https://youtu.be/xa0-ucu9rgE?si=y67QKcMFRMQ1W2ej
- Live deployment: https://zebrasynapse.vercel.app/

## Setup Steps

1. Open `zebra-synapse`.
2. Run `npm install`.
3. Configure environment variables from `.env.example`.
4. Apply the ordered migrations in `supabase/migrations/001_profiles.sql` through `012_medical_record_corpus.sql`.
5. If you want the seeded demo network, run `supabase/migrations/seed_doctors_patients.sql` after the base migrations are applied.
6. If you want a deterministic AI-risk verification patient, run `supabase/seed_ai_risk_verification.sql`.
7. Start the app with `npm run dev`.

## Seed Demo Accounts

The repository includes a seeded demo network with 10 doctors and 50 patients. Each doctor is linked to 5 patients.

Shared password for all seeded accounts:

```text
SeedPassword123!
```

Example doctor accounts:

- `zebra-seed-doctor-1@example.test` -> Dr. Amelia Hart
- `zebra-seed-doctor-2@example.test` -> Dr. Benjamin Ortiz
- `zebra-seed-doctor-3@example.test` -> Dr. Chloe Menon

Example patient accounts:

- `zebra-seed-patient-1@example.test` -> Maya Thompson
- `zebra-seed-patient-3@example.test` -> Sofia Bennett
- `zebra-seed-patient-10@example.test` -> Lucas Reed

Doctor to patient mapping:

- Patients `1-5` are linked to Doctor `1`
- Patients `6-10` are linked to Doctor `2`
- The same pattern continues through Patient `50` and Doctor `10`

## Demo Flow

1. Sign in as `zebra-seed-doctor-1@example.test` to show the doctor dashboard and linked patient list.
2. Open one of Doctor 1's patients, such as `zebra-seed-patient-1@example.test` or `zebra-seed-patient-3@example.test`.
3. Walk through the doctor patient detail tabs: overview, vitals history, lab results, medications, AI insights, and actions.
4. Save a note, prescription, or quick action to show the persisted care activity timeline.
5. Sign in as a seeded patient account to show the patient-side portal experience.
6. Open medical records, vitals, disease prediction, clinical trials, wellness tips, and prescriptions to show how the patient portal reuses the same structured data.
7. Upload or review a lab report and walk through PDF extraction, structured biomarker output, and generated insights.
8. Demonstrate how doctors and patients share the same underlying clinical record.

## AI Risk Verification Flow

Use this when you want to show the persisted AI-risk path without uploading a new PDF during the demo.

1. Apply `supabase/seed_ai_risk_verification.sql` after the normal seed data.
2. Sign in as `zebra-seed-patient-3@example.test` and open Disease Prediction.
3. Confirm the patient has a structured panel, persisted corpus text, and an AI snapshot can be generated.
4. Sign in as `zebra-seed-doctor-1@example.test`, open the same patient, and confirm the doctor AI insights tab shows the same persisted result with richer metadata.

## Run Commands

```bash
npm install
npm run dev
```

Optional verification:

```bash
npm run check
```

## Sample Output

Judges should expect to see:

- patient and doctor dashboards backed by the same Supabase data model
- doctor-side notes, prescriptions, quick actions, and care activity entries
- lab report history, extracted PDF text, and structured biomarker panel data
- patient insight pages populated from structured records rather than placeholder copy

## Expected Output

The expected experience is a working patient and doctor portal with structured records, uploaded lab reports, actionable insights, and persistent care workflows backed by Supabase.

## Demo Notes

- The app is built as a static React frontend with Supabase-backed data services.
- Environment variables are required for Supabase connectivity.
- Local Supabase support is available through the provided npm scripts.
- Seed account definitions live in `supabase/migrations/seed_doctors_patients.sql`.
- If `008_care_actions.sql` is missing, doctor notes, quick actions, and care activity will not work.
- If `005_lab_panels.sql` or later migrations are missing, patient insight pages will load with limited or empty data.
