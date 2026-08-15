# Zebra Synapse — Demo & Evaluation Guide

This guide is designed for judges, evaluators, and reviewers exploring **Zebra Synapse**. Setup and deployment instructions stay in [`README.md`](../README.md). Technical architecture stays in [`architecture.md`](./architecture.md).

---

## 1. Live Deployment & Media

- **Live Web Application:** [https://zebrasynapse.vercel.app/](https://zebrasynapse.vercel.app/)
- **Demo Video Walkthrough:** [https://youtu.be/xa0-ucu9rgE?si=y67QKcMFRMQ1W2ej](https://youtu.be/xa0-ucu9rgE?si=y67QKcMFRMQ1W2ej)
- **Submission Screenshots:** Available in [`screenshots/`](./screenshots)

---

## 2. Fast Demo Setup (Local Environment)

### Option A: Standard Node.js
1. Follow standard setup in [`README.md`](../README.md) (`npm install`, configure `.env`).
2. Apply SQL migrations 001 through 020 in [`supabase/migrations/`](./supabase/migrations/).
3. Run [`supabase/migrations/seed_doctors_patients.sql`](./supabase/migrations/seed_doctors_patients.sql) to populate demo doctors, patients, care links, and historical lab panels.
4. Launch local dev server: `npm run dev` (access at `http://localhost:5173`).

### Option B: One-Command Docker Setup
1. Configure `.env` in `zebra-synapse/`: `cp zebra-synapse/.env.example zebra-synapse/.env`
2. Run production Nginx container:
   ```bash
   docker compose --profile prod up --build
   ```
3. Open `http://localhost:3000` in your browser.

---

## 3. Seed Demo Accounts & Credentials

**Shared Password for All Demo Accounts:**
```text
SeedPassword123!
```

### Clinician Accounts (Doctor Portal)
| Email | Clinician Name | Specialty / Notes |
| :--- | :--- | :--- |
| `zebra-seed-doctor-1@example.test` | Dr. Amelia Hart | Primary Care Physician (linked to Maya Thompson) |
| `zebra-seed-doctor-2@example.test` | Dr. Benjamin Ortiz | Cardiologist / Internal Medicine |
| `zebra-seed-doctor-3@example.test` | Dr. Chloe Menon | Endocrinology Specialist |

### Patient Accounts (Patient Portal)
| Email | Patient Name | Pre-loaded Records |
| :--- | :--- | :--- |
| `zebra-seed-patient-1@example.test` | Maya Thompson | 2 Published Lab Panels (`cn2.pdf`, Complete Metabolic Panel) |
| `zebra-seed-patient-3@example.test` | Sofia Bennett | Longitudinal Panel Data (Cardiovascular risk profile) |
| `zebra-seed-patient-10@example.test` | Lucas Reed | Recent Clinical Follow-up & Active Prescriptions |

---

## 4. Comprehensive Evaluation Walkthrough Flow

### Phase 1: Landing Page & 3D Visual Experience
1. Open [`/`](https://zebrasynapse.vercel.app/) or `http://localhost:5173`.
2. Observe the interactive **Three.js 3D DNA Double Helix** hero canvas with smooth mouse/touch interaction and scroll-driven unzipping transitions.
3. Click **"Patient Portal"** or **"Doctor Portal"** to navigate to the role-based auth experience.

---

### Phase 2: Patient Experience & Deterministic Insights
1. Sign in as **`zebra-seed-patient-1@example.test`** (Password: `SeedPassword123!`).
2. **Dashboard (`/patient`):** View aggregate health scores, recent biomarker badges (`normal`, `borderline`, `high`, `low`), active prescriptions, and care action timeline.
3. **Medical Records (`/patient/medical-records`):**
   - Inspect uploaded lab reports (`cn2.pdf`) and structured biomarker tables (57+ tracked biomarkers).
   - Use the **Active Report Selector** dropdown to switch between historical lab panels.
   - Observe longitudinal trend charts (Recharts) plotting historical biomarker changes over time.
4. **Deterministic Health Insights:**
   - **Disease Prediction (`/patient/disease-prediction`):** Review multi-organ risk scores (Cardiovascular, Diabetes, Renal, Hepatic, Anemia) calculated deterministically without hallucination risk.
   - **Nutrition Guidance (`/patient/nutrition`):** Check personalized dietary recommendations based on active biomarker imbalances.
   - **Clinical Trials (`/patient/clinical-trials`):** Explore dynamic ClinicalTrials.gov matches tailored to specific lab anomalies.
   - **Wellness Tips (`/patient/wellness-tips`):** Review actionable lifestyle guidance.

---

### Phase 3: Interactive AI Lab Report Chat & Clinician Verification
1. Navigate to **AI Lab Chat (`/patient/lab-chat`)**.
2. Notice the interactive 3D glowing robot mascot and collapsible chat session sidebar.
3. Ask a symptom-grounded clinical question:
   - Example prompt: *"Why do I feel dizzy and weak?"*
   - Or click the **Microphone icon** for speech-to-text voice input.
4. **Observe the Grounded AI Response:**
   - The assistant immediately identifies relevant out-of-range biomarkers (e.g. Potassium, Calcium, Vitamin B12, Hemoglobin) and explains the physiological mechanism of dizziness.
   - It avoids data dumps of unrelated biomarkers.
5. **Notice the Status Badge:** The message appears with an orange badge: **"Awaiting Doctor Verification"**.
6. Query is persisted into `lab_report_queries` for clinician review.

---

### Phase 4: Doctor Workspace & Verification Loop
1. Sign out and sign in as **`zebra-seed-doctor-1@example.test`** (Password: `SeedPassword123!`).
2. **Patient Roster (`/doctor`):** View linked patients with real-time risk indicators.
3. Click on **Maya Thompson** to open her **Patient Detail Chart (`/doctor/patient/<id>`)**:
   - Walk through the doctor tabs: Overview, Vitals, Labs, Medications, Insights, and Actions.
   - Author a new electronic prescription.
   - Log a care action (e.g. Schedule Follow-up or Lab Request).
4. **Doctor Verification of AI Chat Queries:**
   - In the patient chart, review Maya's recent query (*"Why do I feel dizzy and weak?"*).
   - Click **"Verify"** to mark the explanation as medically verified, OR click **"Revise"** to provide customized clinical instructions and notes.
5. Sign back in as the patient (`zebra-seed-patient-1@example.test`) and navigate to `/patient/lab-chat` to see the updated badge: **"Doctor Verified"** or **"Doctor Revised"**.

---

### Phase 5: Virtual Teleconsultation & Live Streaming Notes
1. In the Doctor Portal, navigate to **Teleconsultation (`/doctor/teleconsult`)**.
2. In another browser tab/window, sign in as the patient and navigate to **Teleconsultation (`/patient/teleconsult`)**.
3. Establish a peer-to-peer WebRTC video/audio call (PeerJS).
4. As the doctor types in the **Clinical Notes** panel, observe the notes stream in real time to the patient's screen via Supabase Realtime WebSocket broadcast channels (`consultation-{id}`).

---

## 5. Summary of Key Evaluation Takeaways

- **Strict Separation of Concerns:** Generative AI is restricted to OCR and grounded conversational explanation; clinical decision-making is strictly deterministic.
- **Clinician-in-the-Loop:** AI conversational answers are governed by a real-time doctor verification and replacement workflow.
- **Unified Clinical Data Model:** Patients and clinicians share a single, secure Supabase Postgres database with Row-Level Security and full mutation audit logging.
- **Production-Ready UX:** Modern glassmorphic dark theme, 3D interactive graphics, voice input, responsive layouts, and zero placeholder text.
