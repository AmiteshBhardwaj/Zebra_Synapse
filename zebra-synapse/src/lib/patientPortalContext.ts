import { type Profile } from "../auth/types";
import { type LabPanelRow } from "./labPanels";
import { type MetricAssessment, getDiseasePredictions, getWellnessTips, getTrialMatches, getMetricAssessments } from "./labInsights";
import { doctorOptions, type Appointment } from "../app/pages/patient/Appointments";
import { prescriptionHeading, getStoredPrescriptions, type PrescriptionRow } from "./prescriptions";

export interface ZebraSynapseKnowledge {
  name: string;
  tagline: string;
  mission: string;
  capabilities: string[];
  leftbarTabsGuide: Record<string, { title: string; route: string; description: string; keyActions: string[] }>;
  safetyAndPrivacy: string[];
  doctorVerificationWorkflow: string;
}

export const ZEBRA_SYNAPSE_KNOWLEDGE: ZebraSynapseKnowledge = {
  name: "Zebra Synapse",
  tagline: "Your Smart AI Health Companion & Clinical Co-Pilot",
  mission: "Empower patients with clinical-grade, empathetic health intelligence while maintaining continuous doctor-in-the-loop oversight to ensure 100% medically verified care.",
  capabilities: [
    "Omni-portal patient health assistant: answers questions across all leftbar tabs and medical data.",
    "3D Anatomical Health Twin: interactive visual body mapping connecting abnormal biomarkers to organ systems.",
    "Automated Lab Extraction & Multi-Report Synthesis: extracts 40+ biomarker panels from PDFs/images and tracks longitudinal trends.",
    "Personalized Diet & Fitness Planning: generates 7-day meal plans and workouts tailored to lab flags and dietary preferences (Vegan, Vegetarian, Jain, Gluten-Free, etc.).",
    "Predictive Disease Risk Modeling: rule-based and AI assessment of Type 2 Diabetes, Cardiovascular Disease, Hypertension, and Metabolic Syndrome.",
    "Clinical Trial Matching: matches patients with eligible clinical trials and studies based on active biomarkers.",
    "Doctor-in-the-Loop Verification: all clinical AI answers are dispatched to the connected doctor's review queue for verification or replacement.",
    "Teleconsultation & Direct Messaging: seamless real-time video consults and messaging with primary care physicians."
  ],
  leftbarTabsGuide: {
    overview: {
      title: "Health Overview",
      route: "/patient",
      description: "Interactive 3D anatomical twin, overall vitals, abnormal biomarker alerts, and quick health status metrics.",
      keyActions: ["Inspect organ systems", "Review recent vitals", "Upload new lab report"]
    },
    medicalRecords: {
      title: "Medical Records",
      route: "/patient/medical-records",
      description: "Complete repository of uploaded lab reports, extractions, raw values, and historical comparisons.",
      keyActions: ["Upload PDF/Image report", "View extracted biomarker panels", "Compare past reports"]
    },
    aiChat: {
      title: "Synapse Chat (AI Assistant)",
      route: "/patient/ai-chat",
      description: "Intelligent health co-pilot capable of answering questions about any portal tab, lab values, medications, appointments, diet, fitness, and platform features.",
      keyActions: ["Ask health and symptom questions", "Get explanations of lab tests", "Ask about appointments, diet, and prescriptions"]
    },
    appointments: {
      title: "Appointments",
      route: "/patient/appointments",
      description: "Schedule, reschedule, or cancel doctor consultations; view upcoming and past appointment details.",
      keyActions: ["Book consultation with specialist or primary doctor", "Reschedule appointments", "View clinic locations and consultation notes"]
    },
    teleconsult: {
      title: "Teleconsultation & Messages",
      route: "/patient/teleconsult",
      description: "Virtual video consultations with doctors, direct messaging, digital prescription slips, and post-visit clinical notes.",
      keyActions: ["Enter video consultation waiting room", "Send messages to care team", "Download consultation summaries"]
    },
    prescription: {
      title: "Prescriptions",
      route: "/patient/prescription",
      description: "Digital medication vault showing active prescriptions, dosage schedules, prescribing doctor, refills, and food interactions.",
      keyActions: ["View active medications", "Request prescription refills", "Check dosage instructions"]
    },
    diseasePrediction: {
      title: "Disease Prediction",
      route: "/patient/disease-prediction",
      description: "Predictive risk intelligence analyzing chronic disease risks (Cardiovascular, Diabetes, Hypertension, Renal) from biomarker trends.",
      keyActions: ["Review risk percentages", "Understand key biomarker drivers", "Follow clinical prevention protocols"]
    },
    dietFitness: {
      title: "Diet & Fitness",
      route: "/patient/diet-fitness",
      description: "Unified lifestyle hub with 7-day personalized meal plans, macro targets (Protein/Carbs/Fat), daily water tracking, and customized workout regimens.",
      keyActions: ["View daily meal plan", "Log water intake", "Complete daily workouts", "Update dietary preferences"]
    },
    clinicalTrials: {
      title: "Clinical Trials",
      route: "/patient/clinical-trials",
      description: "AI-matched clinical studies and trials matching the patient's biomarker profile, condition, and location.",
      keyActions: ["Browse matched clinical trials", "Review trial eligibility and phases", "Inquire about trial enrollment"]
    },
    wellnessTips: {
      title: "Wellness Tips",
      route: "/patient/wellness-tips",
      description: "Daily actionable lifestyle, sleep, recovery, and stress management guidance tailored to lab results.",
      keyActions: ["Read personalized recovery tips", "Implement preventive daily habits"]
    },
    settings: {
      title: "Profile & Settings",
      route: "/patient/settings",
      description: "Personal health profile, dietary preferences (Vegan, Jain, Low-carb, etc.), food allergies, height/weight/BMI, and emergency contacts.",
      keyActions: ["Update dietary preferences & allergies", "Edit height & weight", "Manage profile information"]
    }
  },
  safetyAndPrivacy: [
    "HIPAA & GDPR-aligned architecture: patient data is isolated, encrypted, and accessible only to authorized care teams.",
    "Doctor-in-the-loop oversight: clinical interpretations are reviewed and verified by licensed physicians.",
    "Deterministic offline fallback: when generative AI is unavailable, a rule-based clinical engine provides 100% reliable biomarker guidance."
  ],
  doctorVerificationWorkflow: "When a patient asks a medical or symptom-related question, Zebra Synapse AI provides an immediate grounded answer and automatically dispatches the query to the connected doctor's portal queue. The doctor reviews, verifies, or provides notes/replacements, giving the patient doctor-verified confidence."
};

