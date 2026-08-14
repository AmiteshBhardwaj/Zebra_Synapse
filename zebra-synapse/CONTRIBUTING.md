# Contributing to Zebra Synapse

Thank you for contributing to Zebra Synapse! Please review this document for development workflows, testing expectations, and contribution standards.

For setup and deployment prerequisites, consult [`README.md`](./README.md). For system architecture and component structure, consult [`architecture.md`](./architecture.md).

---

## 1. Local Development Workflow

1. Clone the repository and navigate to `zebra-synapse/`:
   ```bash
   cd zebra-synapse
   ```
2. Ensure Node.js `20.19.0` and npm `11.6.2` are installed.
3. Install project dependencies:
   ```bash
   npm install
   ```
4. Configure local environment variables:
   ```bash
   cp .env.example .env
   ```
5. If using local Supabase containers:
   ```bash
   npm run supabase:start
   npm run env:local
   ```
6. Start the development server:
   ```bash
   npm run dev
   ```

---

## 2. Code Standards & Boundaries

- **Directory Boundaries:** All production code belongs in `src/`, `public/`, or `supabase/`. Research experiments belong in `research/` and must never be imported into product runtime.
- **Deterministic Clinical Logic:** Keep clinical scoring, disease prediction algorithms, and biomarker normalizations in `src/lib/labInsights.ts` and `src/lib/biomarkerCatalog.ts` deterministic.
- **AI Integration Boundaries:** Use Google Gemini API exclusively for document parsing and grounded conversational assistance.
- **Database Security:** Every table containing patient or clinical data must have Row-Level Security (RLS) enabled and include entries for mutation audit logging (`audit_phi_mutation`).
- **Secrets & Sensitive Data:** Never commit `.env` files, Supabase `service_role` keys, API credentials, or unencrypted PHI.

---

## 3. Pull Request Standards

- **Atomic Scope:** Keep each PR focused on a single feature, bug fix, or documentation update.
- **UI Changes:** Include screenshots or screen recordings for any visible UI modifications.
- **Schema & Migration Impact:** Note any changes to `supabase/migrations/` and include forward-compatible SQL.
- **Verification:** Ensure all automated checks pass locally before opening a pull request:
  ```bash
  npm run typecheck
  npm run build
  npm run check
  ```
