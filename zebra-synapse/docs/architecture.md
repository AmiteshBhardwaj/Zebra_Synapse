# Zebra Synapse Architecture

Zebra Synapse is a Vite-powered React SPA backed by Supabase for authentication, relational data, and file storage. It combines patient and doctor workflows, uploaded report extraction, structured biomarker persistence, and deterministic health insight generation.

## System Components

- Frontend SPA: React + TypeScript application for both patient and doctor portals
- Auth layer: Supabase Auth for signup, login, session persistence, and role-aware access
- Clinical data layer: Supabase tables for profiles, care relationships, prescriptions, lab uploads, lab panels, and care actions
- File ingestion layer: browser-side PDF parsing with `pdfjs-dist` plus extracted-text persistence
- Insight engine: deterministic rule-based interpretation of structured biomarker data and extracted report content

## Data Flow

1. A patient or doctor signs in through Supabase Auth.
2. The app loads the corresponding profile and route guards send the user to the correct portal.
3. Patients upload lab reports or doctors open linked patient charts.
4. PDF files are stored in Supabase Storage and parsed in the browser.
5. Structured biomarker data is written to `lab_panels` and reused across dashboards and insight screens.
6. Doctors add prescriptions, notes, and quick actions that persist in Supabase through `care_actions`.
7. Patient insight pages and doctor chart views render summaries from the latest shared clinical data.

## Design Goals

- keep the frontend deployable as a static app
- keep authentication and access control enforceable through Supabase RLS
- keep clinical insight logic explainable for demos and hackathon judging
- keep developer onboarding simple through committed docs and reproducible local setup
