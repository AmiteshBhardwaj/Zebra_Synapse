# Zebra Synapse

Zebra Synapse is a React and Supabase healthcare workflow prototype for patient insights, doctor review, lab report ingestion, prescriptions, and persisted care actions.

## Repository Goals

- keep the repository maintainable and easy to onboard into
- preserve a reproducible local setup
- ship a deployable static frontend
- keep Supabase schema history explicit and reviewable

## Tech Stack

- React 18
- Vite 6
- TypeScript
- Supabase Auth, Database, and Storage
- Radix UI and Tailwind-based styling
- PDF.js for browser-side lab report text extraction

## Quick Start

1. Install dependencies with `npm install`.
2. Create local environment variables from [`.env.example`](./.env.example), or start the local Supabase stack and run `npm run env:local`.
3. Start the app with `npm run dev`.

For a reproducible local backend:

1. Install Docker Desktop.
2. Run `npm run supabase:start`.
3. Run `npm run env:local`.

## Available Scripts

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

## Environment Variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SITE_URL`

## Database

Apply migrations from [`supabase/migrations`](./supabase/migrations) in numeric order:

1. `001_profiles.sql`
2. `002_care_relationships.sql`
3. `003_prescriptions.sql`
4. `004_lab_reports.sql`
5. `005_lab_panels.sql`
6. `006_lab_panel_biomarkers.sql`
7. `007_profiles_select_linked_users.sql`
8. `008_care_actions.sql`

Optional demo seed data is available in [`supabase/migrations/seed_doctors_patients.sql`](./supabase/migrations/seed_doctors_patients.sql).

## Deployment

- `npm run build` outputs static files to `dist/`
- [`vercel.json`](./vercel.json) handles SPA rewrites for Vercel
- [`public/_redirects`](./public/_redirects) supports the same routing model for Netlify

## Repository Docs

- [docs/README.md](./docs/README.md): documentation index
- [docs/architecture.md](./docs/architecture.md): high-level system overview
- [docs/codebase.md](./docs/codebase.md): feature map and safe change guide
- [CONTRIBUTING.md](./CONTRIBUTING.md): contribution and PR expectations
