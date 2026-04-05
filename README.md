# Zebra Synapse

Zebra Synapse is a React and Supabase healthcare workflow prototype for patient insights, doctor review, lab report ingestion, prescriptions, and persisted care actions.

## Repository Goals

- single source of truth for continued development
- reproducible local setup
- deployable static frontend
- clean migration history for Supabase-backed features

## Tech Stack

- React 18
- Vite 6
- TypeScript
- Supabase Auth, Database, and Storage
- Radix UI and Tailwind-based styling
- PDF.js for browser-side lab report text extraction

## Scripts

- `npm run dev`: start the local Vite dev server
- `npm run build`: produce a production build in `dist/`
- `npm run preview`: preview the production build locally
- `npm run typecheck`: run TypeScript checks
- `npm run check`: run typecheck plus production build
- `npm run supabase:start`: start the local Supabase stack
- `npm run supabase:status`: inspect the local Supabase stack
- `npm run supabase:reset`: reset the local database from migrations
- `npm run supabase:stop`: stop the local Supabase stack
- `npm run env:local`: generate `.env.local` from the running local Supabase stack

## Local Development

1. Install dependencies with `npm install`.
2. Copy [`.env.example`](.env.example) to `.env` or use `npm run env:local` after starting the local Supabase stack.
3. Start the app with `npm run dev`.

For a reproducible local backend:

1. Install Docker Desktop.
2. Run `npm run supabase:start`.
3. Run `npm run env:local`.

## Supabase Setup

Apply migrations from [`supabase/migrations`](supabase/migrations) in numeric order:

1. `001_profiles.sql`
2. `002_care_relationships.sql`
3. `003_prescriptions.sql`
4. `004_lab_reports.sql`
5. `005_lab_panels.sql`
6. `006_lab_panel_biomarkers.sql`
7. `007_profiles_select_linked_users.sql`
8. `008_care_actions.sql`

Optional demo seed data is available in [`supabase/seed_doctors_patients.sql`](supabase/seed_doctors_patients.sql).

## Deployment

- `npm run build` outputs static files to `dist/`
- [`vercel.json`](vercel.json) handles SPA rewrites for Vercel
- [`public/_redirects`](public/_redirects) supports the same routing model for Netlify

Set these environment variables in your host:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SITE_URL`

## Docs

- [CODEBASE.md](CODEBASE.md): feature map and file ownership guide
- [architecture.md](architecture.md): high-level system overview
