# Contributing

## Team Setup And PR Workflow

1. Clone the repository:
   `git clone https://github.com/AmiteshBhardwaj/Zebra_Synapse.git`
2. Move into the app folder:
   `cd Zebra_Synapse/zebra-synapse`
3. Install the required toolchain:
   Node.js `20.19.0`, npm `11.6.2`, and optionally Docker Desktop for local Supabase.
4. Install dependencies:
   `npm install`
5. Start local Supabase if you want the full app with auth and database features:
   `npm run supabase:start`
6. Generate local environment variables:
   `npm run env:local`
   If you are not using local Supabase, copy [`.env.example`](./.env.example) to `.env.local` and fill in the hosted Supabase values.
7. Start the app:
   `npm run dev`
8. Create a feature branch before making changes:
   `git checkout -b fix/<short-description>`
9. Fix the issue, then verify before committing:
   `npm run check`
10. Commit only related files:
    `git add <files>`
    `git commit -m "Fix <short description>"`
11. Push the branch:
    `git push -u origin fix/<short-description>`
12. Open a pull request to the `main` branch of `AmiteshBhardwaj/Zebra_Synapse`.

## If Something Fails Locally

- If `npm install` fails, confirm Node.js `20.19.0` and npm `11.6.2`.
- If `npm run env:local` fails, start Docker Desktop and rerun `npm run supabase:start`.
- If Supabase is not needed for the change, use hosted credentials in `.env.local` instead of local Docker services.
- If `npm run check` fails, fix the TypeScript or build error before opening the pull request.
- Do not commit `.env.local`, local screenshots, or unrelated generated files.

## Development Workflow

1. Install dependencies with `npm install`.
2. Create local environment variables from [`.env.example`](./.env.example) or run `npm run env:local` after starting Supabase locally.
3. Run `npm run dev` for local development.
4. Run `npm run check` before opening or updating a pull request.

## Pull Request Expectations

- keep changes scoped to one concern
- include screenshots for visible UI changes
- note any schema or environment variable changes
- avoid committing generated files unless they are required for deployment

## Local Verification

- `npm run typecheck`
- `npm run build`
- `npm run check`
