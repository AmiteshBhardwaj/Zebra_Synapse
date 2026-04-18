# Zebra Synapse

Zebra Synapse is the sole product root for this repository. This document is the canonical source for setup, deployment, and operations. Repository-level navigation lives in [`../README.md`](../README.md). System design lives in [`architecture.md`](./architecture.md).

## Product Summary

Zebra Synapse is an AI-assisted digital health platform for shared patient and doctor workflows over structured clinical data. The app supports secure authentication, patient-doctor linking, prescriptions, lab report uploads, server-side extraction, and deterministic health insights grounded in persisted biomarker panels.

## Directory Map

```text
zebra-synapse/
|-- src/                 product application code
|-- public/              product static assets
|-- supabase/            schema, migrations, Edge Functions
|-- scripts/             repeatable project tooling
|-- docs/                supplementary docs, not canonical setup/architecture
|-- research/            archived experiments and research outputs
|-- screenshots/         demo and submission images
|-- package.json         scripts and dependencies
|-- vercel.json          app-level hosting and security config
|-- architecture.md      canonical system design
`-- README.md            canonical setup, deploy, and ops guide
```

## Local Setup

1. Install Node.js `20.19.0` and npm `11.6.2`.
2. Run `npm install`.
3. Create local env values:
   - copy [`.env.example`](./.env.example) to `.env`, or
   - run `npm run env:local` after local Supabase is up.
4. Apply the required Supabase migrations in order.
5. Start development with `npm run dev`.

Local-only files such as [`.env`](./.env) must never be committed.

## Deployment

### Vercel

1. Import the repository into Vercel.
2. Set `Root Directory` to `zebra-synapse`.
3. Use `npm ci`, `npm run build`, and `dist` if you need explicit overrides.
4. Set browser-safe env vars:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Optionally set `VITE_SITE_URL=https://<your-domain>` for fixed auth redirect origin.
6. In Supabase Auth, align `Site URL` and redirect URLs with the deployed origin.
7. Apply SQL migrations in [`supabase/migrations/`](./supabase/migrations/) before end-to-end testing.
8. Add Supabase Edge Function secrets for lab analysis:
   - `GEMINI_API_KEY`
   - optional `GEMINI_MODEL`
   - optional `GEMINI_MODEL_FALLBACK`
9. Deploy the `process-lab-report` and `process-lab-report-queue` functions.

Do not prepend `cd zebra-synapse &&` inside Vercel commands once the root directory is set.

## Operations

### Validation

- `npm run typecheck`
- `npm run build`
- `npm run check`

### Required Migrations

- Apply migrations in numeric order from [`supabase/migrations/`](./supabase/migrations/).
- `008_care_actions.sql` is required for notes, quick actions, and care activity.
- `009_security_hardening.sql` and `010_security_invariants.sql` establish the current security baseline.

### Security Baseline

- Keep the Supabase service role key out of frontend code.
- Deploy with [`vercel.json`](./vercel.json) headers intact.
- Configure Supabase Auth rate limits, bot protection, leaked-password checks, and MFA in the dashboard.
- Review `.github/workflows/security.yml` and CodeQL findings before production release.
- If longer browser sessions are needed, set `VITE_AUTH_INACTIVITY_TIMEOUT_MS`; default inactivity expiry is 15 minutes.

## Related Documents

- Demo flow and judge path: [`demo.md`](./demo.md)
- Contribution workflow: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Toolchain versions: [`tooling-requirements.md`](./tooling-requirements.md)
- Supplementary developer docs: [`docs/`](./docs)
- Research archive: [`research/`](./research)
- Submission assets: [`screenshots/`](./screenshots)
