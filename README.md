# Zebra Synapse Repository

This repository contains the Zebra Synapse hackathon submission and the production-ready source package used for local development and deployment.

## Start Here

The runnable application lives in [`zebra-synapse`](./zebra-synapse).

Open [`zebra-synapse/README.md`](./zebra-synapse/README.md) for:

- project overview
- local setup
- Vercel deployment steps
- required Supabase migrations
- demo and submission context

## Repository Layout

- `.github/`: CI workflow configuration
- `zebra-synapse/`: application source, Supabase migrations, submission docs, and assets
- [`requirements.txt`](./requirements.txt): top-level toolchain summary

## Important Notes

- The Vercel root directory should be `zebra-synapse`.
- The app depends on Supabase Auth, Postgres, Storage, and RLS-backed policies.
- Doctor workflows that use care activity require [`008_care_actions.sql`](./zebra-synapse/supabase/migrations/008_care_actions.sql) to be applied in Supabase.
