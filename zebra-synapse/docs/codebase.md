# Zebra Synapse Codebase Guide

This document describes how Zebra Synapse is organized and where to make changes safely during continued development.

## Application Structure

Top-level folders:

- `src/app`: routes, layouts, feature pages, and reusable UI wrappers
- `src/auth`: authentication context and shared auth types
- `src/hooks`: data hooks for uploads and lab panel reads
- `src/lib`: Supabase helpers, domain models, and clinical business logic
- `src/styles`: theme tokens, fonts, and global styling
- `supabase/migrations`: schema migrations applied in order
- `supabase`: local Supabase configuration and seed helpers

## Entry Points

### `src/main.tsx`

- boots the React app
- imports shared styles

### `src/app/App.tsx`

- mounts auth context
- mounts the router
- mounts toast notifications

### `src/app/routes.tsx`

Defines the public, patient, and doctor routes for the application.

## Core Feature Areas

### Authentication

Files:

- `src/auth/AuthContext.tsx`
- `src/auth/types.ts`
- `src/lib/supabase.ts`
- `src/lib/authErrors.ts`

Responsibilities:

- session bootstrap
- role-aware portal routing
- profile loading from `profiles`
- auth redirect URL handling

### Doctor Workflow

Files:

- `src/app/pages/doctor/DoctorDashboard.tsx`
- `src/app/pages/doctor/PatientsList.tsx`
- `src/app/pages/doctor/PatientDetail.tsx`
- `src/app/pages/doctor/LinkPatientDialog.tsx`
- `src/lib/careRelationships.ts`
- `src/lib/prescriptions.ts`
- `src/lib/careActions.ts`

Responsibilities:

- linked patient management
- prescription authoring
- clinical note capture
- persisted quick actions such as follow-ups, lab requests, referrals, messages, and generated reports

### Patient Workflow

Files:

- `src/app/pages/patient/PatientDashboard.tsx`
- `src/app/pages/patient/PatientHome.tsx`
- `src/app/pages/patient/MedicalRecords.tsx`
- `src/app/pages/patient/Prescription.tsx`
- `src/hooks/usePatientLabReports.ts`
- `src/hooks/usePatientLabPanels.ts`

Responsibilities:

- report upload and history
- structured lab panel review
- prescription visibility
- insight-oriented dashboards

### Lab Parsing and Insights

Files:

- `src/lib/labReportExtraction.ts`
- `src/lib/biomarkerCatalog.ts`
- `src/lib/labPanels.ts`
- `src/lib/labInsights.ts`

Responsibilities:

- browser-side PDF text extraction
- biomarker normalization
- structured panel persistence
- rule-based insight generation for doctor and patient views

## Database Model

Primary tables:

- `profiles`
- `care_relationships`
- `prescriptions`
- `lab_report_uploads`
- `lab_panels`
- `care_actions`

Storage:

- Supabase Storage bucket `lab-reports`

## Migrations

Migrations are applied in numeric order from `supabase/migrations`.

Current sequence:

1. `001_profiles.sql`
2. `002_care_relationships.sql`
3. `003_prescriptions.sql`
4. `004_lab_reports.sql`
5. `005_lab_panels.sql`
6. `006_lab_panel_biomarkers.sql`
7. `007_profiles_select_linked_users.sql`
8. `008_care_actions.sql`

## Verification

Useful checks before pushing:

- `npm run typecheck`
- `npm run build`
- `npm run check`

Manual smoke checks:

- patient signup and login
- doctor signup and login
- lab report upload
- patient detail quick actions and care activity feed
- prescription create and patient-side visibility
