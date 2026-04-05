# Contributing

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
