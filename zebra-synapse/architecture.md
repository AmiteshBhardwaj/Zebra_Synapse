# System Architecture

Zebra Synapse is a single-page React application backed by Supabase. It combines patient and doctor workflows, browser-side report extraction, structured lab persistence, and deterministic health-insight generation.

## Core Components

- **Frontend:** React + TypeScript + Vite application with separate patient and doctor portal flows under one router.
- **Authentication:** Supabase Auth manages signup, login, session persistence, and role-aware route protection.
- **Clinical Data Layer:** Supabase Postgres stores profiles, care relationships, prescriptions, lab uploads, lab panels, and doctor-authored care actions under RLS.
- **Storage Layer:** Supabase Storage holds uploaded lab-report files in patient-scoped paths.
- **Extraction Layer:** PDF.js-based browser extraction reads uploaded reports and attempts to map values into structured biomarkers.
- **Insight Layer:** Deterministic rule engines generate biomarker interpretation, disease-risk assessments, nutrition plans, wellness tips, and trial-search suggestions.

## Main Product Surfaces

- **Patient portal:** health overview, medical records, appointments, vitals, prescriptions, disease prediction, nutrition, clinical trials, wellness tips, and profile settings.
- **Doctor portal:** linked patient list, patient detail workspace, prescriptions, notes, quick actions, care timeline, lab results, vitals snapshot, and chart-grounded insights.

## Data Model

- `profiles`: doctor/patient identity, role, and profile metadata
- `care_relationships`: links a doctor to a patient and stores latest shared clinical snapshot values
- `prescriptions`: doctor-authored medication records for linked patients
- `lab_report_uploads`: uploaded file metadata for patient reports
- `lab_panels`: structured biomarker values extracted from reports
- `care_actions`: follow-ups, notes, messages, referrals, reports, and treatment-plan actions

## Application Flow

1. A patient or doctor signs in through Supabase Auth.
2. Route guards load the signed-in profile and role.
3. Patients upload lab files or doctors open a linked patient chart.
4. Uploaded PDFs are stored in Supabase Storage and parsed in the browser.
5. Extracted biomarker values are persisted into `lab_panels`.
6. Patient insight pages and doctor chart views read from `care_relationships`, `lab_panels`, `lab_report_uploads`, `prescriptions`, and `care_actions`.
7. Deterministic insight functions convert structured data into readable summaries, risk cards, wellness tips, and research prompts.

## Security Model

- Supabase row-level security protects all clinical tables.
- `009_security_hardening.sql` forces RLS on PHI tables and adds auditing.
- `010_security_invariants.sql` adds trigger-based ownership and relationship validation.
- Browser-exposed configuration is limited to `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## External Libraries And Services

- **Supabase:** auth, relational queries, RLS, and storage
- **PDF.js / pdfjs-dist:** client-side PDF extraction
- **Recharts:** visual lab and biomarker insight components

## AI Model Usage

Zebra Synapse does not rely on a black-box diagnostic model in the deployed portal. Instead, it uses deterministic interpretation and scoring logic over structured biomarkers and extracted document text. This keeps the system explainable, reviewable, and more appropriate for a healthcare hackathon workflow.
