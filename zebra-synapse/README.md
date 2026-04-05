# Zebra Synapse

## Project Submission

**Project Name:** Zebra Synapse  
**Track:** Healthcare AI / Digital Health

## Project Overview

Zebra Synapse is an AI-assisted digital health platform that helps patients and doctors work from the same structured view of clinical data. The platform supports secure authentication, patient-doctor linking, prescription tracking, lab report uploads, and insight generation from medical records. Instead of leaving health data fragmented across files and portals, Zebra Synapse converts reports into organized biomarker panels and turns them into actionable summaries for both care teams and patients.

The core value of the product is speed-to-understanding. Patients can upload lab reports, review their prescriptions, and monitor key health signals in a guided interface. Doctors can review linked patient records, document care actions, manage prescriptions, and use structured lab views to make faster decisions. This creates a practical workflow layer between raw health records and day-to-day clinical action.

## Architecture

- **Frontend:** React, TypeScript, Vite, Radix UI, Tailwind-based styling
- **Backend:** Supabase Auth, Postgres, Storage, and row-level security
- **Clinical Data Pipeline:** Browser-side PDF parsing, biomarker normalization, structured lab panel persistence, and deterministic insight generation

See [architecture.md](./architecture.md) for the full system breakdown.

## Demo

See [demo.md](./demo.md) for demo flow, setup, and what judges should inspect.

## Pre-Submission Checklist

- [x] Code is organized inside this submission package
- [x] Environment variables are documented in [`.env.example`](./.env.example)
- [x] Local run instructions are included below
- [x] System architecture is documented
- [x] Demo guidance is included

## How to Run Locally

1. `cd zebra-synapse`
2. `npm install`
3. Copy `.env.example` to `.env` or run `npm run env:local` after starting local Supabase
4. `npm run dev`

## Key Files

- `src/`: application source
- `supabase/`: schema and migration history
- `package.json`: project scripts and dependencies
- `architecture.md`: system design summary
- `demo.md`: demo guide for judges
