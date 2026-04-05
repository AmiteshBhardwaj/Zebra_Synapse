# System Architecture

Zebra Synapse is built as a modern web application that combines a responsive clinical workflow frontend with a secure Supabase backend and a lightweight report-processing pipeline.

## Components

- **Frontend:** A React and TypeScript frontend built with Vite powers the doctor and patient portals, dashboards, uploads, and insight views.
- **Authentication and Access Control:** Supabase Auth manages signup, login, session persistence, and role-aware access for doctor and patient users.
- **Clinical Data Layer:** Supabase Postgres stores profiles, care relationships, prescriptions, lab reports, lab panels, and care actions with row-level security.
- **Data Pipeline:** Lab reports are parsed in the browser with PDF.js, normalized into biomarker data, and persisted as structured clinical records.
- **Inference Layer:** Deterministic rules analyze biomarkers and health metadata to generate explainable patient-facing and clinician-facing insights.

## Data Flow

1. A doctor or patient signs in through the web portal.
2. Supabase validates the session and loads the corresponding user profile.
3. A patient uploads a lab report or a doctor reviews a linked patient record.
4. PDF content is extracted in the browser and mapped into normalized biomarker entries.
5. Structured lab panels and related records are saved in Supabase.
6. Zebra Synapse renders dashboards, prescriptions, care actions, and health insights from the stored data.

## APIs Used

- **Supabase API:** authentication, relational database access, and storage
- **PDF.js:** client-side PDF text extraction for medical report ingestion

## AI Model Usage

Zebra Synapse uses an AI-style clinical insight workflow rather than a black-box diagnostic model. The platform converts raw health records into structured biomarker panels and applies deterministic interpretation logic to generate explainable insights, trends, and care-oriented summaries. This design improves trust, traceability, and practical use in a hackathon healthcare setting.
