import { getGeminiApiKey, getGeminiModels } from "./geminiKey";
import type { LabPanelRow } from "./labPanels";
import type { BiomarkerTrend, BiomarkerTrendMap } from "./labInsights";

export type FitnessLevel = "beginner" | "intermediate" | "advanced";
export type EquipmentAccess = "bodyweight" | "home_minimal" | "gym";
export type PrimaryGoal = "general_health" | "weight_loss" | "cardio_endurance" | "muscle_strength" | "mobility_longevity";

export type ExerciseItem = {
  id: string;
  name: string;
  category: "warmup" | "cardio" | "strength" | "mobility" | "cooldown";
  targetMuscles: string;
  sets?: number;
  reps?: string;
  durationMin?: number;
  restSec?: number;
  intensity: "low" | "moderate" | "high";
  instructions: string;
  safetyNote?: string;
  equipment?: string;
};

export type DayWorkout = {
  dayNumber: number;
  dayName: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  focus: string;
  intensity: "Rest & Recovery" | "Low Intensity" | "Moderate Intensity" | "Challenging";
  estimatedDurationMin: number;
  estimatedCalories: number;
  targetHeartRateBpm: string;
  biomarkerBadges?: string[];
  biomarkerReason?: string;
  warmup: ExerciseItem[];
  mainWorkout: ExerciseItem[];
  cooldown: ExerciseItem[];
  restDay: boolean;
  recoveryTip?: string;
};

export type ClinicalExerciseSafety = {
  id: string;
  level: "info" | "warning" | "caution";
  title: string;
  reason: string;
  guidance: string;
  contraindications: string[];
};

export type HeartRateZones = {
  restingEstimate: number;
  maxEstimate: number;
  fatBurnZone: string;
  aerobicCardioZone: string;
  anaerobicPeakZone: string;
};

export type WeeklyExercisePlan = {
  id: string;
  generatedAt: string;
  summary: string;
  goal: PrimaryGoal;
  fitnessLevel: FitnessLevel;
  equipment: EquipmentAccess;
  bmiSummary: {
    bmi: number | null;
    category: string;
    impactOnExercise: string;
  };
  heartRateZones: HeartRateZones;
  safetyPrecautions: ClinicalExerciseSafety[];
  days: DayWorkout[];
  weeklyTotals: {
    totalActiveMinutes: number;
    estimatedCaloriesBurned: number;
    workoutDaysCount: number;
    restDaysCount: number;
  };
};

export type ExerciseProfileInput = {
  fitnessLevel?: FitnessLevel;
  equipment?: EquipmentAccess;
  goal?: PrimaryGoal;
  targetDurationMin?: number;
  physicalLimitations?: string[];
  heightCm?: number | null;
  weightKg?: number | null;
  targetWeightKg?: number | null;
  weeklyPaceKg?: number | null;
  age?: number | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  heartRate?: number | null;
};

// Calculate Estimated Heart Rate Zones using Tanaka / Standard formula
export function calculateHeartRateZones(age = 40, restingHr = 70): HeartRateZones {
  const maxHr = Math.round(208 - 0.7 * age);
  const fatBurnLow = Math.round(maxHr * 0.5);
  const fatBurnHigh = Math.round(maxHr * 0.69);
  const cardioLow = Math.round(maxHr * 0.7);
  const cardioHigh = Math.round(maxHr * 0.84);
  const peakLow = Math.round(maxHr * 0.85);
  const peakHigh = Math.round(maxHr * 0.95);

  return {
    restingEstimate: restingHr,
    maxEstimate: maxHr,
    fatBurnZone: `${fatBurnLow} - ${fatBurnHigh} bpm (50-69%)`,
    aerobicCardioZone: `${cardioLow} - ${cardioHigh} bpm (70-84%)`,
    anaerobicPeakZone: `${peakLow} - ${peakHigh} bpm (85-95%)`,
  };
}

// Generate clinical safety guidelines directly from biomarkers and BMI
export function deriveClinicalExerciseSafety(
  panel?: LabPanelRow | null,
  trends?: BiomarkerTrendMap | BiomarkerTrend[],
  bmi?: number | null,
  limitations?: string[]
): ClinicalExerciseSafety[] {
  const precautions: ClinicalExerciseSafety[] = [];
  const b = panel?.biomarkers ?? {};

  // Helper to get biomarker from either top-level panel column or biomarkers map
  const getVal = (keys: string[]): number | null => {
    if (!panel) return null;
    for (const k of keys) {
      const direct = (panel as any)[k];
      if (direct !== undefined && direct !== null && typeof direct === "number" && !isNaN(direct)) return direct;
      if (b[k] !== undefined && b[k] !== null && !isNaN(Number(b[k]))) return Number(b[k]);
    }
    return null;
  };

  // 1. Blood Pressure / Hypertension
  const sbp = getVal(["systolic_bp", "systolic"]);
  const dbp = getVal(["diastolic_bp", "diastolic"]);
  if ((sbp && sbp >= 135) || (dbp && dbp >= 85)) {
    precautions.push({
      id: "bp-hypertension",
      level: "caution",
      title: "Hypertension Cardiovascular Guidance",
      reason: `Resting Blood Pressure is elevated (${sbp ?? "--"}/${dbp ?? "--"} mmHg).`,
      guidance: "Prioritize rhythmic aerobic activity (Zone 2 walking/cycling) with extended 10-minute warm-ups. Breathe continuously during strength movements.",
      contraindications: [
        "Avoid heavy maximal resistance (1RM) and Valsalva breath-holding",
        "Avoid prolonged inverted postures (e.g. decline press, headstands)",
        "Discontinue immediately if experiencing dizziness, chest pressure, or headache"
      ]
    });
  }

  // 2. Glucose & HbA1c (Diabetes / Insulin Resistance)
  const glucose = getVal(["fasting_glucose", "glucose", "blood_sugar"]);
  const hba1c = getVal(["hemoglobin_a1c", "hba1c"]);
  if ((glucose && glucose >= 110) || (hba1c && hba1c >= 5.7)) {
    precautions.push({
      id: "glycemic-control",
      level: "warning",
      title: "Glycemic & Post-Meal Protocol",
      reason: `Fasting glucose (${glucose ?? "--"} mg/dL) or HbA1c (${hba1c ?? "--"}%) indicates metabolic strain.`,
      guidance: "Moderate aerobic exercise combined with multi-joint compound resistance exercises increases GLUT4 transporter translocation, significantly improving insulin sensitivity for up to 48 hours.",
      contraindications: [
        "Schedule 15-minute brisk walks 20-30 minutes after main meals",
        "Stay well hydrated and keep fast-acting glucose accessible if on insulin or secretagogues",
        "Avoid high-intensity exhaustive exercise during unmanaged hyperglycemic spikes (> 250 mg/dL with ketones)"
      ]
    });
  }

  // 3. Lipid Profile / Cardiac Health
  const ldl = getVal(["ldl", "ldl_cholesterol"]);
  const tg = getVal(["triglycerides", "tg"]);
  if ((ldl && ldl >= 130) || (tg && tg >= 150)) {
    precautions.push({
      id: "lipid-endurance",
      level: "info",
      title: "Cardioprotective Endurance Focus",
      reason: `Elevated lipid markers (LDL: ${ldl ?? "--"} mg/dL, Triglycerides: ${tg ?? "--"} mg/dL).`,
      guidance: "Consistent moderate-intensity continuous training (MICT) stimulates lipoprotein lipase (LPL) activity, directly accelerating triglyceride clearance and elevating beneficial HDL.",
      contraindications: [
        "Maintain progressive gradual progression rather than sudden unconditioned maximal sprints",
        "Focus on accumulating at least 150-200 minutes of weekly aerobic work"
      ]
    });
  }

  // 4. Hemoglobin / Anemia / Ferritin
  const hb = getVal(["hemoglobin", "hgb"]);
  if (hb && hb < 12.0) {
    precautions.push({
      id: "anemia-pacing",
      level: "caution",
      title: "Oxygen Delivery & Low Hemoglobin Pacing",
      reason: `Hemoglobin is low (${hb} g/dL), reducing cellular oxygen transport capacity.`,
      guidance: "Keep intervals shorter with generous rest ratios (1:2 or 1:3 work-to-rest ratio). Focus on low-impact steady state exercise and submaximal strength training.",
      contraindications: [
        "Avoid breathless anaerobic exhaustion or extended HIIT",
        "Allow heart rate to fully recover between sets before next exertion"
      ]
    });
  }

  // 5. BMI considerations
  if (bmi && bmi >= 30) {
    precautions.push({
      id: "joint-friendly-loading",
      level: "info",
      title: "Low-Impact Joint Preservation",
      reason: `BMI of ${bmi.toFixed(1)} increases gravitational compressive loads on knee and ankle joints.`,
      guidance: "Emphasize low-impact modalities such as brisk incline walking, stationary cycling, swimming, rowing, and seated or supported resistance training.",
      contraindications: [
        "Minimize high-impact repetitive jumping, plyometrics, or hard pavement running until conditioned",
        "Wear well-cushioned supportive footwear"
      ]
    });
  }

  // 6. User Limitations
  if (limitations && limitations.length > 0) {
    precautions.push({
      id: "user-limitations",
      level: "warning",
      title: "Custom Orthopedic & Physical Accommodations",
      reason: `Recorded limitations: ${limitations.join(", ")}.`,
      guidance: "Movement patterns are adapted with regression options to avoid aggravating vulnerable joints or movement pathways.",
      contraindications: [
        "Never push through sharp or pinching pain",
        "Focus on neutral spine and controlled eccentric tempo"
      ]
    });
  }

  // If no precautions triggered, provide standard baseline guidance
  if (precautions.length === 0) {
    precautions.push({
      id: "baseline-wellness",
      level: "info",
      title: "Optimal Baseline Physiological Progression",
      reason: "No acute biomarker contraindications detected in recent lab panels.",
      guidance: "Follow progressive overload principles: gradually increase duration, frequency, or resistance weekly while respecting adequate recovery days.",
      contraindications: [
        "Ensure dynamic warm-up before every session",
        "Stay hydrated and maintain electrolyte balance"
      ]
    });
  }

  return precautions;
}

