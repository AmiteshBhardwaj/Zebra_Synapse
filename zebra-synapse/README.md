# Zebra Synapse

Zebra Synapse is the sole product root for this repository. This document is the canonical source for setup, deployment, and operations. Repository-level navigation lives in [`../README.md`](../README.md). System design lives in [`architecture.md`](./architecture.md).

## Product Summary

Zebra Synapse is an AI-assisted digital health platform providing shared patient and clinician workflows over structured clinical lab data. The platform supports secure authentication, patient-doctor linking, electronic prescriptions, lab report uploads, server-side PDF extraction, deterministic multi-organ risk modeling, interactive AI Lab Report Chat with doctor verification, and virtual teleconsultation workspaces.

## Directory Map

```text
zebra-synapse/
|-- src/                 Product application code
|   |-- app/             Pages, routes, layouts, and UI components
|   |   |-- pages/       Patient & Doctor portal views, auth pages
|   |   |-- components/  UI elements, 3D DNA canvas, teleconsult, layout
|   |   `-- layouts/     Route guards (RequirePatientPortal, RequireDoctorPortal)
|   |-- auth/            AuthContext, session state, inactivity timeouts
|   |-- hooks/           Data fetching & active report context hooks
|   |-- lib/             Clinical engines, AI chat, Supabase client, catalog
|   `-- styles/          TailwindCSS v4 theme tokens and global styles
|-- public/              Product static assets and demo files
|-- supabase/            Database schema, SQL migrations, Edge Functions
|   |-- functions/       Deno serverless functions for PDF parsing
|   `-- migrations/      15 SQL migrations defining schema, RLS, triggers
|-- scripts/             Repeatable project tooling (e.g. write-local-env.mjs)
|-- docs/                Supplementary docs and codebase ownership guide
|-- research/            Archived ML experiments and research outputs (MIMIC-IV)
|-- screenshots/         Demo and submission imagery
|-- package.json         Scripts and dependencies
|-- vercel.json          App-level hosting and security headers
|-- architecture.md      Canonical system design reference
`-- README.md            Canonical setup, deploy, and ops guide
```

## Local Setup

### 1. Prerequisites & Toolchain
- **Node.js:** `20.19.0` (managed via Volta or nvm)
- **npm:** `11.6.2`
- **Supabase CLI:** `2.84.10`
- **Docker Desktop:** (optional, required if running local Supabase containers)

### 2. Installation
```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
```

### 3. Environment Variables
Configure the following variables in `.env`:
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...

# AI & Lab Report Chat (Optional: enables Gemini API for document OCR & AI Chat)
VITE_GEMINI_API_KEY=AIzaSy...

# Optional Customizations
VITE_SITE_URL=http://localhost:5173
VITE_AUTH_INACTIVITY_TIMEOUT_MS=900000
```

> [!NOTE]
> If `VITE_GEMINI_API_KEY` is omitted, Zebra Synapse automatically activates its built-in, clinically grounded deterministic inference engine for both lab report queries and symptom explanations.

### 4. Database Setup & Migrations
Apply migrations in numerical order against your Supabase project (or run `npm run supabase:reset` for local development):
1. `001_profiles.sql` — User profiles and roles (`patient`, `doctor`)
2. `002_care_relationships.sql` — Doctor-patient clinical links and vitals snapshot
3. `003_prescriptions.sql` — Doctor-authored medication records
4. `004_lab_reports.sql` — Lab report upload tracking
5. `005_lab_panels.sql` — Structured biomarker panels
6. `006_lab_panel_biomarkers.sql` — Extended biomarker columns
7. `007_profiles_select_linked_users.sql` — Cross-profile select policies
8. `008_care_actions.sql` — Clinical care action timeline
9. `009_security_hardening.sql` — Enforce RLS and PHI mutation audit logging
10. `010_security_invariants.sql` — Immutability triggers and storage namespace enforcement
11. `014_lab_report_analysis_pipeline.sql` — Serverless analysis queue and extractions
12. `015_fix_link_patient_rls.sql` — Doctor-patient linking policy fixes
13. `016_lab_report_queries.sql` — Lab report AI chatbot queries & doctor verification
14. `017_lab_report_queries_delete_policy.sql` — Session query history clearance policy
15. *(Optional)* `seed_doctors_patients.sql` — Populates demo doctors, patients, and sample lab panels

### 5. Run Local Development Server
```bash
npm run dev
```

---

## Deployment

### Vercel
1. Import the repository into Vercel.
2. Set **Root Directory** to `zebra-synapse`.
3. Build Settings:
   - Install Command: `npm ci`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Set Environment Variables in the Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GEMINI_API_KEY` (optional)
   - `VITE_SITE_URL` (e.g. `https://zebrasynapse.vercel.app`)
5. Ensure Supabase Auth redirect URLs include your production Vercel domain.

### Supabase Edge Functions
Deploy serverless functions for asynchronous lab report parsing:
```bash
# Set Edge Function secrets
supabase secrets set GEMINI_API_KEY=<your-api-key>
supabase secrets set GEMINI_MODEL=gemini-2.5-flash
supabase secrets set GEMINI_MODEL_FALLBACK=gemini-2.5-flash-lite

# Deploy functions
supabase functions deploy process-lab-report
supabase functions deploy process-lab-report-queue
```

---

## Operations & Quality Assurance

### Verification Commands
```bash
# Type check TypeScript codebase
npm run typecheck

# Production build bundle check
npm run build

# Comprehensive CI check (typecheck + build)
npm run check
```

### Security Baseline
- **Client Security:** The Supabase `service_role` key must NEVER be included in frontend code or environment variables.
- **Headers:** Deploy with [`vercel.json`](./vercel.json) security headers intact (`X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`).
- **Audit Logging:** Every insert, update, or delete on PHI tables is automatically captured in `security_audit_log`.
- **Session Expiration:** Default 15-minute inactivity timer with automated session logout (`VITE_AUTH_INACTIVITY_TIMEOUT_MS`).

---

## Related Documents

- **Demo Walkthrough & Judge Guide:** [`demo.md`](./demo.md)
- **System Architecture & Data Flows:** [`architecture.md`](./architecture.md)
- **Developer Codebase Map:** [`docs/codebase.md`](./docs/codebase.md)
- **Contribution Guidelines:** [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- **Research Archive (MIMIC-IV ML):** [`research/README.md`](./research/README.md)
- **Submission Screenshots:** [`screenshots/README.md`](./screenshots/README.md)
