# System Architecture

This document is the canonical system-design reference for Zebra Synapse. Setup, deployment, and operations stay in [`README.md`](./README.md). Supplementary development notes stay in [`docs/`](./docs).

## System Overview

Zebra Synapse is a single-page React application backed by Supabase. It unifies patient and doctor workflows, server-side lab-report analysis, structured biomarker persistence, and deterministic clinical insight generation.

## Core Components

- **Frontend:** React, TypeScript, and Vite power patient and doctor portals under one router.
- **Authentication:** Supabase Auth handles signup, login, session persistence, and role-aware access.
- **Clinical Data Layer:** Supabase Postgres stores profiles, care relationships, prescriptions, uploads, panels, and care actions behind RLS.
- **Storage Layer:** Supabase Storage holds patient-scoped lab-report files.
- **Extraction Layer:** Edge Functions analyze uploaded reports with Gemini PDF understanding plus schema-bound extraction, then persist reviewable drafts and trusted biomarker panels.
- **Insight Layer:** Deterministic rule engines translate structured data into summaries, risk views, wellness guidance, and trial-search prompts.

## Product Surfaces

- **Patient portal:** health overview, medical records, prescriptions, uploads, structured lab panels, and insight pages
- **Doctor portal:** linked patient workspace, prescriptions, notes, care activity, lab review, vitals, and chart-grounded insight views

## Data Model

- `profiles`: identity, role, and profile metadata
- `care_relationships`: doctor-patient links and shared clinical snapshot values
- `prescriptions`: doctor-authored medication records
- `lab_report_uploads`: uploaded report metadata
- `lab_report_extractions`: reviewable extraction drafts and analysis state
- `lab_panels`: published biomarker values
- `care_actions`: follow-ups, notes, referrals, messages, reports, and treatment-plan actions

## Application Flow

1. User signs in through Supabase Auth.
2. Route guards load profile and role context.
3. Patient uploads a report or doctor opens a linked patient chart.
4. Uploaded PDFs land in Supabase Storage and queue for server-side analysis.
5. Edge Functions extract biomarkers into `lab_report_extractions` and auto-publish only trusted results.
6. Published values persist into `lab_panels`.
7. Patient pages and doctor chart views read from shared clinical tables.
8. Deterministic insight logic converts structured records into readable clinical summaries.

## Security Model

- Row-level security protects clinical tables.
- `009_security_hardening.sql` forces RLS on PHI tables and adds auditing.
- `010_security_invariants.sql` adds trigger-based ownership and relationship validation.
- Browser-exposed configuration is limited to `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## External Services

- **Supabase:** auth, Postgres, RLS, and storage
- **Gemini:** document understanding for lab-report extraction only
- **PDF.js / pdfjs-dist:** client-side PDF handling where needed
- **Recharts:** visualization of structured health data

## Boundary Rules

- Product runtime lives under `src/`, `public/`, and `supabase/`.
- Research material under [`research/`](./research) is not runtime or deployment-critical.
- Demo assets under [`screenshots/`](./screenshots) are submission support material, not product logic.
