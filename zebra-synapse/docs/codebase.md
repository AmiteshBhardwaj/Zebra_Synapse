# Zebra Synapse Codebase Guide

This guide explains where to work safely. Canonical setup and deploy instructions stay in [`../README.md`](../README.md). Canonical system design stays in [`../architecture.md`](../architecture.md).

## Top-Level Ownership

- `src/`: product routes, UI, hooks, and business logic
- `public/`: static assets used by product runtime
- `supabase/`: database schema, migrations, local config, and Edge Functions
- `scripts/`: repeatable tooling scripts
- `docs/`: supplementary development docs
- `research/`: archived experiments and research outputs, not runtime
- `screenshots/`: demo and submission imagery

## Entry Points

- `src/main.tsx`: React bootstrap and global styles
- `src/app/App.tsx`: auth context, router, and toasts
- `src/app/routes.tsx`: public, patient, and doctor route graph

## Feature Areas

### Authentication

- `src/auth/AuthContext.tsx`
- `src/auth/types.ts`
- `src/lib/supabase.ts`
- `src/lib/authErrors.ts`

Use for session bootstrap, role-aware routing, profile loading, and auth redirect handling.

### Doctor Workflow

- `src/app/pages/doctor/`
- `src/lib/careRelationships.ts`
- `src/lib/prescriptions.ts`
- `src/lib/careActions.ts`

Use for linked patient management, prescriptions, notes, and persisted care activity.

### Patient Workflow

- `src/app/pages/patient/`
- `src/hooks/usePatientLabReports.ts`
- `src/hooks/usePatientLabReportExtractions.ts`
- `src/hooks/usePatientLabPanels.ts`

Use for report upload, extraction review, published panel review, prescriptions, and insight screens.

### Lab Analysis and Insights

- `src/lib/labReportAnalysis.ts`
- `src/lib/labPanels.ts`
- `src/lib/labInsights.ts`
- `supabase/functions/_shared/lab-report-analysis.ts`
- `supabase/functions/process-lab-report/`
- `supabase/functions/process-lab-report-queue/`

Use for PDF understanding, biomarker normalization, extraction review, panel persistence, and deterministic interpretation.

## Data Surfaces

Primary tables:

- `profiles`
- `care_relationships`
- `prescriptions`
- `lab_report_uploads`
- `lab_report_extractions`
- `lab_panels`
- `care_actions`

Storage bucket:

- `lab-reports`

## Safe Change Rules

- Do not move runtime code outside `zebra-synapse/`.
- Do not place research artifacts in `src/`, `public/`, or `supabase/`.
- Do not treat `research/` as deployment dependency.
- Keep one concern per change when touching migrations or auth-sensitive code.

## Verification

- `npm run typecheck`
- `npm run build`
- `npm run check`

Manual smoke focus:

- auth for doctor and patient roles
- lab upload and extraction lifecycle
- doctor patient detail actions and timeline
- patient insight screens populated from published lab data
- prescription create and patient visibility
