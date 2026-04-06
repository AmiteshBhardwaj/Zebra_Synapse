# Tooling Requirements

Use the following baseline when running Zebra Synapse locally or in CI:

- Node.js `20.19.0`
- npm `11.6.2`
- Supabase CLI `2.84.10`
- Docker Desktop (optional, only required for local Supabase containers)

## Notes

- The deployable frontend lives in `zebra-synapse/` and is built with `npm run build`.
- Local verification is standardized around `npm run check`.
- If you want seeded local demo data, apply the SQL migrations first and then run `supabase/migrations/seed_doctors_patients.sql`.
