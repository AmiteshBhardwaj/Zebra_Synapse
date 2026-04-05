# Zebra Synapse

## Project Submission

**Project Name:** Zebra Synapse  
**Team Members:** Amitesh Bhardwaj, Kartikeya Verma,Tania Bhola, T Sanjana
**Track:** Healthcare AI / Digital Health

## Project Overview

Zebra Synapse is an AI-assisted digital health platform that helps patients and doctors work from the same structured view of clinical data. The platform supports secure authentication, patient-doctor linking, prescription tracking, lab report uploads, and insight generation from medical records. Instead of leaving health data fragmented across files and portals, Zebra Synapse converts reports into organized biomarker panels and turns them into actionable summaries for both care teams and patients.

The core value of the product is speed-to-understanding. Patients can upload lab reports, review their prescriptions, and monitor key health signals in a guided interface. Doctors can review linked patient records, document care actions, manage prescriptions, and use structured lab views to make faster decisions. This creates a practical workflow layer between raw health records and day-to-day clinical action.

## Project Description

Zebra Synapse is built to reduce the gap between raw healthcare data and practical clinical decision-making. The platform combines patient and doctor workflows in one system so both sides can access structured records, prescriptions, lab history, and follow-up actions from a shared source of truth. By transforming uploaded reports into readable biomarker panels and explainable insights, the product makes health data easier to understand, easier to act on, and more useful in real care journeys.

## Architecture

- **Frontend:** React, TypeScript, Vite, Radix UI, Tailwind-based styling
- **Backend:** Supabase Auth, Postgres, Storage, and row-level security
- **Clinical Data Pipeline:** Browser-side PDF parsing, biomarker normalization, structured lab panel persistence, and deterministic insight generation

See [architecture.md](./architecture.md) for the full system breakdown.

## Demo
Demo video - https://youtu.be/xa0-ucu9rgE?si=y67QKcMFRMQ1W2ej
demo link - https://zebrasynapse.vercel.app/

See [demo.md](./demo.md) for demo flow, setup, and what judges should inspect. Add your Loom or YouTube demo link at the top of that file before final submission.

## Pre-Submission Checklist

- [x] Code is organized inside this submission package
- [x] Dependencies are documented in [`requirements.txt`](./requirements.txt)
- [x] Environment variables are documented in [`.env.example`](./.env.example)
- [x] Screenshots folder is included in [`screenshots/`](./screenshots)
- [x] Local run instructions are included below
- [x] System architecture is documented
- [x] Demo guidance is included

## How to Run Locally

1. `cd zebra-synapse`
2. `npm install`
3. Copy `.env.example` to `.env` or run `npm run env:local` after starting local Supabase
4. `npm run dev`

## Validation

- `npm run check`
- `npm run build`
- `npm run typecheck`

## Key Files

- `src/`: application source
- `supabase/`: schema and migration history
- `package.json`: project scripts and dependencies
- `requirements.txt`: runtime and tooling requirements summary
- `architecture.md`: system design summary
- `demo.md`: demo guide for judges