export interface PatientPortalContextData {
  profile: {
    fullName: string;
    role: string;
    email?: string;
    phone?: string;
    emergencyContact?: string;
    primaryDoctor?: string;
  };
  dietAndProfileSettings: {
    dietaryPreference: string;
    foodAllergies: string[];
    dietaryConditions: string[];
    dietaryNotes: string;
    heightCm?: number;
    weightKg?: number;
    bmi?: number;
    bmiCategory?: string;
  };
  overview: {
    activeReportCount: number;
    totalBiomarkersCount: number;
    abnormalBiomarkersCount: number;
    abnormalBiomarkers: string[];
  };
  medicalRecords: {
    reports: Array<{ id: string; filename: string; date: string; biomarkerCount: number }>;
    activeReportName: string;
  };
  prescriptions: Array<{
    id: string;
    heading: string;
    details: string;
    status: string;
    prescribedBy: string;
    date: string;
  }>;
  appointments: {
    upcoming: Array<{
      id: string | number;
      doctor: string;
      specialty: string;
      date: string;
      time: string;
      location?: string;
      status: string;
    }>;
    past: Array<{
      id: string | number;
      doctor: string;
      specialty: string;
      date: string;
      time: string;
      status: string;
      notes?: string;
    }>;
  };
  diseasePredictions: Array<{
    title: string;
    level: string;
    rationale: string;
    nextStep: string;
    triggeredBiomarkers?: string[];
  }>;
  dietAndFitness: {
    preference: string;
    dailyCaloriesTarget: number;
    macros: { proteinG: number; carbsG: number; fatG: number };
    todayMealHighlights: string[];
    todayWorkoutHighlights: string[];
    waterLoggedMl?: number;
  };
  clinicalTrials: Array<{
    title: string;
    summary: string;
    query: string;
    searchUrl: string;
    studiesCount: number;
    sampleStudy: string;
  }>;
  wellnessTips: string[];
}