// Generate the 7-day plan using deterministic clinical logic
export function generateDeterministicExercisePlan(
  panel: LabPanelRow | null,
  trends?: BiomarkerTrendMap | BiomarkerTrend[],
  profile: ExerciseProfileInput = {}
): WeeklyExercisePlan {
  const fitness = profile.fitnessLevel || "beginner";
  const equipment = profile.equipment || "home_minimal";
  const goal = profile.goal || "general_health";
  const targetTime = profile.targetDurationMin || 30;

  const bmi = (profile.heightCm && profile.weightKg && profile.heightCm > 0)
    ? Number((profile.weightKg / Math.pow(profile.heightCm / 100, 2)).toFixed(1))
    : null;

  let bmiCat = "Normal";
  let bmiImpact = "Standard progressive loading suitable.";
  if (bmi) {
    if (bmi < 18.5) {
      bmiCat = "Underweight";
      bmiImpact = "Prioritize strength and muscle hypertrophy with adequate rest.";
    } else if (bmi < 25) {
      bmiCat = "Normal";
      bmiImpact = "Full range of conditioning and strength modalities optimal.";
    } else if (bmi < 30) {
      bmiCat = "Overweight";
      bmiImpact = "Blend low-impact cardiovascular fat oxidation with progressive resistance.";
    } else {
      bmiCat = "Obese";
      bmiImpact = "Low-impact joint protection protocols with metabolic pacing.";
    }
  }

  const heartRateZones = calculateHeartRateZones(profile.age || 38, profile.heartRate || 72);
  const precautions = deriveClinicalExerciseSafety(panel, trends, bmi, profile.physicalLimitations);

  const userWeight = profile.weightKg || 70;
  // Scientifically calibrated energy expenditure: kcal = MET * weight_kg * (duration_min / 60)
  const calcBurn = (met: number, duration: number) => Math.max(40, Math.round(met * userWeight * (duration / 60)));

  const isBulking = goal === "muscle_strength" || (profile.weeklyPaceKg !== undefined && profile.weeklyPaceKg !== null && profile.weeklyPaceKg > 0);
  const isCutting = goal === "weight_loss" || (profile.weeklyPaceKg !== undefined && profile.weeklyPaceKg !== null && profile.weeklyPaceKg < 0);
  const isEndurance = goal === "cardio_endurance";

  let days: DayWorkout[] = [];

  if (isBulking) {
    // -------------------------------------------------------------
    // BULKING / HYPERTROPHY PROTOCOL (Push / Pull / Legs / Upper / Posterior Chain Split)
    // -------------------------------------------------------------
    days = [
      {
        dayNumber: 1,
        dayName: "Monday",
        focus: "Push: Hypertrophy & Chest/Shoulder Power",
        intensity: "Challenging",
        estimatedDurationMin: targetTime,
        estimatedCalories: calcBurn(6.8, targetTime),
        targetHeartRateBpm: heartRateZones.fatBurnZone,
        restDay: false,
        warmup: [
          {
            id: "b_w1",
            name: "Band Dislocates & Arm Circles",
            category: "warmup",
            targetMuscles: "Shoulders, Rotator Cuff, Chest",
            durationMin: 4,
            intensity: "low",
            instructions: "Warm up shoulder joints and rotator cuffs with rhythmic pass-throughs and small-to-large arm circles.",
          },
          {
            id: "b_w2",
            name: "Scapular Push-ups & Thoracic Openers",
            category: "warmup",
            targetMuscles: "Serratus Anterior, Upper Spine",
            durationMin: 3,
            intensity: "low",
            instructions: "In a high plank, isolate scapular retraction and protraction without bending elbows.",
          }
        ],
        mainWorkout: [
          {
            id: "b_m1",
            name: equipment === "gym" ? "Incline Barbell / Dumbbell Bench Press" : "Resistance Band Incline Chest Press",
            category: "strength",
            targetMuscles: "Pectoralis Major (Clavicular Head), Anterior Deltoids",
            sets: 4,
            reps: "8-10 reps",
            restSec: 75,
            intensity: "high",
            instructions: "Lower weight with a controlled 3-second eccentric tempo, then drive explosively through chest.",
            equipment: equipment === "gym" ? "Incline Bench & Dumbbells" : "Heavy Resistance Bands"
          },
          {
            id: "b_m2",
            name: equipment === "gym" ? "Seated Dumbbell Overhead Press" : "Standing Band Overhead Shoulder Press",
            category: "strength",
            targetMuscles: "Anterior & Lateral Deltoids, Triceps",
            sets: 3,
            reps: "8-10 reps",
            restSec: 60,
            intensity: "moderate",
            instructions: "Press overhead with a neutral-to-semi-pronated grip without hyperextending your lumbar spine.",
          },
          {
            id: "b_m3",
            name: "Deficit Push-ups (Hands Elevated on Blocks/Handles)",
            category: "strength",
            targetMuscles: "Chest Stretch Hypertrophy, Triceps",
            sets: 3,
            reps: "10-12 reps",
            restSec: 60,
            intensity: "moderate",
            instructions: "Descend into a deep chest stretch at the bottom before pressing firmly back to full lockout.",
          },
          {
            id: "b_m4",
            name: "Triceps Overhead Extension / Rope Pushdown",
            category: "strength",
            targetMuscles: "Triceps (Long & Lateral Heads)",
            sets: 3,
            reps: "12-15 reps",
            restSec: 45,
            intensity: "moderate",
            instructions: "Keep elbows pinned close to ears/sides, fully contracting triceps at peak extension.",
          }
        ],
        cooldown: [
          {
            id: "b_c1",
            name: "Doorway Pectoral & Biceps Stretch",
            category: "cooldown",
            targetMuscles: "Chest, Front Deltoids",
            durationMin: 3,
            intensity: "low",
            instructions: "Hold doorway stretch gently for 30 seconds per side while taking deep restorative breaths.",
          }
        ]
      },
      {
        dayNumber: 2,
        dayName: "Tuesday",
        focus: "Pull: Back Hypertrophy & Bicep Loading",
        intensity: "Challenging",
        estimatedDurationMin: targetTime,
        estimatedCalories: calcBurn(6.5, targetTime),
        targetHeartRateBpm: heartRateZones.fatBurnZone,
        restDay: false,
        warmup: [
          {
            id: "b_w3",
            name: "Cat-Cow Spine Flow & Dead Hang Stretch",
            category: "warmup",
            targetMuscles: "Latissimus Dorsi, Spine, Decompression",
            durationMin: 4,
            intensity: "low",
            instructions: "Decompress spinal discs and activate latissimus fibers before heavy pulling.",
          }
        ],
        mainWorkout: [
          {
            id: "b_m5",
            name: equipment === "gym" ? "Lat Pulldown or Weighted Pull-ups" : "Heavy Band Lat Pulldown / Door Anchor Row",
            category: "strength",
            targetMuscles: "Latissimus Dorsi, Teres Major, Biceps",
            sets: 4,
            reps: "8-10 reps",
            restSec: 75,
            intensity: "high",
            instructions: "Drive elbows down towards hip pockets, holding a 1-second peak squeeze at bottom.",
          },
          {
            id: "b_m6",
            name: equipment === "gym" ? "Chest-Supported Dumbbell / T-Bar Row" : "Bent-Over Dumbbell / Band Row",
            category: "strength",
            targetMuscles: "Rhomboids, Mid-Trapezius, Posterior Deltoid",
            sets: 3,
            reps: "10-12 reps",
            restSec: 60,
            intensity: "moderate",
            instructions: "Pull elbows high and tight, pinching shoulder blades together firmly.",
          },
          {
            id: "b_m7",
            name: "Face Pulls with External Rotation",
            category: "strength",
            targetMuscles: "Rear Delts, Rotator Cuff, Posture",
            sets: 3,
            reps: "12-15 reps",
            restSec: 45,
            intensity: "low",
            instructions: "Pull rope or band towards bridge of nose while externally rotating hands backward.",
          },
          {
            id: "b_m8",
            name: "Incline Dumbbell / Standing Bicep Curls",
            category: "strength",
            targetMuscles: "Biceps Brachii, Brachialis",
            sets: 3,
            reps: "10-12 reps",
            restSec: 45,
            intensity: "moderate",
            instructions: "Supinate wrists at the top of the curl for maximum bicep peak contraction.",
          }
        ],
        cooldown: [
          {
            id: "b_c2",
            name: "Child's Pose with Lat Reach",
            category: "cooldown",
            targetMuscles: "Lats, Lower Back",
            durationMin: 3,
            intensity: "low",
            instructions: "Walk hands to the left for 30s, then to the right for 30s to lengthen lateral trunk.",
          }
        ]
      },
      {
        dayNumber: 3,
        dayName: "Wednesday",
        focus: "Active Recovery, Mobility & Tissue Remodeling",
        intensity: "Rest & Recovery",
        estimatedDurationMin: Math.min(25, targetTime),
        estimatedCalories: calcBurn(3.2, Math.min(25, targetTime)),
        targetHeartRateBpm: "Below 100 bpm",
        restDay: true,
        recoveryTip: "Scheduled rest day to enable muscle protein synthesis and glycogen resynthesis for the bulking surplus.",
        warmup: [],
        mainWorkout: [
          {
            id: "b_m9",
            name: "Gentle Zone-1 Recovery Stroll",
            category: "mobility",
            targetMuscles: "Full Body Circulation & Waste Clearance",
            durationMin: 18,
            intensity: "low",
            instructions: "Casual walking at an easy pace to promote nutrient delivery to recovering upper body muscles.",
          },
          {
            id: "b_m10",
            name: "Full-Body Foam Rolling & Thoracic Mobility",
            category: "mobility",
            targetMuscles: "Thoracic Spine, IT Band, Glutes",
            durationMin: 7,
            intensity: "low",
            instructions: "Spend 60 seconds rolling each tight muscle group, breathing slowly and relaxing into tender spots.",
          }
        ],
        cooldown: [
          {
            id: "b_c3",
            name: "Diaphragmatic Parasympathetic Box Breathing",
            category: "cooldown",
            targetMuscles: "Nervous System Recovery",
            durationMin: 4,
            intensity: "low",
            instructions: "Inhale 4s, hold 4s, exhale 4s, hold 4s to transition body into an anabolic recovery state.",
          }
        ]
      },
      {
        dayNumber: 4,
        dayName: "Thursday",
        focus: "Legs: Quad Dominance, Hamstrings & Calves",
        intensity: "Challenging",
        estimatedDurationMin: targetTime,
        estimatedCalories: calcBurn(7.2, targetTime),
        targetHeartRateBpm: heartRateZones.aerobicCardioZone,
        restDay: false,
        warmup: [
          {
            id: "b_w4",
            name: "Bodyweight Air Squats & Hip Opener Swings",
            category: "warmup",
            targetMuscles: "Hip Flexors, Quads, Glutes",
            durationMin: 4,
            intensity: "low",
            instructions: "Warm up knee and hip synovial fluid with deep bodyweight squats and controlled leg swings.",
          }
        ],
        mainWorkout: [
          {
            id: "b_m11",
            name: equipment === "gym" ? "Barbell / Goblet Squat" : "Dumbbell / Heavy Goblet Squat",
            category: "strength",
            targetMuscles: "Quadriceps, Gluteus Maximus, Core",
            sets: 4,
            reps: "8-10 reps",
            restSec: 90,
            intensity: "high",
            instructions: "Descend until thighs are parallel to floor, keeping chest upright and knees tracking over toes.",
          },
          {
            id: "b_m12",
            name: "Romanian Deadlifts (Dumbbell or Barbell)",
            category: "strength",
            targetMuscles: "Hamstrings, Glute-Ham Tie-in, Erector Spinae",
            sets: 3,
            reps: "8-10 reps",
            restSec: 75,
            intensity: "high",
            instructions: "Hinge deeply at hips with slight knee bend, feeling a loaded stretch in the hamstrings before driving hips forward.",
          },
          {
            id: "b_m13",
            name: "Bulgarian Split Squats (Rear Foot Elevated)",
            category: "strength",
            targetMuscles: "Single Leg Quad & Glute Hypertrophy",
            sets: 3,
            reps: "10 per leg",
            restSec: 60,
            intensity: "moderate",
            instructions: "Elevate back foot on a bench or chair. Lower front knee until thigh is parallel, driving through heel.",
          },
          {
            id: "b_m14",
            name: "Standing Calf Raises (Elevated Edge)",
            category: "strength",
            targetMuscles: "Gastrocnemius, Soleus",
            sets: 4,
            reps: "12-15 reps",
            restSec: 45,
            intensity: "moderate",
            instructions: "Full stretch at the bottom, pause 2 seconds at the peak contraction.",
          }
        ],
        cooldown: [
          {
            id: "b_c4",
            name: "Kneeling Hip Flexor & Quad Stretch",
            category: "cooldown",
            targetMuscles: "Quads, Hip Flexors",
            durationMin: 3,
            intensity: "low",
            instructions: "Tuck pelvis under and gently lean forward to stretch hip flexors for 30 seconds per side.",
          }
        ]
      },
      {
        dayNumber: 5,
        dayName: "Friday",
        focus: "Upper Body Compound Power & Shoulder Volume",
        intensity: "Challenging",
        estimatedDurationMin: targetTime,
        estimatedCalories: calcBurn(6.6, targetTime),
        targetHeartRateBpm: heartRateZones.fatBurnZone,
        restDay: false,
        warmup: [
          {
            id: "b_w5",
            name: "Arm Hugs & Overhead Reach",
            category: "warmup",
            targetMuscles: "Chest, Upper Traps",
            durationMin: 3,
            intensity: "low",
            instructions: "Swing arms across chest rhythmically to warm up upper body fascia.",
          }
        ],
        mainWorkout: [
          {
            id: "b_m15",
            name: equipment === "gym" ? "Flat Dumbbell Bench Press" : "Push-up Variations (Weighted / Banded)",
            category: "strength",
            targetMuscles: "Mid Pectorals, Anterior Deltoids, Triceps",
            sets: 3,
            reps: "8-10 reps",
            restSec: 60,
            intensity: "high",
            instructions: "Press weights up with control, tucking elbows at roughly 45 degrees to protect shoulders.",
          },
          {
            id: "b_m16",
            name: "Dumbbell / Band Lateral Raises",
            category: "strength",
            targetMuscles: "Lateral Deltoid (Shoulder Cap Width)",
            sets: 4,
            reps: "12-15 reps",
            restSec: 45,
            intensity: "moderate",
            instructions: "Raise arms out to sides with a slight forward lean, leading with elbows to target side delts.",
          },
          {
            id: "b_m17",
            name: equipment === "gym" ? "Seated Cable Row / Dumbbell Single Arm Row" : "Band Single Arm Row",
            category: "strength",
            targetMuscles: "Mid Back, Lats, Biceps",
            sets: 3,
            reps: "10 reps per side",
            restSec: 60,
            intensity: "moderate",
            instructions: "Pull elbow back past torso without twisting waist, emphasizing back thickness.",
          },
          {
            id: "b_m18",
            name: "Hammer Curls (Neutral Grip)",
            category: "strength",
            targetMuscles: "Brachioradialis, Forearms, Biceps",
            sets: 3,
            reps: "12 reps",
            restSec: 45,
            intensity: "moderate",
            instructions: "Curl weights keeping palms facing each other to build arm thickness and grip power.",
          }
        ],
        cooldown: [
          {
            id: "b_c5",
            name: "Across-Body Shoulder Stretch",
            category: "cooldown",
            targetMuscles: "Posterior Capsule, Deltoid",
            durationMin: 3,
            intensity: "low",
            instructions: "Pull one arm across chest gently with the other forearm. Hold 30s per side.",
          }
        ]
      },
      {
        dayNumber: 6,
        dayName: "Saturday",
        focus: "Posterior Chain, Glute Power & Functional Hypertrophy",
        intensity: "Moderate Intensity",
        estimatedDurationMin: targetTime,
        estimatedCalories: calcBurn(6.4, targetTime),
        targetHeartRateBpm: heartRateZones.fatBurnZone,
        restDay: false,
        warmup: [
          {
            id: "b_w6",
            name: "Glute Bridges & Ankle Rotations",
            category: "warmup",
            targetMuscles: "Gluteus Maximus, Ankle Mobilizers",
            durationMin: 3,
            intensity: "low",
            instructions: "Activate glute contractions and loosen calves before pulling movements.",
          }
        ],
        mainWorkout: [
          {
            id: "b_m19",
            name: equipment === "gym" ? "Barbell / Dumbbell Hip Thrusts" : "Single-Leg Elevated Glute Bridges",
            category: "strength",
            targetMuscles: "Gluteus Maximus, Hamstrings",
            sets: 4,
            reps: "10-12 reps",
            restSec: 60,
            intensity: "moderate",
            instructions: "Drive through heels, locking out hips at top for a 2-second hold with chin tucked.",
          },
          {
            id: "b_m20",
            name: "Walking Dumbbell Lunges",
            category: "strength",
            targetMuscles: "Quads, Glutes, Core Stability",
            sets: 3,
            reps: "10 steps per leg",
            restSec: 60,
            intensity: "moderate",
            instructions: "Step forward smoothly, maintaining upright torso and balanced stride length.",
          },
          {
            id: "b_m21",
            name: "Hanging Knee Raises or Lying Leg Raises",
            category: "strength",
            targetMuscles: "Rectus Abdominis, Hip Flexors",
            sets: 3,
            reps: "12-15 reps",
            restSec: 45,
            intensity: "moderate",
            instructions: "Curl pelvis upward at the top to fully engage lower abdominal fibers without swinging.",
          }
        ],
        cooldown: [
          {
            id: "b_c6",
            name: "Figure-4 Glute & Piriformis Stretch",
            category: "cooldown",
            targetMuscles: "Gluteals, Deep Hip Rotators",
            durationMin: 3,
            intensity: "low",
            instructions: "Cross ankle over opposite knee and gently pull thigh towards chest. Hold 30 seconds per leg.",
          }
        ]
      },
      {
        dayNumber: 7,
        dayName: "Sunday",
        focus: "Rest, Anabolic Recovery & System Reset",
        intensity: "Rest & Recovery",
        estimatedDurationMin: 15,
        estimatedCalories: calcBurn(3.0, 15),
        targetHeartRateBpm: "Resting Zone",
        restDay: true,
        recoveryTip: "Full rest day. Prioritize hydration, sleep, and meeting your calibrated daily calorie surplus to support muscular hypertrophy.",
        warmup: [],
        mainWorkout: [
          {
            id: "b_m22",
            name: "Gentle Restorative Yoga Flow",
            category: "mobility",
            targetMuscles: "Full Body Fascia & Joints",
            durationMin: 12,
            intensity: "low",
            instructions: "Flow gently through child's pose, butterfly stretch, and seated spinal twists.",
          }
        ],
        cooldown: [
          {
            id: "b_c7",
            name: "Savasana & Deep Diaphragmatic Breathing",
            category: "cooldown",
            targetMuscles: "Vagus Nerve & Nervous System",
            durationMin: 3,
            intensity: "low",
            instructions: "Lie flat on your back in quiet comfort, taking deep breaths and releasing all residual tension.",
          }
        ]
      }
    ];
  } else if (isCutting) {
    // -------------------------------------------------------------
    // CUTTING / FAT LOSS PROTOCOL (Metabolic Circuits, Zone-2 Lipolysis, High EPOC)
    // -------------------------------------------------------------
    days = [
      {
        dayNumber: 1,
        dayName: "Monday",
        focus: "Cardiorespiratory Foundation & Core Activation",
        intensity: "Moderate Intensity",
        estimatedDurationMin: targetTime,
        estimatedCalories: calcBurn(6.5, targetTime),
        targetHeartRateBpm: heartRateZones.fatBurnZone,
        restDay: false,
        warmup: [
          {
            id: "w1",
            name: "Arm Circles & Torso Twists",
            category: "warmup",
            targetMuscles: "Shoulders, Thoracic Spine",
            durationMin: 3,
            intensity: "low",
            instructions: "Perform gentle forward/reverse arm circles followed by rhythmic side-to-side torso rotations.",
          },
          {
            id: "w2",
            name: "Leg Swings & Ankle Mobilization",
            category: "warmup",
            targetMuscles: "Hip Flexors, Hamstrings, Calves",
            durationMin: 3,
            intensity: "low",
            instructions: "Hold a wall or chair for balance; gently swing each leg front-to-back and side-to-side 15 times.",
          }
        ],
        mainWorkout: [
          {
            id: "m1",
            name: equipment === "gym" ? "Incline Treadmill / Elliptical Walk" : "Zone-2 Brisk Walking with Posture Focus",
            category: "cardio",
            targetMuscles: "Cardiovascular System, Quads, Glutes",
            durationMin: Math.max(15, targetTime - 12),
            intensity: "moderate",
            instructions: "Maintain a steady conversational pace where breathing is elevated but you can speak in full sentences.",
            safetyNote: "If blood pressure is elevated, avoid sudden bursts; keep speed consistent.",
            equipment: equipment === "gym" ? "Treadmill or Elliptical" : "Walking shoes / Outdoor or Indoor space"
          },
          {
            id: "m2",
            name: "Bird-Dog Core Stabilizers",
            category: "strength",
            targetMuscles: "Transverse Abdominis, Glutes, Erector Spinae",
            sets: 3,
            reps: "10 per side",
            restSec: 45,
            intensity: "low",
            instructions: "From hands and knees, extend opposite arm and leg straight out. Hold for 2 seconds without letting lower back sag.",
          },
          {
            id: "m3",
            name: "Glute Bridges with 2-Sec Hold",
            category: "strength",
            targetMuscles: "Gluteus Maximus, Hamstrings, Pelvic Floor",
            sets: 3,
            reps: "12-15 reps",
            restSec: 45,
            intensity: "low",
            instructions: "Lie on your back, knees bent, feet flat on the floor. Drive through heels to raise hips into a straight bridge.",
          }
        ],
        cooldown: [
          {
            id: "c1",
            name: "Standing Quad & Hamstring Stretch",
            category: "cooldown",
            targetMuscles: "Anterior & Posterior Thigh",
            durationMin: 3,
            intensity: "low",
            instructions: "Hold each stretch gently for 25-30 seconds. Do not bounce.",
          },
          {
            id: "c2",
            name: "Diaphragmatic Box Breathing",
            category: "cooldown",
            targetMuscles: "Nervous System Recovery",
            durationMin: 3,
            intensity: "low",
            instructions: "Inhale through nose for 4 seconds, hold 4 seconds, exhale gently 4 seconds, hold 4 seconds.",
          }
        ]
      },
      {
        dayNumber: 2,
        dayName: "Tuesday",
        focus: "Full-Body Metabolic Resistance Circuit",
        intensity: "Challenging",
        estimatedDurationMin: targetTime,
        estimatedCalories: calcBurn(7.4, targetTime),
        targetHeartRateBpm: heartRateZones.aerobicCardioZone,
        restDay: false,
        warmup: [
          {
            id: "c_w1",
            name: "Jumping Jacks (or Low-Impact Step Jacks)",
            category: "warmup",
            targetMuscles: "Full Body Dynamic Warmup",
            durationMin: 3,
            intensity: "moderate",
            instructions: "Light rhythmic jumping to elevate core temperature and heart rate.",
          }
        ],
        mainWorkout: [
          {
            id: "c_m1",
            name: "Goblet Squat to Overhead Press (Thruster)",
            category: "strength",
            targetMuscles: "Quads, Glutes, Deltoids, Core",
            sets: 3,
            reps: "12 reps",
            restSec: 40,
            intensity: "high",
            instructions: "Squat down, then drive up dynamically using momentum to press weights overhead.",
          },
          {
            id: "c_m2",
            name: "Dumbbell / Band Renegade Rows or Bent Rows",
            category: "strength",
            targetMuscles: "Lats, Core Anti-Rotation",
            sets: 3,
            reps: "10 reps per side",
            restSec: 40,
            intensity: "moderate",
            instructions: "Row weight towards hip while keeping torso rigid and hips parallel to floor.",
          },
          {
            id: "c_m3",
            name: "Mountain Climbers or High Knees",
            category: "cardio",
            targetMuscles: "Core, Hip Flexors, Caloric Burn",
            durationMin: 5,
            intensity: "high",
            instructions: "Perform 40 seconds on, 20 seconds rest for 5 intervals.",
          }
        ],
        cooldown: [
          {
            id: "c_c1",
            name: "Cobra to Child's Pose Flow",
            category: "cooldown",
            targetMuscles: "Abdominals, Spine, Hips",
            durationMin: 3,
            intensity: "low",
            instructions: "Gently extend spine then sit back onto heels to decompress.",
          }
        ]
      },
      {
        dayNumber: 3,
        dayName: "Wednesday",
        focus: "Active Recovery, Mobility & Post-Meal Walks",
        intensity: "Rest & Recovery",
        estimatedDurationMin: Math.min(25, targetTime),
        estimatedCalories: calcBurn(3.4, Math.min(25, targetTime)),
        targetHeartRateBpm: "Below 100 bpm",
        restDay: true,
        recoveryTip: "Active recovery clears lactic acid, supports insulin sensitivity, and prevents caloric burnout.",
        warmup: [],
        mainWorkout: [
          {
            id: "m7",
            name: "Gentle Low-Impact Stroll (Post-Lunch or Dinner)",
            category: "mobility",
            targetMuscles: "Full Body Circulation",
            durationMin: 20,
            intensity: "low",
            instructions: "Take a relaxing walk outdoors or indoors. Focus on deep nasal breathing.",
          }
        ],
        cooldown: [
          {
            id: "c4",
            name: "Legs-Up-The-Wall Relaxation",
            category: "cooldown",
            targetMuscles: "Lymphatic Drainage, Parasympathetic Tone",
            durationMin: 5,
            intensity: "low",
            instructions: "Lie on your back near a wall and rest your legs vertically up against it.",
          }
        ]
      },
      {
        dayNumber: 4,
        dayName: "Thursday",
        focus: "Lower Body Functional Strength & Caloric Burn",
        intensity: "Challenging",
        estimatedDurationMin: targetTime,
        estimatedCalories: calcBurn(7.0, targetTime),
        targetHeartRateBpm: heartRateZones.aerobicCardioZone,
        restDay: false,
        warmup: [
          {
            id: "w4",
            name: "High Knees & Butt Kicks",
            category: "warmup",
            targetMuscles: "Hip Flexors, Hamstrings",
            durationMin: 3,
            intensity: "low",
            instructions: "March in place bringing knees to waist height, then gentle heel-to-glute touches.",
          }
        ],
        mainWorkout: [
          {
            id: "m9",
            name: "Chair Sit-to-Stands / Box Squats",
            category: "strength",
            targetMuscles: "Quadriceps, Gluteals, Core",
            sets: 3,
            reps: "12-15 reps",
            restSec: 45,
            intensity: "moderate",
            instructions: "Push hips back, touch the seat, then drive through heels to stand.",
          },
          {
            id: "m10",
            name: "Reverse Step Lunges",
            category: "strength",
            targetMuscles: "Quads, Hamstrings, Balance Stabilizers",
            sets: 3,
            reps: "10-12 per leg",
            restSec: 45,
            intensity: "moderate",
            instructions: "Step backward with one foot and lower back knee towards floor.",
          },
          {
            id: "m11",
            name: "Standing Calf Raises (Elevated Edge)",
            category: "strength",
            targetMuscles: "Gastrocnemius, Soleus",
            sets: 3,
            reps: "15 reps",
            restSec: 30,
            intensity: "low",
            instructions: "Rise high onto balls of feet, hold 1 second at peak.",
          }
        ],
        cooldown: [
          {
            id: "c5",
            name: "Seated Hamstring & Calf Reach",
            category: "cooldown",
            targetMuscles: "Posterior Chain",
            durationMin: 3,
            intensity: "low",
            instructions: "Sit on floor, extend legs, reach gently toward toes.",
          }
        ]
      },
      {
        dayNumber: 5,
        dayName: "Friday",
        focus: "Metabolic Conditioning & Full-Body Density Circuit",
        intensity: "Challenging",
        estimatedDurationMin: targetTime,
        estimatedCalories: calcBurn(7.5, targetTime),
        targetHeartRateBpm: heartRateZones.anaerobicPeakZone,
        restDay: false,
        warmup: [
          {
            id: "w5",
            name: "Arm Hugs & Butt Kicks",
            category: "warmup",
            targetMuscles: "Full Body Dynamic",
            durationMin: 3,
            intensity: "low",
            instructions: "Prepare joints for elevated tempo training.",
          }
        ],
        mainWorkout: [
          {
            id: "m12",
            name: "Kettlebell / Dumbbell Swings or Hip Hinges",
            category: "cardio",
            targetMuscles: "Glutes, Hamstrings, Core, Conditioning",
            sets: 4,
            reps: "15 reps",
            restSec: 45,
            intensity: "high",
            instructions: "Hinge at hips, drive forcefully with glutes to swing weight to chest level.",
          },
          {
            id: "m13",
            name: "Incline Push-ups to Plank Hold",
            category: "strength",
            targetMuscles: "Chest, Core, Shoulders",
            sets: 3,
            reps: "10 pushups + 20s hold",
            restSec: 45,
            intensity: "moderate",
            instructions: "Perform pushups with steady tempo, hold high plank at the end.",
          }
        ],
        cooldown: [
          {
            id: "c6",
            name: "Chest Opener & Deep Nasal Breathing",
            category: "cooldown",
            targetMuscles: "Respiratory System Recovery",
            durationMin: 3,
            intensity: "low",
            instructions: "Interlace fingers behind back, open chest, breathe slowly.",
          }
        ]
      },
      {
        dayNumber: 6,
        dayName: "Saturday",
        focus: "Aerobic Endurance & Extended Zone-2 Fat Oxidation",
        intensity: "Moderate Intensity",
        estimatedDurationMin: Math.max(35, targetTime),
        estimatedCalories: calcBurn(5.8, Math.max(35, targetTime)),
        targetHeartRateBpm: heartRateZones.fatBurnZone,
        restDay: false,
        warmup: [
          {
            id: "w6",
            name: "Ankle Circles & Gentle Knee Hugs",
            category: "warmup",
            targetMuscles: "Lower Extremity Joints",
            durationMin: 3,
            intensity: "low",
            instructions: "Warm ankles and knees for sustained aerobic pace.",
          }
        ],
        mainWorkout: [
          {
            id: "m14",
            name: "Extended Zone-2 Cardio (Brisk Walk / Cycle / Elliptical)",
            category: "cardio",
            targetMuscles: "Heart, Lungs, Oxidative Muscle Fibers",
            durationMin: Math.max(30, targetTime - 5),
            intensity: "moderate",
            instructions: "Maintain a steady, continuous pace in your fat-burn heart rate zone.",
          }
        ],
        cooldown: [
          {
            id: "c7",
            name: "Full-Body Static Stretches",
            category: "cooldown",
            targetMuscles: "Calves, Quads, Hamstrings",
            durationMin: 4,
            intensity: "low",
            instructions: "Hold gentle static stretches for 30 seconds each.",
          }
        ]
      },
      {
        dayNumber: 7,
        dayName: "Sunday",
        focus: "Rest, Mindfulness & Weekly System Reset",
        intensity: "Rest & Recovery",
        estimatedDurationMin: 15,
        estimatedCalories: calcBurn(3.0, 15),
        targetHeartRateBpm: "Resting Zone",
        restDay: true,
        recoveryTip: "Complete rest to restore cortisol balance and optimize metabolic adaptation.",
        warmup: [],
        mainWorkout: [
          {
            id: "m16",
            name: "Gentle Restorative Yoga / Mobility",
            category: "mobility",
            targetMuscles: "Joint Capsules & Fascia",
            durationMin: 12,
            intensity: "low",
            instructions: "Spinal twists, gentle hip openers, deep relaxation.",
          }
        ],
        cooldown: [
          {
            id: "c8",
            name: "Parasympathetic Meditation",
            category: "cooldown",
            targetMuscles: "Vagus Nerve & CNS",
            durationMin: 3,
            intensity: "low",
            instructions: "Lie flat and focus on natural breath rhythm.",
          }
        ]
      }
    ];
  } else {
    // -------------------------------------------------------------
    // LONGEVITY & GENERAL HEALTH / CARDIO ENDURANCE PROTOCOL
    // -------------------------------------------------------------
    days = [
      {
        dayNumber: 1,
        dayName: "Monday",
        focus: "Cardiorespiratory Foundation & Core Activation",
        intensity: fitness === "beginner" ? "Low Intensity" : "Moderate Intensity",
        estimatedDurationMin: targetTime,
        estimatedCalories: calcBurn(5.5, targetTime),
        targetHeartRateBpm: heartRateZones.fatBurnZone,
        restDay: false,
        warmup: [
          {
            id: "w1",
            name: "Arm Circles & Torso Twists",
            category: "warmup",
            targetMuscles: "Shoulders, Thoracic Spine",
            durationMin: 3,
            intensity: "low",
            instructions: "Perform gentle forward/reverse arm circles followed by rhythmic side-to-side torso rotations.",
          },
          {
            id: "w2",
            name: "Leg Swings & Ankle Mobilization",
            category: "warmup",
            targetMuscles: "Hip Flexors, Hamstrings, Calves",
            durationMin: 3,
            intensity: "low",
            instructions: "Hold a wall or chair for balance; gently swing each leg front-to-back and side-to-side 15 times.",
          }
        ],
        mainWorkout: [
          {
            id: "m1",
            name: equipment === "gym" ? "Incline Treadmill / Elliptical Walk" : "Zone-2 Brisk Walking with Posture Focus",
            category: "cardio",
            targetMuscles: "Cardiovascular System, Quads, Glutes",
            durationMin: Math.max(15, targetTime - 12),
            intensity: "moderate",
            instructions: "Maintain a steady conversational pace where breathing is elevated but you can speak in full sentences.",
            safetyNote: "If blood pressure is elevated, avoid sudden bursts; keep speed consistent.",
            equipment: equipment === "gym" ? "Treadmill or Elliptical" : "Walking shoes / Outdoor or Indoor space"
          },
          {
            id: "m2",
            name: "Bird-Dog Core Stabilizers",
            category: "strength",
            targetMuscles: "Transverse Abdominis, Glutes, Erector Spinae",
            sets: 3,
            reps: "10 per side",
            restSec: 45,
            intensity: "low",
            instructions: "From hands and knees, extend opposite arm and leg straight out. Hold for 2 seconds without letting lower back sag.",
          },
          {
            id: "m3",
            name: "Glute Bridges with 2-Sec Hold",
            category: "strength",
            targetMuscles: "Gluteus Maximus, Hamstrings, Pelvic Floor",
            sets: 3,
            reps: "12-15 reps",
            restSec: 45,
            intensity: "low",
            instructions: "Lie on your back, knees bent, feet flat on the floor. Drive through heels to raise hips into a straight bridge.",
          }
        ],
        cooldown: [
          {
            id: "c1",
            name: "Standing Quad & Hamstring Stretch",
            category: "cooldown",
            targetMuscles: "Anterior & Posterior Thigh",
            durationMin: 3,
            intensity: "low",
            instructions: "Hold each stretch gently for 25-30 seconds. Do not bounce.",
          },
          {
            id: "c2",
            name: "Diaphragmatic Box Breathing",
            category: "cooldown",
            targetMuscles: "Nervous System Recovery",
            durationMin: 3,
            intensity: "low",
            instructions: "Inhale through nose for 4 seconds, hold 4 seconds, exhale gently 4 seconds, hold 4 seconds.",
          }
        ]
      },
      {
        dayNumber: 2,
        dayName: "Tuesday",
        focus: "Upper Body Strength & Postural Alignment",
        intensity: "Moderate Intensity",
        estimatedDurationMin: targetTime,
        estimatedCalories: calcBurn(5.8, targetTime),
        targetHeartRateBpm: heartRateZones.fatBurnZone,
        restDay: false,
        warmup: [
          {
            id: "w3",
            name: "Band Dislocates or Towel Pass-Throughs",
            category: "warmup",
            targetMuscles: "Chest, Shoulders, Upper Back",
            durationMin: 4,
            intensity: "low",
            instructions: "Hold a resistance band or towel wide, gently bring it overhead and behind your back with straight arms.",
          }
        ],
        mainWorkout: [
          {
            id: "m4",
            name: equipment === "gym" ? "Lat Pulldown or Seated Cable Row" : "Resistance Band / Dumbbell Bent-Over Row",
            category: "strength",
            targetMuscles: "Latissimus Dorsi, Rhomboids, Biceps",
            sets: 3,
            reps: "10-12 reps",
            restSec: 60,
            intensity: "moderate",
            instructions: "Hinge at the hips, pull elbows back towards your ribs, squeezing shoulder blades together firmly at the top.",
            equipment: equipment === "gym" ? "Lat Machine / Cable" : "Resistance Band or Light Dumbbells"
          },
          {
            id: "m5",
            name: "Incline Push-ups (Wall or Bench Assisted)",
            category: "strength",
            targetMuscles: "Pectorals, Anterior Deltoids, Triceps",
            sets: 3,
            reps: "8-12 reps",
            restSec: 60,
            intensity: "moderate",
            instructions: "Place hands shoulder-width on a sturdy wall, kitchen counter, or bench. Lower chest with control, push back firmly.",
            safetyNote: "Ensure steady exhalation while pushing away to prevent blood pressure elevation."
          },
          {
            id: "m6",
            name: "Standing Dumbbell / Band Shoulder Press (Neutral Grip)",
            category: "strength",
            targetMuscles: "Deltoids, Upper Trapezius",
            sets: 3,
            reps: "10 reps",
            restSec: 60,
            intensity: "moderate",
            instructions: "With palms facing each other, press weights overhead smoothly without arching your lower back.",
          }
        ],
        cooldown: [
          {
            id: "c3",
            name: "Doorway Chest & Biceps Stretch",
            category: "cooldown",
            targetMuscles: "Chest, Anterior Shoulder",
            durationMin: 3,
            intensity: "low",
            instructions: "Place forearm against a door frame and gently rotate body away until a comfortable stretch is felt.",
          }
        ]
      },
      {
        dayNumber: 3,
        dayName: "Wednesday",
        focus: "Active Recovery, Mobility & Post-Meal Walks",
        intensity: "Rest & Recovery",
        estimatedDurationMin: Math.min(25, targetTime),
        estimatedCalories: calcBurn(3.2, Math.min(25, targetTime)),
        targetHeartRateBpm: "Below 100 bpm",
        restDay: true,
        recoveryTip: "Active recovery improves systemic blood circulation, clears metabolic waste, and maintains insulin receptor sensitivity without neurological fatigue.",
        warmup: [],
        mainWorkout: [
          {
            id: "m7",
            name: "Gentle Low-Impact Stroll (Post-Lunch or Dinner)",
            category: "mobility",
            targetMuscles: "Full Body Circulation",
            durationMin: 20,
            intensity: "low",
            instructions: "Take a relaxing walk outdoors or indoors. Focus on deep nasal breathing and loose arm swing.",
          },
          {
            id: "m8",
            name: "Cat-Cow & Child's Pose Spine Flow",
            category: "mobility",
            targetMuscles: "Spine, Hips, Lower Back",
            durationMin: 5,
            intensity: "low",
            instructions: "Alternate between arched back (cow) and rounded spine (cat) with slow inhalations and exhalations.",
          }
        ],
        cooldown: [
          {
            id: "c4",
            name: "Legs-Up-The-Wall Relaxation",
            category: "cooldown",
            targetMuscles: "Lymphatic Drainage, Parasympathetic Tone",
            durationMin: 5,
            intensity: "low",
            instructions: "Lie on your back near a wall and rest your legs vertically up against it to promote venous return.",
          }
        ]
      },
      {
        dayNumber: 4,
        dayName: "Thursday",
        focus: "Lower Body Functional Strength & Balance",
        intensity: "Moderate Intensity",
        estimatedDurationMin: targetTime,
        estimatedCalories: calcBurn(6.0, targetTime),
        targetHeartRateBpm: heartRateZones.aerobicCardioZone,
        restDay: false,
        warmup: [
          {
            id: "w4",
            name: "High Knees & Butt Kicks (Low Impact Marching)",
            category: "warmup",
            targetMuscles: "Hip Flexors, Hamstrings",
            durationMin: 3,
            intensity: "low",
            instructions: "March in place bringing knees to waist height, then transition to gentle heel-to-glute touches.",
          }
        ],
        mainWorkout: [
          {
            id: "m9",
            name: "Chair Sit-to-Stands / Box Squats",
            category: "strength",
            targetMuscles: "Quadriceps, Gluteals, Core",
            sets: 3,
            reps: "10-12 reps",
            restSec: 60,
            intensity: "moderate",
            instructions: "Stand in front of a chair with feet shoulder-width apart. Push hips back, lightly touch the seat, then drive through heels to stand.",
            safetyNote: "Do not let knees collapse inward. Keep chest tall."
          },
          {
            id: "m10",
            name: "Reverse Step Lunges (Assisted with Chair if needed)",
            category: "strength",
            targetMuscles: "Quads, Hamstrings, Balance Stabilizers",
            sets: 3,
            reps: "8-10 per leg",
            restSec: 60,
            intensity: "moderate",
            instructions: "Step backward with one foot and lower back knee towards the floor. Front knee remains aligned over ankle.",
          },
          {
            id: "m11",
            name: "Standing Calf Raises (Elevated Edge)",
            category: "strength",
            targetMuscles: "Gastrocnemius, Soleus (Muscle Pump)",
            sets: 3,
            reps: "15 reps",
            restSec: 45,
            intensity: "low",
            instructions: "Rise high onto balls of feet, hold 1 second at the peak, then lower heels slowly below step level.",
          }
        ],
        cooldown: [
          {
            id: "c5",
            name: "Seated Hamstring & Calf Reach",
            category: "cooldown",
            targetMuscles: "Hamstrings, Calves",
            durationMin: 3,
            intensity: "low",
            instructions: "Sit on floor, extend one leg, reach gently towards toes with flat back.",
          }
        ]
      },
      {
        dayNumber: 5,
        dayName: "Friday",
        focus: "Metabolic Conditioning & Full-Body Agility",
        intensity: "Moderate Intensity",
        estimatedDurationMin: targetTime,
        estimatedCalories: calcBurn(6.4, targetTime),
        targetHeartRateBpm: heartRateZones.aerobicCardioZone,
        restDay: false,
        warmup: [
          {
            id: "w5",
            name: "Shadow Boxing / Gentle Arm & Leg Punches",
            category: "warmup",
            targetMuscles: "Full Body Dynamic Warmup",
            durationMin: 4,
            intensity: "low",
            instructions: "Light forward punches and side taps to warm up the central nervous system.",
          }
        ],
        mainWorkout: [
          {
            id: "m12",
            name: "Kettlebell / Dumbbell Romanian Deadlifts",
            category: "strength",
            targetMuscles: "Hamstrings, Glutes, Erector Spinae",
            sets: 3,
            reps: "10-12 reps",
            restSec: 60,
            intensity: "moderate",
            instructions: "Hinge at the hips, keeping back flat and weights close to shins.",
          },
          {
            id: "m13",
            name: "Farmer's Walk / Loaded Carries",
            category: "strength",
            targetMuscles: "Grip Strength, Trapezius, Core Bracing",
            sets: 3,
            durationMin: 4,
            restSec: 60,
            intensity: "moderate",
            instructions: "Hold weights at sides with tall posture, take smooth controlled steps for 40 seconds.",
          }
        ],
        cooldown: [
          {
            id: "c6",
            name: "Cobra to Child's Pose Spine Stretch",
            category: "cooldown",
            targetMuscles: "Abdominal Wall, Spinal Erectors",
            durationMin: 3,
            intensity: "low",
            instructions: "Lie prone, press chest up gently (cobra), then push back onto heels (child's pose).",
          }
        ]
      },
      {
        dayNumber: 6,
        dayName: "Saturday",
        focus: "Aerobic Endurance & Outdoor / Indoor Zone-2",
        intensity: "Moderate Intensity",
        estimatedDurationMin: Math.max(30, targetTime),
        estimatedCalories: calcBurn(5.6, Math.max(30, targetTime)),
        targetHeartRateBpm: heartRateZones.fatBurnZone,
        restDay: false,
        warmup: [
          {
            id: "w6",
            name: "Ankle Circles & Dynamic Lunges",
            category: "warmup",
            targetMuscles: "Ankles, Hip Flexors",
            durationMin: 3,
            intensity: "low",
            instructions: "Rotate ankles clockwise/counterclockwise, take light step lunges.",
          }
        ],
        mainWorkout: [
          {
            id: "m14",
            name: "Continuous Zone-2 Cardio (Walking, Cycling, or Rowing)",
            category: "cardio",
            targetMuscles: "Cardiovascular System, Mitochondria",
            durationMin: Math.max(25, targetTime - 5),
            intensity: "moderate",
            instructions: "Sustain steady aerobic output where you could comfortably breathe through your nose.",
          }
        ],
        cooldown: [
          {
            id: "c7",
            name: "Standing Calf & Quad Stretches",
            category: "cooldown",
            targetMuscles: "Lower Extremity",
            durationMin: 4,
            intensity: "low",
            instructions: "Hold stretches for 30 seconds per limb.",
          }
        ]
      },
      {
        dayNumber: 7,
        dayName: "Sunday",
        focus: "Rest, Mindfulness & Weekly System Reset",
        intensity: "Rest & Recovery",
        estimatedDurationMin: 15,
        estimatedCalories: calcBurn(3.0, 15),
        targetHeartRateBpm: "Resting Zone",
        restDay: true,
        recoveryTip: "Rest allows muscles and cardiovascular structures to consolidate adaptations.",
        warmup: [],
        mainWorkout: [
          {
            id: "m16",
            name: "Gentle Restorative Yoga / Full-Body Mobility",
            category: "mobility",
            targetMuscles: "Joint Capsules & Fascia",
            durationMin: 12,
            intensity: "low",
            instructions: "Move through gentle spinal twists, butterfly stretches, and extended neck stretches.",
          }
        ],
        cooldown: [
          {
            id: "c8",
            name: "Parasympathetic 5-Minute Meditation",
            category: "cooldown",
            targetMuscles: "Vagus Nerve & Central Nervous System",
            durationMin: 3,
            intensity: "low",
            instructions: "Lie flat in a quiet room, close your eyes, and allow every muscle group to release tension.",
          }
        ]
      }
    ];
  }

  const totalActiveMin = days.reduce((acc, d) => acc + d.estimatedDurationMin, 0);
  const totalCals = days.reduce((acc, d) => acc + d.estimatedCalories, 0);
  const workoutCount = days.filter((d) => !d.restDay).length;
  const restCount = days.filter((d) => d.restDay).length;

  const badges: string[] = [];
  let mainReason = "";

  if (precautions.some((p) => p.id === "bp-hypertension")) {
    badges.push("Zone 2 BP Guardrail");
    mainReason = "Aerobic Zone 2 intensity capped to protect vascular blood pressure.";
  }
  if (precautions.some((p) => p.id === "glycemic-control")) {
    badges.push("Post-Meal Glycemic Control");
    mainReason = "Emphasizes compound movements and post-meal walks to maximize GLUT4 glucose uptake.";
  }
  if (precautions.some((p) => p.id === "lipid-endurance")) {
    badges.push("Cardioprotective MICT");
    if (!mainReason) mainReason = "Moderate aerobic continuous intervals stimulate lipoprotein lipase.";
  }
  if (precautions.some((p) => p.id === "joint-friendly-loading")) {
    badges.push("Low-Impact Joint Preservation");
    if (!mainReason) mainReason = "Low-impact exercise selections protect knee and spinal joints.";
  }
  if (precautions.some((p) => p.id === "anemia-pacing")) {
    badges.push("Oxygen Pacing");
    if (!mainReason) mainReason = "Submaximal exertion with generous recovery pauses.";
  }

  const decoratedDays = days.map((d) => ({
    ...d,
    biomarkerBadges: d.restDay ? ["Active Rest & Recovery"] : badges,
    biomarkerReason: d.restDay ? "Scheduled recovery clears metabolic waste and maintains neurological adaptation." : mainReason,
  }));

  return {
    id: `plan-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    summary: isBulking
      ? `Calibrated 7-day Hypertrophy & Progressive Overload Protocol. Tailored for muscle accumulation (${userWeight} kg → ${profile.targetWeightKg || userWeight} kg, ${profile.weeklyPaceKg ? '+' + profile.weeklyPaceKg + ' kg/wk' : 'calibrated surplus'}) with compound resistance splits and structured tissue recovery.`
      : isCutting
      ? `Calibrated 7-day Fat Loss & Metabolic Conditioning Protocol. Tailored for caloric deficit acceleration (${userWeight} kg → ${profile.targetWeightKg || userWeight} kg, ${profile.weeklyPaceKg ? profile.weeklyPaceKg + ' kg/wk' : 'calibrated deficit'}) with Zone-2 fat oxidation and circuit resistance.`
      : `Personalized 7-day conditioning schedule calibrated for ${bmiCat} BMI (${bmi ? `${bmi} kg/m²` : "profile baseline"}), ${fitness} fitness level, and ${goal.replace(/_/g, " ")}.`,
    goal,
    fitnessLevel: fitness,
    equipment,
    bmiSummary: {
      bmi,
      category: bmiCat,
      impactOnExercise: bmiImpact,
    },
    heartRateZones,
    safetyPrecautions: precautions,
    days: decoratedDays,
    weeklyTotals: {
      totalActiveMinutes: totalActiveMin,
      estimatedCaloriesBurned: totalCals,
      workoutDaysCount: workoutCount,
      restDaysCount: restCount,
    }
  };
}

// Generate plan using Gemini AI API with fallback to deterministic engine
export async function generateAIExercisePlan(
  panel: LabPanelRow | null,
  trends?: BiomarkerTrendMap | BiomarkerTrend[],
  profile: ExerciseProfileInput = {}
): Promise<WeeklyExercisePlan> {
  const geminiApiKey = getGeminiApiKey();

  // If no Gemini API key, return deterministic clinical plan immediately
  if (!geminiApiKey) {
    return generateDeterministicExercisePlan(panel, trends, profile);
  }

  try {
    const biomarkersList: string[] = [];
    if (panel) {
      const checkKeys = ["fasting_glucose", "hemoglobin_a1c", "ldl", "total_cholesterol", "triglycerides", "creatinine", "hemoglobin", "wbc", "platelets"];
      for (const k of checkKeys) {
        const val = (panel as any)[k];
        if (val !== null && val !== undefined) {
          biomarkersList.push(`${k}: ${val}`);
        }
      }
    }
    if (panel?.biomarkers) {
      for (const [k, v] of Object.entries(panel.biomarkers)) {
        if (v !== null && v !== undefined && !biomarkersList.some(b => b.startsWith(`${k}:`))) {
          biomarkersList.push(`${k}: ${v}`);
        }
      }
    }

    const bmi = (profile.heightCm && profile.weightKg && profile.heightCm > 0)
      ? Number((profile.weightKg / Math.pow(profile.heightCm / 100, 2)).toFixed(1))
      : undefined;

    const prompt = `
- Target Daily Workout Duration: ${profile.targetDurationMin || 30} minutes
- Current Weight: ${profile.weightKg ? `${profile.weightKg} kg` : "Not provided"}
- Goal Weight: ${profile.targetWeightKg ? `${profile.targetWeightKg} kg` : "Not specified"}
- Target Pace: ${profile.weeklyPaceKg ? `${profile.weeklyPaceKg > 0 ? "+" : ""}${profile.weeklyPaceKg} kg/week` : "Maintenance"}
- Height: ${profile.heightCm ? `${profile.heightCm} cm` : "Not provided"}
- Calculated BMI: ${bmi ? `${bmi} kg/m²` : "Standard"}
- Reported Physical/Joint Limitations: ${profile.physicalLimitations && profile.physicalLimitations.length > 0 ? profile.physicalLimitations.join(", ") : "None reported"}

PATIENT'S EXTRACTED LAB REPORT BIOMARKERS:
${biomarkersList.length > 0 ? biomarkersList.join("\n") : "Standard baseline parameters."}

CRITICAL MEDICAL & CLINICAL SAFETY GUARDRAILS:
1. Synthesize all lab abnormalities into specific safety precautions. For example:
   - High Blood Pressure (Systolic >= 140 or Diastolic >= 90): Strictly avoid heavy 1RM isometrics and Valsalva breath holding; emphasize Zone 2 rhythmic cardio.
   - High Glucose / HbA1c: Recommend 15-20 min post-meal walks to enhance insulin-independent GLUT4 uptake.
   - Low Hemoglobin (Anemia): Maintain short work intervals with generous rest ratios (1:2).
   - Elevated BMI (>= 30): Emphasize low-impact joint-friendly exercises (elliptical, cycling, swimming, seated strength).
2. The weekly plan MUST cover all 7 days of the week (Monday through Sunday), including 1-2 structured active recovery or rest days.
3. Every workout day MUST include:
   - Warm-up (dynamic mobility)
   - Main Workout (strength/cardio with sets, reps/duration, rest, and concise form cues)
   - Cool-down (static stretching, breathwork)

OUTPUT FORMAT:
Return ONLY a valid, parseable JSON object adhering EXACTLY to this schema (no markdown fences, no explanatory text outside the JSON):
{
  "summary": "string overview of the clinical focus",
  "bmiSummary": {
    "bmi": ${bmi ?? "null"},
    "category": "string",
    "impactOnExercise": "string"
  },
  "safetyPrecautions": [
    {
      "id": "string",
      "level": "info",
      "title": "string",
      "reason": "string",
      "guidance": "string",
      "contraindications": ["string"]
    }
  ],
  "days": [
    {
      "dayNumber": 1,
      "dayName": "Monday",
      "focus": "string",
      "intensity": "Moderate Intensity",
      "estimatedDurationMin": 30,
      "estimatedCalories": 180,
      "targetHeartRateBpm": "100 - 135 bpm",
      "restDay": false,
      "warmup": [
        {
          "id": "w1",
          "name": "string",
          "category": "warmup",
          "targetMuscles": "string",
          "durationMin": 3,
          "intensity": "low",
          "instructions": "string"
        }
      ],
      "mainWorkout": [
        {
          "id": "m1",
          "name": "string",
          "category": "strength",
          "targetMuscles": "string",
          "sets": 3,
          "reps": "10-12 reps",
          "durationMin": 15,
          "restSec": 60,
          "intensity": "moderate",
          "instructions": "string"
        }
      ],
      "cooldown": [
        {
          "id": "c1",
          "name": "string",
          "category": "cooldown",
          "targetMuscles": "string",
          "durationMin": 3,
          "intensity": "low",
          "instructions": "string"
        }
      ]
    }
  ]
}
`;

    const models = getGeminiModels();
    let rawText = "";

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.2,
                responseMimeType: "application/json",
              },
            }),
          }
        );

        if (!response.ok) {
          console.warn(`[Gemini exercise plan ${model} failed]:`, response.status);
          continue;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 0) {
          rawText = text;
          break;
        }
      } catch (err) {
        console.warn(`[Gemini exercise plan ${model} error]:`, err);
      }
    }

    if (!rawText) {
      console.warn("All Gemini models failed for exercise plan generation, falling back to deterministic plan");
      return generateDeterministicExercisePlan(panel, trends, profile);
    }

    const parsed = JSON.parse(rawText.trim());
    const heartRateZones = calculateHeartRateZones(profile.age || 38, profile.heartRate || 72);

    const totalActiveMin = (parsed.days || []).reduce((acc: number, d: any) => acc + (d.estimatedDurationMin || 0), 0);
    const totalCals = (parsed.days || []).reduce((acc: number, d: any) => acc + (d.estimatedCalories || 0), 0);
    const workoutCount = (parsed.days || []).filter((d: any) => !d.restDay).length;
    const restCount = (parsed.days || []).filter((d: any) => d.restDay).length;

    return {
      id: `plan-ai-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      summary: parsed.summary || "AI-generated personalized weekly exercise plan.",
      goal: profile.goal || "general_health",
      fitnessLevel: profile.fitnessLevel || "beginner",
      equipment: profile.equipment || "home_minimal",
      bmiSummary: parsed.bmiSummary || {
        bmi,
        category: "Calculated",
        impactOnExercise: "Adjusted for patient physical profile.",
      },
      heartRateZones,
      safetyPrecautions: parsed.safetyPrecautions?.length
        ? parsed.safetyPrecautions
        : deriveClinicalExerciseSafety(panel, trends, bmi, profile.physicalLimitations),
      days: parsed.days || [],
      weeklyTotals: {
        totalActiveMinutes: totalActiveMin,
        estimatedCaloriesBurned: totalCals,
        workoutDaysCount: workoutCount,
        restDaysCount: restCount,
      }
    };
  } catch (err) {
    console.error("Error invoking Gemini for Exercise Plan, using fallback:", err);
    return generateDeterministicExercisePlan(panel, trends, profile);
  }
}
