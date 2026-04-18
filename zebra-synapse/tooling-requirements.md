# Tooling Requirements

Canonical setup steps live in [`README.md`](./README.md). This file tracks version baselines only.

- Node.js `20.19.0`
- npm `11.6.2`
- Supabase CLI `2.84.10`
- Docker Desktop for local Supabase containers

## Notes

- Product runtime lives in `zebra-synapse/`.
- Standard verification is `npm run check`.
- Seed demo data requires base migrations before `supabase/migrations/seed_doctors_patients.sql`.
