# Zebra Synapse — Comprehensive Internal Knowledge Base

This document serves as the single, consolidated internal technical and functional guide for **Zebra Synapse**, compiled directly from code inspection, database schema migrations, Edge Functions, security triggers, and clinical logic engines.

---

## 1. Project Overview & Problem Statement

### Executive Summary
**Zebra Synapse** is an AI-assisted digital health platform built to bridge the gap between unstructured clinical lab data and actionable patient-doctor workflows. It provides dual-role portals (**Patient** and **Doctor**), automated PDF lab report parsing, deterministic risk evaluation, and virtual teleconsultation workspaces.

### The Problem It Solves
1. **Clinical Lab Data Silos:** Patients receive lab reports as complex, unstructured PDFs with non-standardized reference ranges. Doctors spend valuable time manually locating historical values across visits. Zebra Synapse extracts, standardizes (57+ biomarkers), and tracks these metrics longitudinally.
2. **Disconnected Care Workspaces:** Patient portals often lack active clinician integration. Zebra Synapse links patients to doctors, allowing clinicians to review charts, author prescriptions, track care actions, and stream live clinical notes during video visits.
3. **AI Hallucination Risk in Healthcare:** Generative AI models often hallucinate when summarizing medical records. Zebra Synapse solves this by strictly separating concerns:
   - **Generative AI (Google Gemini):** Restricted *only* to document parsing and schema-guided extraction of raw numerical values with confidence scoring.
   - **Clinical Evaluation:** Driven *exclusively* by a deterministic, rule-based TypeScript engine (`src/lib/labInsights.ts`) grounded in established clinical guidelines.

---

## 2. Tech Stack & System Architecture

### Full Technology Stack
- **Frontend Framework:** React 18 (`react-dom`), Vite 6, TypeScript (`~5.7.2`).
- **Styling & Theme:** TailwindCSS v4, Lucide Icons (`lucide-react`), modern dark glassmorphic design.
- **3D Graphics & Animations:** Three.js (`three`), React Three Fiber (`@react-three/fiber`), GSAP ScrollTrigger for interactive 3D DNA double-helix hero rendering and scroll-unzipping transitions.
- **Data Visualization:** Recharts for longitudinal biomarker trend charts.
- **Backend & Database:** Supabase Postgres (PostgreSQL 15+ with 13 SQL migrations).
- **Authentication:** Supabase Auth (JWTs, role-based metadata, 15-minute inactivity session expiry).
- **File Storage:** Supabase Storage (`lab-reports` bucket, 10 MB limit, patient path namespace).
- **Serverless Edge Functions:** Deno runtime Edge Functions (`process-lab-report`, `process-lab-report-queue`).
- **AI Document OCR:** Google Gemini API (`gemini-2.5-flash`, fallback `gemini-2.5-flash-lite`) + PDF.js (`pdfjs-dist@5.6.205`).
- **Teleconsultation & WebSockets:** PeerJS (WebRTC over Google STUN servers) + Supabase Realtime WebSocket broadcast channels (`consultation-{id}`).

### High-Level Architecture & Pipeline
```text
[ React 18 + Vite Frontend ]
       |
       |--- Supabase Auth ---------------> [ Role-Based Session / Auth ]
       |--- Database Operations ---------> [ Supabase Postgres + RLS ]
       |--- Storage Upload (PDF/Image) --> [ Supabase Storage: 'lab-reports' ]
       |                                          |
       |                                (Database Trigger)
       |                                          v
       |                                  [ lab_report_analysis_jobs ]
       |                                          |
       |                                (HTTP Trigger / Queue)
       |                                          v
       |----------------------------------- [ Supabase Edge Functions ]
                                                  |
                                                  |-- 1. Download Bytes from Storage
                                                  |-- 2. Extract PDF Text (pdfjs-dist)
                                                  |-- 3. Schema-guided OCR (Gemini API)
                                                  |-- 4. Standardize Biomarkers (57+ keys)
                                                  v
                                          [ lab_report_extractions ]
                                                  |
                                            (Auto-Publish)
                                                  v
                                          [ lab_panels ]
                                                  |
       |<-- Fetch Published Biomarkers -----------|
       v
[ Deterministic Insight Engine ] (src/lib/labInsights.ts)
       |--> Health Status & Risk Indicators
       |--> Organ System Assessments (Cardio, Metabolic, Heme, Renal, Hepatic, Endocrine)
       |--> Disease Predictions & Nutrition Guidance
       |--> ClinicalTrials.gov Search Queries
```

---

## 3. Database Schema, Security & Data Handling

### Relational Data Model (7 Primary Tables across 13 Migrations)
1. **`public.profiles`:** Linked to `auth.users.id`. Stores identity, role (`patient`, `doctor`), full name, and license number.
2. **`public.care_relationships`:** Links `doctor_id` and `patient_id`. Stores clinical snapshot fields (`last_visit`, `primary_condition`, vitals, `health_status`, `risk_flags`).
3. **`public.prescriptions`:** Doctor-authored medication records (`details`, `status`, `created_at`, `completed_at`).
4. **`public.lab_report_uploads`:** Metadata for uploaded lab files (`storage_path`, `original_filename`, `analysis_status`).
5. **`public.lab_report_extractions`:** Reviewable draft extractions from Edge Functions (`biomarkers_json`, `field_sources_json`, `field_confidence_json`, `review_state`).
6. **`public.lab_panels`:** Published biomarker values (`hemoglobin_a1c`, `fasting_glucose`, `total_cholesterol`, `ldl`, `hdl`, `triglycerides`, `hemoglobin`, `wbc`, `platelets`, `creatinine`, etc.).
7. **`public.care_actions`:** Doctor-created patient actions (`follow_up`, `lab_request`, `message`, `referral`, `treatment_plan`, `report`, `note`).

