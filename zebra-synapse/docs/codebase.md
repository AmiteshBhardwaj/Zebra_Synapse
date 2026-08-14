# Zebra Synapse — Codebase Navigation & Architecture Map

This guide provides an architectural map of the codebase for developers modifying or extending Zebra Synapse. Canonical setup and operations stay in [`../README.md`](../README.md). Canonical system architecture stays in [`../architecture.md`](../architecture.md).

---

## 1. Top-Level Directory Ownership

- **`src/`:** Production application code (React 18, TypeScript, TailwindCSS v4, Vite 6).
- **`public/`:** Static web assets and demo files.
- **`supabase/`:** Database migrations (001–017), seed data, and Deno Edge Functions.
- **`scripts/`:** Repeatable developer tooling (e.g. `write-local-env.mjs`).
- **`docs/`:** Supplementary documentation, codebase maps, and third-party attributions.
- **`research/`:** Archived multimodal machine learning experiments (MIMIC-IV); not part of runtime or web build.
- **`screenshots/`:** Submission imagery and visual assets.

---

## 2. Core Entry Points

- **`src/main.tsx`:** React DOM bootstrap, root mounting, and global styles import.
- **`src/app/App.tsx`:** Application shell providing `AuthContext`, router outlet, and toast notifications.
- **`src/app/routes.tsx`:** Complete route definition graph for public, patient, and clinician routes.

---

## 3. Feature Area Directory & File Mapping

### Authentication & Authorization
- **`src/auth/AuthContext.tsx`:** Centralized authentication state, login/signup handlers, and demo mode fallback.
- **`src/auth/types.ts`:** User role definitions (`patient`, `doctor`), profile models, and session types.
- **`src/lib/supabase.ts`:** Initialized Supabase client singleton with environment validation.
- **`src/lib/security.ts`:** Inactivity timer tracking (15-min timeout) and password validation rules.
- **`src/lib/authErrors.ts`:** Human-friendly authentication error parsing.
- **`src/app/layouts/RequirePatientPortal.tsx` & `RequireDoctorPortal.tsx`:** Route protection guards.

### Patient Portal & Workspaces
- **`src/app/pages/patient/PatientHome.tsx`:** Patient dashboard with health metrics, active prescriptions, and care action feed.
- **`src/app/pages/patient/MedicalRecordsInsights.tsx`:** Report upload zone, pipeline status indicators, and longitudinal Recharts trends.
- **`src/hooks/useActiveReport.ts`:** Active report state persisted in `sessionStorage` for unified report context across all insight tabs.
- **`src/hooks/usePatientLabReports.ts`:** Real-time fetching of uploaded lab report metadata.
- **`src/hooks/usePatientLabPanels.ts`:** Fetching published biomarker records.
- **`src/hooks/usePatientLabReportExtractions.ts`:** Reviewing extraction drafts and confidence scores.

### Interactive AI Lab Report Chat & Clinician Verification
- **`src/app/pages/patient/PatientLabChat.tsx`:** Conversational lab assistant UI with 3D glowing robot mascot, voice input (Web Speech API), and message bubbles.
- **`src/app/components/patient/ChatSessionSidebar.tsx`:** Collapsible chat history, report filtering, search, and token usage tracker.
- **`src/lib/labReportChat.ts`:** Core chat logic:
  - Context assembly (biomarker findings + reference ranges + report text snippets).
  - Gemini 2.5 Flash prompting and automated fallback to rule-based symptom-to-biomarker inference engine.
  - CRUD operations on `lab_report_queries` table (`submitLabReportQuery`, `verifyLabReportQuery`, `rejectAndReplaceLabReportQuery`, `clearQueriesForReport`).
- **`supabase/migrations/016_lab_report_queries.sql` & `017_lab_report_queries_delete_policy.sql`:** Database table, RLS policies, and deletion triggers.

### Deterministic Clinical Insights Engine
- **`src/lib/biomarkerCatalog.ts`:** Comprehensive catalog of 57+ standardized biomarkers, units, reference ranges, and severity thresholds.
- **`src/lib/labInsights.ts`:** Deterministic clinical calculation engine:
  - Multi-organ assessments: Cardiovascular, Hematologic, Hepatic, Renal, Metabolic, Endocrine.
  - Overall health score calculation and risk indicator generation.
  - Disease risk prediction algorithms (Diabetes, Atherosclerosis, Anemia, CKD, Liver Disease).
  - ClinicalTrials.gov query formulation based on lab abnormalities.
