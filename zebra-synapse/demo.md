# Demo Guide

This document gives judges a fast path to evaluating Zebra Synapse.

## Demo Link

- YouTube video: https://youtu.be/xa0-ucu9rgE?si=y67QKcMFRMQ1W2ej
- Live deployment: https://zebrasynapse.vercel.app/

## Setup Steps

1. Open `zebra-synapse`.
2. Run `npm install`.
3. Configure environment variables from `.env.example`.
4. If you want the seeded demo network, run the SQL in `supabase/migrations/seed_doctors_patients.sql` after the base migrations are applied.
5. Start the app with `npm run dev`.

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
3. Show the patient’s clinical summary, prescriptions, care actions, and structured records.
4. Sign in as a seeded patient account to show the patient-side portal experience.
5. Upload or review a lab report and walk through structured biomarker output and generated insights.
6. Demonstrate how doctors and patients share the same underlying clinical record.

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

- patient and doctor dashboards
- lab report history and structured panel data
- prescription and care action workflows
- insight-oriented summaries derived from uploaded clinical data

## Expected Output

The expected experience is a working patient and doctor portal with structured records, uploaded lab reports, actionable insights, and persistent care workflows backed by Supabase.

## Demo Notes

- The app is built as a static React frontend with Supabase-backed data services.
- Environment variables are required for Supabase connectivity.
- Local Supabase support is available through the provided npm scripts.
- Seed account definitions live in `supabase/migrations/seed_doctors_patients.sql`.
