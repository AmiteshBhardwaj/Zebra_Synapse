# Zebra Synapse Architecture

Zebra Synapse is a Vite-powered React SPA backed by Supabase for authentication, relational data, and file storage.

## System Components

- Frontend SPA: React + TypeScript application for patient and doctor workflows
- Auth layer: Supabase Auth for signup, login, session persistence, and role-aware access
- Clinical data layer: Supabase tables for profiles, care relationships, prescriptions, lab uploads, lab panels, and care actions
- File ingestion layer: browser-side PDF parsing with `pdfjs-dist`
- Insight engine: deterministic rule-based interpretation of structured biomarker data

## Data Flow

1. A user signs in through the doctor or patient portal.
2. Supabase Auth establishes the session and the app loads the corresponding profile.
3. Patients upload lab reports or doctors review linked patient records.
4. PDF text is parsed client-side and normalized into structured biomarker data.
5. Structured data is stored in `lab_panels` and reused across dashboards and insight views.
6. Doctors can add prescriptions, clinical notes, and quick actions that persist in Supabase.
7. The UI renders rule-based summaries from the latest clinical data.

## Design Goals

- keep the frontend deployable as a static app
- keep authentication and access control enforceable through Supabase RLS
- keep clinical insight logic explainable for demos and hackathon judging
- keep developer onboarding simple through committed docs and reproducible local setup
