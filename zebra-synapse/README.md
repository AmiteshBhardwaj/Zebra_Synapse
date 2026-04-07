# Zebra Synapse

## Project Submission

**Project Name:** Zebra Synapse  
**Team Members:** Amitesh Bhardwaj, Kartikeya Verma, Tania Bhola, T Sanjana
**Track:** Healthcare AI / Digital Health

## Project Overview

Zebra Synapse is an AI-assisted digital health platform that helps patients and doctors work from the same structured view of clinical data. The platform supports secure authentication, patient-doctor linking, prescription tracking, care actions, lab report uploads, structured biomarker panels, and insight generation from medical records. Instead of leaving health data fragmented across files and portals, Zebra Synapse converts reports into organized biomarker panels and turns them into actionable summaries for both care teams and patients.

The core value of the product is speed-to-understanding. Patients can upload lab reports, review prescriptions, inspect biomarker-driven medical records, and open disease prediction, clinical trial, wellness, nutrition, and vitals views that are now tied to structured data instead of demo placeholders. Doctors can review linked patient records, document notes and follow-ups, manage prescriptions, inspect patient lab history, and view chart-grounded insight cards. This creates a practical workflow layer between raw health records and day-to-day clinical action.

## Project Description

Zebra Synapse is built to reduce the gap between raw healthcare data and practical clinical decision-making. The platform combines patient and doctor workflows in one system so both sides can access structured records, prescriptions, lab history, and follow-up actions from a shared source of truth. By transforming uploaded reports into readable biomarker panels and explainable insights, the product makes health data easier to understand, easier to act on, and more useful in real care journeys.

## Architecture

- **Frontend:** React, TypeScript, Vite, Radix UI, Tailwind-based styling
- **Backend:** Supabase Auth, Postgres, Storage, and row-level security
- **Clinical Data Pipeline:** Browser-side PDF parsing, biomarker normalization, structured lab panel persistence, PDF text extraction, and deterministic insight generation

See [architecture.md](./architecture.md) for the full system breakdown.

## Demo
Demo video - https://youtu.be/xa0-ucu9rgE?si=y67QKcMFRMQ1W2ej


See [demo.md](./demo.md) for demo flow, setup, and what judges should inspect. Add your Loom or YouTube demo link at the top of that file before final submission.

## Pre-Submission Checklist

- [x] Code is organized inside this submission package
- [x] Dependencies are documented in [`tooling-requirements.md`](./tooling-requirements.md)
- [x] Environment variables are documented in [`.env.example`](./.env.example)
- [x] Screenshots folder is included in [`screenshots/`](./screenshots)
- [x] Local run instructions are included below
- [x] System architecture is documented
- [x] Demo guidance is included

## How to Run Locally

1. `cd zebra-synapse`
2. `npm install`
3. Copy `.env.example` to `.env` or run `npm run env:local` after starting local Supabase
4. `npm run dev`

If you want the full seeded demo network locally:

1. Start local Supabase with `npm run supabase:start`
2. Apply the migrations in [`supabase/migrations/`](./supabase/migrations/)
3. Run [`seed_doctors_patients.sql`](./supabase/migrations/seed_doctors_patients.sql)

## Deploy on Vercel

1. Import the repository into Vercel.
2. Set `Root Directory` to `zebra-synapse`.
3. Use these Vercel build settings:
   - `Framework Preset`: `Vite`
   - `Install Command`: `npm ci` or leave it blank
   - `Build Command`: `npm run build` or leave it blank
   - `Output Directory`: `dist`
4. Add these environment variables in Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Optionally add `VITE_SITE_URL=https://<your-deployed-domain>` if you want to force auth redirects to a specific origin. Otherwise the app uses the current browser origin.
6. In Supabase, set the deployed URL in:
   - `Authentication -> URL Configuration -> Site URL`
   - `Authentication -> URL Configuration -> Redirect URLs`
7. Apply the SQL migrations in [`supabase/migrations/`](./supabase/migrations/) to the target Supabase project before testing sign-up, login, prescriptions, lab data flows, or doctor care actions.
8. Trigger a production deployment.

Do not use commands such as `cd zebra-synapse && npm ci` in Vercel. Once the root directory is `zebra-synapse`, Vercel already runs inside that folder.

If you set `VITE_SITE_URL`, it must match an allowed Supabase redirect origin exactly.

## Validation

- `npm run check`
- `npm run build`
- `npm run typecheck`
- `npm run supabase:status` if you are working against local Supabase

## Feature Summary

- **Patient portal:** health overview, medical records, appointments, vitals, prescriptions, disease prediction, nutrition plan, clinical trials, wellness tips, and profile settings
- **Doctor portal:** linked patient list, patient detail workspace, prescriptions, notes, quick actions, lab-result review, vitals snapshot, AI insights, and care activity timeline
- **Insight layer:** deterministic biomarker interpretation, disease risk profiling, nutrition plans, wellness tips, and trial-search prompts derived from structured lab panels and extracted text
- **Data entry:** PDF upload, automatic extraction attempts, manual structured panel persistence, and doctor-authored care actions

## Required Migrations

Apply these in order for a complete deployment:

1. `001_profiles.sql`
2. `002_care_relationships.sql`
3. `003_prescriptions.sql`
4. `004_lab_reports.sql`
5. `005_lab_panels.sql`
6. `006_lab_panel_biomarkers.sql`
7. `007_profiles_select_linked_users.sql`
8. `008_care_actions.sql`
9. `009_security_hardening.sql`
10. `010_security_invariants.sql`

If `008_care_actions.sql` is missing, the doctor portal can still load patient detail basics, but care activity, notes, and quick actions will not work.

## Security Baseline

- Apply [`supabase/migrations/009_security_hardening.sql`](./supabase/migrations/009_security_hardening.sql) and [`supabase/migrations/010_security_invariants.sql`](./supabase/migrations/010_security_invariants.sql) after the existing migrations. Together they add forced RLS on PHI tables, immutable ownership controls, relationship validation, upload path validation, and an audit log for sensitive writes.
- Deploy with the repository `vercel.json` headers intact. They add a restrictive CSP, disable framing, tighten referrer leakage, and enforce HSTS.
- Set Supabase Auth rate limits, bot protection/CAPTCHA, leaked-password protection, and MFA policies in the Supabase dashboard. Those controls are not expressible purely in this repo and should be treated as required production settings.
- Keep the Supabase service role key out of the frontend entirely. Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` belong in browser-exposed env vars.
- If you need longer-lived browser sessions, set `VITE_AUTH_INACTIVITY_TIMEOUT_MS`; otherwise the app now expires inactive sessions after 15 minutes by default.
- Review the repository security workflow and CodeQL alerts in `.github/workflows/security.yml` before merging production changes.

## Key Files

- `src/`: application source
- `supabase/`: schema and migration history
- `ml/`: auxiliary ML experimentation scripts and README
- `package.json`: project scripts and dependencies
- `tooling-requirements.md`: runtime and tooling requirements summary
- `architecture.md`: system design summary
- `demo.md`: demo guide for judges