- **`src/app/pages/patient/DiseasePrediction.tsx`:** Deterministic disease risk dashboard.
- **`src/app/pages/patient/Nutrition.tsx`:** Biomarker-grounded nutritional guidance.
- **`src/app/pages/patient/ClinicalTrials.tsx`:** Clinical trials matching interface.
- **`src/app/pages/patient/WellnessTips.tsx`:** Actionable lifestyle tips.

### Clinician (Doctor) Workspace
- **`src/app/pages/doctor/PatientsList.tsx`:** Roster table with risk flags, search/filter, and patient linking dialog.
- **`src/app/pages/doctor/LinkPatientDialog.tsx`:** Modal for establishing care relationships by email/ID.
- **`src/app/pages/doctor/PatientDetail.tsx`:** Comprehensive patient chart:
  - Vitals, longitudinal biomarker trends, and historical lab panels.
  - Electronic prescription authoring (`src/lib/prescriptions.ts`).
  - Care action timeline: notes, referrals, follow-ups, lab requests (`src/lib/careActions.ts`).
  - AI lab report extraction draft review & publishing tool.
  - AI query review panel (verify or revise patient AI questions).

### Virtual Teleconsultation & Real-Time Sync
- **`src/app/pages/patient/PatientTeleconsult.tsx` & `DoctorTeleconsult.tsx`:** Teleconsultation views.
- **`src/app/components/teleconsult/VideoCall.tsx`:** PeerJS WebRTC video/audio peer-to-peer connection over Google STUN servers.
- **`src/app/components/teleconsult/RealtimeNote.tsx`:** Doctor-to-patient live clinical note streaming via Supabase Realtime broadcast channels (`consultation-{id}`).

### Serverless Lab Extraction Pipeline
- **`supabase/functions/process-lab-report/`:** Deno Edge Function extracting text via PDF.js and performing structured Gemini OCR.
- **`supabase/functions/process-lab-report-queue/`:** Asynchronous queue worker processing backlog extraction jobs.
- **`src/lib/labReportAnalysis.ts` & `labReportExtraction.ts`:** Client-side triggers, draft management, and manual overrides.

---

## 4. Primary Database Tables (Supabase Postgres)

1. **`public.profiles`:** User identity, roles (`patient`, `doctor`), names, license numbers.
2. **`public.care_relationships`:** Doctor-patient links and clinical snapshot status.
3. **`public.prescriptions`:** Medication records authored by doctors.
4. **`public.lab_report_uploads`:** File upload metadata in `lab-reports` storage bucket.
5. **`public.lab_report_extractions`:** Reviewable AI extraction drafts with field confidence.
6. **`public.lab_panels`:** Published biomarker records.
7. **`public.care_actions`:** Clinical actions (notes, follow-ups, requests, referrals).
8. **`public.lab_report_queries`:** Patient AI chat inquiries, AI responses, and doctor verification status (`pending_review`, `verified`, `rejected_and_replaced`).

---

## 5. Rules for Safe Code Modifications

1. **Maintain Runtime Boundaries:** All product code must remain within `zebra-synapse/src/`, `zebra-synapse/public/`, and `zebra-synapse/supabase/`. Never move runtime dependencies into `research/` or root wrapper directories.
2. **Deterministic Clinical Logic:** Never replace deterministic clinical risk calculations in `labInsights.ts` with ungrounded generative AI text calls.
3. **Preserve Database Invariants:** When authoring new SQL migrations, always maintain Row-Level Security (RLS) and PHI mutation audit triggers (`audit_phi_mutation`).
4. **Validation Checklist:** Before submitting changes, execute:
   ```bash
   npm run typecheck
   npm run build
   npm run check
   ```

---

## 6. Attributions & Third-Party Licenses

- **UI Components:** Built using [shadcn/ui](https://ui.shadcn.com/) components and primitives under the [MIT License](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md).
- **Photography & Visuals:** Includes photos and media from [Unsplash](https://unsplash.com) used under the [Unsplash License](https://unsplash.com/license).
- **Icons:** [Lucide React](https://lucide.dev/) icons used under the [ISC License](https://github.com/lucide-icons/lucide/blob/main/LICENSE).


