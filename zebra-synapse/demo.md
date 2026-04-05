# Demo Guide

This document gives judges a fast path to evaluating Zebra Synapse.

## Setup Steps

1. Open `zebra-synapse`.
2. Run `npm install`.
3. Configure environment variables from `.env.example`.
4. Start the app with `npm run dev`.

## Demo Flow

1. Sign in as a patient or doctor.
2. Show the role-based portal experience.
3. Upload or review a lab report.
4. Walk through structured biomarker output and generated insights.
5. Show prescription visibility and care action tracking.
6. Demonstrate how doctors and patients share the same underlying clinical record.

## Run Commands

```bash
npm install
npm run dev
```

Optional verification:

```bash
npm run check
```

## Sample Output

Judges should expect to see:

- patient and doctor dashboards
- lab report history and structured panel data
- prescription and care action workflows
- insight-oriented summaries derived from uploaded clinical data

## Demo Notes

- The app is built as a static React frontend with Supabase-backed data services.
- Environment variables are required for Supabase connectivity.
- Local Supabase support is available through the provided npm scripts.