### Security Baseline & Auditing
- **Row Level Security (RLS):** Enabled and forced on all PHI tables. Patients access only their own records. Doctors access patient data *only* if an active link exists in `care_relationships`.
- **PHI Audit Logging (`security_audit_log`):** Database trigger `audit_phi_mutation()` logs every `INSERT`, `UPDATE`, and `DELETE` on PHI tables with full JSON `before` / `after` row payloads.
- **Security Invariants & Triggers:** Triggers enforce immutability on primary keys, user roles, creation timestamps, and storage namespaces (`{patient_id}/...`).
- **Password & Inactivity Policy:** Minimum 12-character passwords (uppercase, lowercase, number, special char). Inactivity session timeout defaults to 15 minutes (`VITE_AUTH_INACTIVITY_TIMEOUT_MS`).

---

## 4. Implemented Feature Inventory

### Patient Portal
- **Dashboard Home (`PatientHome.tsx`):** Overview cards, recent biomarker badges (`normal`, `borderline`, `high`, `low`), active prescriptions, and care action timeline.
- **Medical Records & Uploads (`MedicalRecordsInsights.tsx`):** Drag-and-drop file upload, real-time pipeline status indicators, Recharts trend charts, and extraction draft review.
- **Health Insights Pages:**
  - *Disease Prediction (`DiseasePrediction.tsx`):* Evaluates risk levels for Diabetes, Cardiovascular Disease, Anemia, Renal, and Hepatic dysfunction.
  - *Nutrition (`Nutrition.tsx`):* Tailored dietary focus based on biomarker balance.
  - *Wellness Tips (`WellnessTips.tsx`):* Actionable lifestyle and hydration guidance.
  - *Clinical Trials (`ClinicalTrials.tsx`):* Dynamically matches ClinicalTrials.gov studies (e.g. NCT07243821) based on lab abnormalities.
- **Prescriptions (`Prescription.tsx`):** View doctor-prescribed medications and dosage instructions.

### Doctor Portal
- **Patient Roster (`PatientsList.tsx`):** Roster table with risk status pills, search/filtering, and quick patient linking by email/ID (`LinkPatientDialog.tsx`).
- **Patient Detail Chart (`PatientDetail.tsx`):** Deep patient view showing historical lab panels, prescription authoring modal, care action log (notes, follow-ups, requests), and AI extraction draft review/publishing tool.

### Virtual Teleconsultation
- **WebRTC Video Call (`VideoCall.tsx`):** Peer-to-peer audio/video streaming via PeerJS over Google STUN servers with custom controls (mute, video toggle, hangup).
- **Streaming Clinical Notes (`RealtimeNote.tsx`):** Uses Supabase Realtime WebSockets (`consultation-{id}`) to stream live notes from doctor to patient in real time as the doctor types.

---

## 5. Honest Status, Mocked Boundaries & Gaps

| Feature | Implementation Status | Technical Details |
| :--- | :--- | :--- |
| **Auth, Profiles, Linking, Prescriptions, Lab Pipeline, Care Actions, Audit Log** | **100% Production-Baked** | Backed by Supabase Postgres tables, RLS policies, triggers, and Edge Functions. |
| **Biomarker Catalog & Insights Engine** | **100% Production-Baked** | Pure TypeScript engines (`biomarkerCatalog.ts`, `labInsights.ts`) with 57+ catalog metrics. |
| **Teleconsultation Video & Live Notes** | **100% Functional Client Realtime** | PeerJS WebRTC P2P video stream + Supabase Realtime WebSocket broadcast channels. |
| **Appointments Scheduling** | **Local Component State Only** | **Mocked boundary:** Doctor choices & appointment bookings use React `useState` (`doctorOptions`), not a DB table. |
| **Rare Disease ML Training** | **Research Archive Only** | `research/ml/` contains Python scripts training MIMIC-IV classifiers; exported to `rare_disease_screen_v1.json`, separate from web runtime. |
| **Demo Auth Mode** | **Offline Fallback** | `AuthContext.tsx` uses `localStorage` demo sessions if Supabase environment variables are unconfigured. |

---

## 6. Key Takeaways & Surprising Repo Findings

1. **No AI Hallucination in Insights:** Generative AI (Gemini API) is strictly bounded to raw PDF parsing/OCR. Clinical risk evaluations are 100% deterministic TypeScript code.
2. **Built-in PHI Audit Log:** Every mutation to patient profiles, relationships, lab values, prescriptions, and notes automatically writes a full JSON diff to `security_audit_log`.
3. **P2P Video + WebSocket Note Streaming:** Teleconsultation combines WebRTC peer-to-peer video with live WebSocket note streaming without polling the database.
4. **Clean Codebase Separation:** Research scripts (`research/ml`) are kept strictly isolated from the React/Vite product build.
