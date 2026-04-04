
  # Zebra Synapse

  This is a code bundle for Zebra Synapse. The original project is available at https://www.figma.com/design/K3WyblY0vqq6EYGgUiVr0y/Zebra-Synapse.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  
## Production build and deploy

- `npm run build` outputs static files to `dist/`.
- `npm run preview` serves `dist` locally (smoke test before deploy).
- **Vercel**: [`vercel.json`](vercel.json) rewrites all routes to `index.html` for client-side routing.
- **Netlify**: [`public/_redirects`](public/_redirects) is copied into `dist` on build for the same behavior.
- Deploy the **contents of `dist/`** (or connect the repo and set build command `npm run build`, publish directory `dist`).

## Authentication (Supabase)

1. Create a project at [supabase.com](https://supabase.com) and open **Project Settings → API**.
2. Copy **Project URL** and **anon public** key into `.env` (see [`.env.example`](.env.example)) as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Set `VITE_SITE_URL` in `.env` to the public app origin used in auth emails, for example `http://localhost:5173` locally or your deployed HTTPS URL in production.
4. In the Supabase **SQL Editor**, run the script in [`supabase/migrations/001_profiles.sql`](supabase/migrations/001_profiles.sql) once. It creates the `profiles` table, RLS policies, and a trigger so new sign-ups get a profile row with role `patient` or `doctor` from signup metadata.
5. Run [`002_care_relationships.sql`](supabase/migrations/002_care_relationships.sql) and [`003_prescriptions.sql`](supabase/migrations/003_prescriptions.sql) after `001` so doctors can link patients and prescriptions sync between the doctor and patient portals.
6. In Supabase **Authentication** URL settings, add the same site URL and any local/dev callback URLs you use, otherwise confirmation links can be rejected.
7. For local development, under **Authentication → Providers → Email**, you can disable **Confirm email** so sign-up returns a session immediately (optional).
8. Add the same env vars in **Vercel** (or your host) under Project → Environment Variables, then redeploy.

Patient and doctor accounts use separate sign-up flows; logging in through the wrong portal signs you out and shows an error.

