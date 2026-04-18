# Contributing

Use [`README.md`](./README.md) for canonical setup and deployment prerequisites. This file focuses on team workflow only.

## Local Workflow

1. Clone the repository.
2. Enter `zebra-synapse/`.
3. Install Node.js `20.19.0` and npm `11.6.2`.
4. Run `npm install`.
5. Prepare env vars from [`.env.example`](./.env.example) or `npm run env:local`.
6. Start the app with `npm run dev`.

## Change Rules

- Keep runtime changes inside `src/`, `public/`, `supabase/`, or `scripts/` as appropriate.
- Keep research work under [`research/`](./research).
- Keep demo imagery under [`screenshots/`](./screenshots).
- Do not commit `.env`, `dist`, `node_modules`, `.vercel`, coverage output, or unrelated generated files.

## Pull Request Expectations

- scope one change per PR
- include screenshots for visible UI changes
- call out schema, migration, or env-var impact
- mention when doctor workflows, patient insights, or lab analysis behavior change

## Verification

- `npm run typecheck`
- `npm run build`
- `npm run check`
