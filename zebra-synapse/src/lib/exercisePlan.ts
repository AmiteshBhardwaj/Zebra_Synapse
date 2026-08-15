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

  // 1. Blood Pressure / Hypertension
  const sbp = b["systolic_bp"] ?? b["systolic"] ?? null;
  const dbp = b["diastolic_bp"] ?? b["diastolic"] ?? null;
  if ((sbp && sbp >= 140) || (dbp && dbp >= 90)) {
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
  const glucose = b["fasting_glucose"] ?? b["glucose"] ?? null;
  const hba1c = b["hba1c"] ?? null;
  if ((glucose && glucose >= 126) || (hba1c && hba1c >= 6.5)) {
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
  const ldl = b["ldl"] ?? b["ldl_cholesterol"] ?? null;
  const tg = b["triglycerides"] ?? null;
  if ((ldl && ldl >= 160) || (tg && tg >= 200)) {
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
  const hb = b["hemoglobin"] ?? null;
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

  const days: DayWorkout[] = [
    // Day 1: Monday
    {
      dayNumber: 1,
      dayName: "Monday",
      focus: "Cardiorespiratory Foundation & Core Activation",
      intensity: fitness === "beginner" ? "Low Intensity" : "Moderate Intensity",
      estimatedDurationMin: targetTime,
      estimatedCalories: Math.round(targetTime * 6.5),
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

    // Day 2: Tuesday
    {
      dayNumber: 2,
      dayName: "Tuesday",
      focus: "Upper Body Strength & Postural Alignment",
      intensity: "Moderate Intensity",
      estimatedDurationMin: targetTime,
      estimatedCalories: Math.round(targetTime * 5.8),
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

    // Day 3: Wednesday
    {
      dayNumber: 3,
      dayName: "Wednesday",
      focus: "Active Recovery, Mobility & Post-Meal Walks",
      intensity: "Rest & Recovery",
      estimatedDurationMin: Math.min(25, targetTime),
      estimatedCalories: Math.round(targetTime * 3.8),
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

    // Day 4: Thursday
    {
      dayNumber: 4,
      dayName: "Thursday",
      focus: "Lower Body Functional Strength & Balance",
      intensity: "Moderate Intensity",
      estimatedDurationMin: targetTime,
      estimatedCalories: Math.round(targetTime * 6.2),
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
          name: "Seated Figure-4 Glute Stretch",
          category: "cooldown",
          targetMuscles: "Piriformis, Glute Medius",
          durationMin: 3,
          intensity: "low",
          instructions: "Cross one ankle over opposite knee while seated, gently hinge torso forward until stretch is felt in the hip.",
        }
      ]
    },

    // Day 5: Friday
    {
      dayNumber: 5,
      dayName: "Friday",
      focus: "Metabolic Conditioning & Full-Body Circuit",
      intensity: fitness === "advanced" ? "Challenging" : "Moderate Intensity",
      estimatedDurationMin: targetTime,
      estimatedCalories: Math.round(targetTime * 7.0),
      targetHeartRateBpm: heartRateZones.aerobicCardioZone,
      restDay: false,
      warmup: [
        {
          id: "w5",
          name: "Jumping Jacks (or Step-Jacks for Low-Impact)",
          category: "warmup",
          targetMuscles: "Full Body, Heart Rate Elevation",
          durationMin: 3,
          intensity: "low",
          instructions: "Perform rhythmic step-out jacks or gentle jumping jacks with arm raises.",
        }
      ],
      mainWorkout: [
        {
          id: "m12",
          name: "Kettlebell / Dumbbell Deadlift or Good Mornings",
          category: "strength",
          targetMuscles: "Posterior Chain, Glutes, Hamstrings, Lats",
          sets: 3,
          reps: "10-12 reps",
          restSec: 60,
          intensity: "moderate",
          instructions: "Keep spine neutral, hinge deeply at hips with soft knees, lower weight to mid-shin, then engage glutes to stand tall.",
          equipment: "Dumbbell, Kettlebell, or Resistance Band"
        },
        {
          id: "m13",
          name: "Modified Plank Hold (Forearm or Knees)",
          category: "strength",
          targetMuscles: "Core, Shoulders, Transverse Abdominis",
          sets: 3,
          durationMin: 1,
          reps: "30-45 sec hold",
          restSec: 45,
          intensity: "moderate",
          instructions: "Keep body in a straight line from head to heels. Squeeze glutes and brace core as if anticipating a light tap.",
        },
        {
          id: "m14",
          name: "Shadow Boxing / Low-Impact Cardio Intervals",
          category: "cardio",
          targetMuscles: "Cardiovascular, Deltoids, Obliques",
          durationMin: 10,
          intensity: "moderate",
          instructions: "Alternate 1 minute of rhythmic jab-cross combinations with 30 seconds of slow marching recovery.",
        }
      ],
      cooldown: [
        {
          id: "c6",
          name: "Cobra to Downward Dog Transition",
          category: "cooldown",
          targetMuscles: "Abdominals, Calves, Hamstrings",
          durationMin: 4,
          intensity: "low",
          instructions: "Gently press up into gentle cobra stretch, then push hips up and back into downward dog.",
        }
      ]
    },

    // Day 6: Saturday
    {
      dayNumber: 6,
      dayName: "Saturday",
      focus: "Aerobic Endurance & Outdoor / Lifestyle Activity",
      intensity: "Moderate Intensity",
      estimatedDurationMin: Math.max(35, targetTime),
      estimatedCalories: Math.round((targetTime + 10) * 6.0),
      targetHeartRateBpm: heartRateZones.fatBurnZone,
      restDay: false,
      warmup: [
        {
          id: "w6",
          name: "Dynamic Hip Openers & Side Lunges",
          category: "warmup",
          targetMuscles: "Adductors, Hips",
          durationMin: 4,
          intensity: "low",
          instructions: "Step side to side slowly, sinking into side lunges to open up groin and hips.",
        }
      ],
      mainWorkout: [
        {
          id: "m15",
          name: "Continuous Aerobic Activity (Cycling, Swimming, or Brisk Trail Walk)",
          category: "cardio",
          targetMuscles: "Heart, Lungs, Legs",
          durationMin: Math.max(25, targetTime - 5),
          intensity: "moderate",
          instructions: "Engage in your favorite aerobic hobby. Aim to sustain smooth aerobic Zone 2 output continuously.",
          safetyNote: "Carry a water bottle and take brief 30-second breathers if heart rate exceeds zone."
        }
      ],
      cooldown: [
        {
          id: "c7",
          name: "Full Body Static Stretch & Foam Rolling",
          category: "cooldown",
          targetMuscles: "IT Bands, Quads, Lats",
          durationMin: 5,
          intensity: "low",
          instructions: "Dedicate 1-2 minutes per major muscle group to relieve accumulated weekly tension.",
        }
      ]
    },

    // Day 7: Sunday
    {
      dayNumber: 7,
      dayName: "Sunday",
      focus: "Rest, Mindfulness & Weekly System Reset",
      intensity: "Rest & Recovery",
      estimatedDurationMin: 15,
      estimatedCalories: 65,
      targetHeartRateBpm: "Resting Zone",
      restDay: true,
      recoveryTip: "Adequate sleep and psychological relaxation decrease systemic cortisol, optimizing cellular repair and insulin sensitivity for the upcoming week.",
      warmup: [],
      mainWorkout: [
        {
          id: "m16",
          name: "Gentle Restorative Yoga / Full-Body Mobility",
          category: "mobility",
          targetMuscles: "Joint Capsules & Fascia",
          durationMin: 15,
          intensity: "low",
          instructions: "Move through gentle spinal twists, butterfly stretches, and extended neck stretches while breathing deeply.",
        }
      ],
      cooldown: [
        {
          id: "c8",
          name: "Parasympathetic 5-Minute Meditation / Savasana",
          category: "cooldown",
          targetMuscles: "Vagus Nerve & Central Nervous System",
          durationMin: 5,
          intensity: "low",
          instructions: "Lie flat in a quiet room, close your eyes, and allow every muscle group to completely release tension.",
        }
      ]
    }
  ];

  const totalActiveMin = days.reduce((acc, d) => acc + d.estimatedDurationMin, 0);
  const totalCals = days.reduce((acc, d) => acc + d.estimatedCalories, 0);
  const workoutCount = days.filter((d) => !d.restDay).length;
  const restCount = days.filter((d) => d.restDay).length;

  return {
    id: `plan-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    summary: `Personalized 7-day conditioning schedule calibrated for ${bmiCat} BMI (${bmi ? `${bmi} kg/m²` : "profile baseline"}), ${fitness} fitness level, and ${goal.replace(/_/g, " ")}.`,
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
    days,
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
  const geminiApiKey = (
    (typeof import.meta !== "undefined" && (
      (import.meta as any)?.env?.VITE_GEMINI_API_KEY ||
      (import.meta as any)?.env?.GEMINI_API_KEY
    )) ||
    ((globalThis as any)?.process?.env?.VITE_GEMINI_API_KEY) ||
    ((globalThis as any)?.process?.env?.GEMINI_API_KEY) ||
    ""
  ).trim();

  // If no Gemini API key, return deterministic clinical plan immediately
  if (!geminiApiKey) {
    return generateDeterministicExercisePlan(panel, trends, profile);
  }

  try {
    const biomarkersList: string[] = [];
    if (panel?.biomarkers) {
      for (const [k, v] of Object.entries(panel.biomarkers)) {
        if (v !== null && v !== undefined) {
          biomarkersList.push(`${k}: ${v}`);
        }
      }
    }

    const bmi = (profile.heightCm && profile.weightKg && profile.heightCm > 0)
      ? Number((profile.weightKg / Math.pow(profile.heightCm / 100, 2)).toFixed(1))
      : null;

    const prompt = `
You are Zebra Synapse AI, an elite clinical exercise physiologist and sports medicine physician.
Generate a structured, evidence-based 7-DAY WEEKLY EXERCISE & PHYSICAL ACTIVITY PLAN for a patient.

PATIENT BIOMETRICS & PROFILE:
- Fitness Level: ${profile.fitnessLevel || "beginner"}
- Available Equipment: ${profile.equipment || "home_minimal"}
- Primary Goal: ${profile.goal || "general_health"}
- Target Daily Workout Duration: ${profile.targetDurationMin || 30} minutes
- Height: ${profile.heightCm ? `${profile.heightCm} cm` : "Not provided"}
- Weight: ${profile.weightKg ? `${profile.weightKg} kg` : "Not provided"}
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
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
      console.warn("Gemini AI plan generation failed, falling back to deterministic plan", response.status);
      return generateDeterministicExercisePlan(panel, trends, profile);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
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