/**
 * Assembles full patient portal context from available hooks and local storage.
 */
export function assemblePatientPortalContext(options: {
  profile: Profile | null;
  panels: LabPanelRow[];
  activePanel: LabPanelRow | null;
  uploads: Array<{ id: string; original_filename: string; created_at: string }>;
  selectedReportId?: string;
}): PatientPortalContextData {
  const { profile, panels, activePanel, uploads } = options;
  const userId = profile?.id || "default";

  // 1. Dietary settings
  let dietPreference = "omnivore";
  let foodAllergies: string[] = [];
  let dietaryConditions: string[] = [];
  let dietaryNotes = "";
  try {
    const rawDiet = localStorage.getItem(`zebra_diet_settings_${userId}`);
    if (rawDiet) {
      const parsed = JSON.parse(rawDiet);
      dietPreference = parsed.dietary_preference || parsed.dietaryPreference || "omnivore";
      foodAllergies = parsed.food_allergies || parsed.foodAllergies || [];
      dietaryConditions = parsed.dietary_conditions || parsed.dietaryConditions || [];
      dietaryNotes = parsed.dietary_notes || parsed.dietaryNotes || "";
    }
  } catch {
    // ignore
  }

  // Height & Weight & BMI
  const heightCm = profile?.height_cm || 170;
  const weightKg = profile?.weight_kg || 68;
  const bmiVal = Number((weightKg / Math.pow(heightCm / 100, 2)).toFixed(1));
  let bmiCategory = "Normal weight";
  if (bmiVal < 18.5) bmiCategory = "Underweight";
  else if (bmiVal >= 25 && bmiVal < 30) bmiCategory = "Overweight";
  else if (bmiVal >= 30) bmiCategory = "Obese";

  // 2. Overview & Biomarkers
  const allMetrics: MetricAssessment[] = activePanel ? getMetricAssessments(activePanel) : [];
  const abnormalMetrics = allMetrics.filter((m) => m.status === "high" || m.status === "low" || m.status === "borderline");

  // 3. Prescriptions
  const patientPrescriptions = getStoredPrescriptions(userId);
  const formattedRx = patientPrescriptions.map((rx) => ({
    id: rx.id,
    heading: prescriptionHeading(rx.details),
    details: rx.details,
    status: rx.status,
    prescribedBy: rx.prescriber?.full_name || "Care Team Doctor",
    date: rx.created_at.slice(0, 10),
  }));

  // 4. Appointments
  const defaultAppointments: Appointment[] = [
    {
      id: 1,
      doctor: "Dr. Amelia Hart",
      specialty: "Internal Medicine & Primary Care",
      date: "2026-08-25",
      time: "10:00 AM",
      location: "Zebra Synapse Health Center, Suite 402",
      status: "Confirmed",
      notes: "Follow-up consultation for comprehensive metabolic & CBC panel review."
    },
    {
      id: 2,
      doctor: "Dr. Benjamin Ortiz",
      specialty: "Endocrinologist",
      date: "2026-09-02",
      time: "2:30 PM",
      location: "Endocrine & Metabolic Suite, Floor 3",
      status: "Confirmed",
      notes: "Routine check-in on HbA1c, fasting glucose levels, and diet adherence."
    },
    {
      id: 3,
      doctor: "Dr. Chloe Menon",
      specialty: "Cardiologist",
      date: "2026-04-15",
      time: "10:00 AM",
      location: "Heart & Vascular Center, Suite 402",
      status: "Completed",
      notes: "Cardiology follow-up completed. ECG trace normal. Blood pressure controlled. Continue current medication."
    }
  ];

  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingApts = defaultAppointments.filter((a) => a.date >= todayStr && a.status !== "Completed" && a.status !== "Cancelled");
  const pastApts = defaultAppointments.filter((a) => a.date < todayStr || a.status === "Completed");

  // 5. Disease Predictions
  const predictions = activePanel ? getDiseasePredictions(activePanel, {}) : [];
  const formattedPredictions = predictions.map((p) => ({
    title: p.title,
    level: p.level,
    rationale: p.rationale,
    nextStep: p.nextStep,
    triggeredBiomarkers: p.triggeredBiomarkers?.map((b) => `${b.label}: ${b.value} ${b.unit} (${b.status.toUpperCase()})`) || []
  }));

  // 6. Clinical Trials
  const trials = activePanel ? getTrialMatches(activePanel) : [];
  const formattedTrials = trials.map((t) => ({
    title: t.title,
    summary: t.summary,
    query: t.query,
    searchUrl: t.searchUrl,
    studiesCount: t.studies?.length || 0,
    sampleStudy: t.studies?.[0]?.title || "Research Study"
  }));

  // 7. Wellness Tips
  const tips = activePanel ? getWellnessTips(activePanel, {}) : [];
  const tipStrings = tips.map((t) => `${t.title}: ${t.detail}`);

  // 8. Diet & Fitness Highlights
  const isVegan = dietPreference.toLowerCase().includes("vegan");
  const isVeg = dietPreference.toLowerCase().includes("veg") && !isVegan;
  const isJain = dietPreference.toLowerCase().includes("jain");

  let mealHighlights = [
    "Breakfast: High-protein oatmeal with chia seeds, crushed almonds, and organic berries (380 kcal, 18g protein)",
    "Lunch: Grilled tofu quinoa bowl with steamed broccoli, bell peppers, and tahini lemon dressing (520 kcal, 26g protein)",
    "Snack: Roasted chickpeas and green tea with lemon (180 kcal, 8g protein)",
    "Dinner: Hearty red lentil curry (Dal) with brown rice and baby spinach (480 kcal, 22g protein)"
  ];
  if (!isVegan && !isVeg && !isJain) {
    mealHighlights = [
      "Breakfast: 2 poached eggs with avocado toast and grilled tomatoes (410 kcal, 24g protein)",
      "Lunch: Mediterranean grilled chicken salad with olive oil, walnuts, and quinoa (540 kcal, 38g protein)",
      "Snack: Greek yogurt with chia seeds and mixed berries (190 kcal, 15g protein)",
      "Dinner: Baked wild salmon with roasted asparagus and sweet potato (510 kcal, 36g protein)"
    ];
  }

  const workoutHighlights = [
    "Warm-up: 5-minute dynamic joint mobility and diaphragmatic breathing",
    "Main Exercise: 25-minute low-impact zone 2 cardio & bodyweight squats / wall push-ups",
    "Cool-down: 5-minute hamstring, chest opening, and spinal twist stretches"
  ];

  return {
    profile: {
      fullName: profile?.full_name || "Patient",
      role: profile?.role || "patient",
      primaryDoctor: "Dr. Amelia Hart (Internal Medicine)"
    },
    dietAndProfileSettings: {
      dietaryPreference: dietPreference,
      foodAllergies,
      dietaryConditions,
      dietaryNotes,
      heightCm,
      weightKg,
      bmi: bmiVal,
      bmiCategory
    },
    overview: {
      activeReportCount: uploads.length,
      totalBiomarkersCount: allMetrics.length,
      abnormalBiomarkersCount: abnormalMetrics.length,
      abnormalBiomarkers: abnormalMetrics.map((m) => `${m.label}: ${m.value} ${m.unit} (${m.status.toUpperCase()})`)
    },
    medicalRecords: {
      reports: uploads.map((u) => ({
        id: u.id,
        filename: u.original_filename,
        date: u.created_at.slice(0, 10),
        biomarkerCount: panels.find((p) => p.upload_id === u.id)?.biomarkers ? Object.keys(panels.find((p) => p.upload_id === u.id)!.biomarkers!).length : 0
      })),
      activeReportName: activePanel ? (uploads.find((u) => u.id === activePanel.upload_id)?.original_filename || "Active Lab Panel") : "Latest Health Record"
    },
    prescriptions: formattedRx,
    appointments: {
      upcoming: upcomingApts,
      past: pastApts
    },
    diseasePredictions: formattedPredictions,
    dietAndFitness: {
      preference: dietPreference.toUpperCase(),
      dailyCaloriesTarget: 1850,
      macros: { proteinG: 85, carbsG: 210, fatG: 50 },
      todayMealHighlights: mealHighlights,
      todayWorkoutHighlights: workoutHighlights,
      waterLoggedMl: 1750
    },
    clinicalTrials: formattedTrials,
    wellnessTips: tipStrings
  };
}

