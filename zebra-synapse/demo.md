# Demo Guide

This file is judge-facing demo guidance only. For setup and deployment, use [`README.md`](./README.md).

## Demo Link

- YouTube video: https://youtu.be/xa0-ucu9rgE?si=y67QKcMFRMQ1W2ej
- Live deployment: https://zebrasynapse.vercel.app/

## Demo Assets

- Submission screenshots live in [`screenshots/`](./screenshots).
- Screenshot index and naming guidance live in [`screenshots/README.md`](./screenshots/README.md).

## Fast Demo Setup

1. Follow local setup in [`README.md`](./README.md).
2. If you want seeded local demo data, apply base migrations first, then run `supabase/migrations/seed_doctors_patients.sql`.
3. Start the app with `npm run dev`.

## Seed Demo Accounts

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

## Demo Flow

1. Sign in as `zebra-seed-doctor-1@example.test`.
2. Open one of Doctor 1's linked patients.
3. Walk doctor tabs: overview, vitals, labs, medications, insights, actions.
4. Save a note, prescription, or quick action to show persisted care activity.
5. Sign in as a seeded patient.
6. Show records, uploads, prescriptions, and insight pages.
7. Demonstrate lab upload or extraction review flow.
8. Show that doctor and patient views share the same clinical record.

## Judge Expectations

- shared patient and doctor workflows over one Supabase data model
- persisted notes, prescriptions, and care actions
- lab report history, extraction drafts, and published biomarker panels
- patient insight pages grounded in structured records rather than placeholder content