/**
 * Builds comprehensive LLM prompt context covering all portal tabs and Zebra Synapse platform knowledge.
 */
export function buildOmniContextPromptString(portalData: PatientPortalContextData): string {
  const sections: string[] = [];

  // Platform knowledge
  sections.push(`
=== ZEBRA SYNAPSE PLATFORM IDENTITY & FEATURES ===
- Mission: ${ZEBRA_SYNAPSE_KNOWLEDGE.mission}
- Core Capabilities:
${ZEBRA_SYNAPSE_KNOWLEDGE.capabilities.map((c) => `  * ${c}`).join("\n")}
- Leftbar Tabs Directory:
${Object.entries(ZEBRA_SYNAPSE_KNOWLEDGE.leftbarTabsGuide)
  .map(([k, v]) => `  * ${v.title} (${v.route}): ${v.description} | Key Actions: ${v.keyActions.join(", ")}`)
  .join("\n")}
- Doctor Verification: ${ZEBRA_SYNAPSE_KNOWLEDGE.doctorVerificationWorkflow}
- Safety & Privacy: ${ZEBRA_SYNAPSE_KNOWLEDGE.safetyAndPrivacy.join(" ")}
`);

  // Patient Profile & Vitals
  sections.push(`
=== PATIENT PROFILE & VITALS ===
- Name: ${portalData.profile.fullName}
- Primary Doctor: ${portalData.profile.primaryDoctor}
- Height: ${portalData.dietAndProfileSettings.heightCm} cm | Weight: ${portalData.dietAndProfileSettings.weightKg} kg | BMI: ${portalData.dietAndProfileSettings.bmi} kg/m² (${portalData.dietAndProfileSettings.bmiCategory})
- Dietary Preference: ${portalData.dietAndProfileSettings.dietaryPreference.toUpperCase()}
- Food Allergies: ${portalData.dietAndProfileSettings.foodAllergies.length > 0 ? portalData.dietAndProfileSettings.foodAllergies.join(", ") : "None reported"}
- Chronic/Digestive Conditions: ${portalData.dietAndProfileSettings.dietaryConditions.length > 0 ? portalData.dietAndProfileSettings.dietaryConditions.join(", ") : "None reported"}
- Dietary Notes: ${portalData.dietAndProfileSettings.dietaryNotes || "None"}
`);

  // Lab Reports & Biomarkers
  sections.push(`
=== MEDICAL RECORDS & ACTIVE LAB FINDINGS ===
- Active Report: ${portalData.medicalRecords.activeReportName}
- Total Reports on File: ${portalData.overview.activeReportCount}
- Total Biomarkers Analyzed: ${portalData.overview.totalBiomarkersCount}
- Abnormal/Out-of-Range Markers:
${portalData.overview.abnormalBiomarkers.length > 0 ? portalData.overview.abnormalBiomarkers.map((m) => `  * ${m}`).join("\n") : "  * All extracted biomarkers within normal reference ranges"}
`);

  // Prescriptions
  sections.push(`
=== ACTIVE PRESCRIPTIONS & MEDICATIONS ===
${portalData.prescriptions.length > 0 ? portalData.prescriptions.map((rx) => `  * [${rx.status.toUpperCase()}] ${rx.heading} (Prescribed by: ${rx.prescribedBy}, Date: ${rx.date})\n    Details: ${rx.details.replace(/\n/g, " ")}`).join("\n") : "  * No active prescriptions on file"}
`);

  // Appointments
  sections.push(`
=== SCHEDULED APPOINTMENTS ===
- Upcoming Appointments:
${portalData.appointments.upcoming.length > 0 ? portalData.appointments.upcoming.map((a) => `  * ${a.doctor} (${a.specialty}) on ${a.date} at ${a.time} - Location: ${a.location} [Status: ${a.status}]`).join("\n") : "  * No upcoming appointments currently scheduled"}
- Recent Past Consultations:
${portalData.appointments.past.length > 0 ? portalData.appointments.past.map((a) => `  * ${a.doctor} on ${a.date} - Notes: ${a.notes || "Completed"}`).join("\n") : "  * No past appointments recorded"}
`);

  // Disease Risk Predictions
  sections.push(`
=== DISEASE PREDICTIONS & RISK ASSESSMENTS ===
${portalData.diseasePredictions.length > 0 ? portalData.diseasePredictions.map((d) => `  * ${d.title}: ${d.level.toUpperCase()} RISK\n    Rationale: ${d.rationale}\n    Next Step: ${d.nextStep}${d.triggeredBiomarkers && d.triggeredBiomarkers.length > 0 ? `\n    Drivers: ${d.triggeredBiomarkers.join(", ")}` : ""}`).join("\n") : "  * No elevated chronic disease risks detected from current biomarkers"}
`);

  // Diet & Fitness Plan
  sections.push(`
=== PERSONALIZED DIET & FITNESS PLAN ===
- Target Daily Nutrition: ${portalData.dietAndFitness.dailyCaloriesTarget} kcal | Protein: ${portalData.dietAndFitness.macros.proteinG}g | Carbs: ${portalData.dietAndFitness.macros.carbsG}g | Fat: ${portalData.dietAndFitness.macros.fatG}g
- Water Logged Today: ${portalData.dietAndFitness.waterLoggedMl} mL / 2500 mL target
- Today's Meal Plan Highlights:
${portalData.dietAndFitness.todayMealHighlights.map((m) => `  * ${m}`).join("\n")}
- Today's Exercise & Movement Routine:
${portalData.dietAndFitness.todayWorkoutHighlights.map((w) => `  * ${w}`).join("\n")}
`);

  // Clinical Trials
  sections.push(`
=== MATCHED CLINICAL TRIALS ===
${portalData.clinicalTrials.length > 0 ? portalData.clinicalTrials.map((t) => `  * ${t.title} - ${t.summary} (Relevant Study: ${t.sampleStudy})`).join("\n") : "  * No active clinical trials matched to current profile"}
`);

  // Wellness Tips
  sections.push(`
=== PERSONALIZED WELLNESS TIPS ===
${portalData.wellnessTips.length > 0 ? portalData.wellnessTips.map((t) => `  * ${t}`).join("\n") : "  * Stay hydrated, maintain 7-8 hours of sleep, and adhere to balanced nutritional intake"}
`);

  return sections.join("\n");
}
