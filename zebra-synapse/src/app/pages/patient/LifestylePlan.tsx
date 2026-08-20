import { useState, useEffect, useMemo } from "react";
import {
  Flame,
  Apple,
  Droplets,
  Plus,
  Trash2,
  Calendar,
  SlidersHorizontal,
  RefreshCw,
  Search,
  ShoppingCart,
  Check,
  ShieldCheck,
  Activity,
  HeartPulse,
  Zap,
  Dumbbell,
  Bot,
  Send,
  Copy,
  Heart,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../../../auth/AuthContext";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { useActiveReport } from "../../../hooks/useActiveReport";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
import ReportScopeSelector from "../../components/patient/ReportScopeSelector";
import {
  PatientPortalPage,
  PatientPageHero,
  portalPanelClass,
  portalInputClass,
  portalPrimaryButtonClass,
  portalSecondaryButtonClass,
} from "../../components/patient/PortalTheme";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { formatLabDate } from "../../../lib/labPanels";
import {
  type HealthGoal,
  type ActivityLevel,
  type MealCategory,
  type FoodItem,
  type LoggedMealItem,
  type MealRecipe,
  type DayDietPlan,
  type DietUserSettings,
  calculateBMR,
  calculateTDEE,
  calculateCalorieTarget,
  calculateMacroTargets,
  calculateMicroTargets,
  generateWeeklyDietPlan,
  getMealAlternatives,
  generateGroceryList,
  FOOD_DATABASE,
} from "../../../lib/dietEngine";
import {
  type WeeklyExercisePlan,
  type FitnessLevel,
  type EquipmentAccess,
  type PrimaryGoal,
  type ExerciseProfileInput,
  generateAIExercisePlan,
} from "../../../lib/exercisePlan";
import { toast } from "sonner";

export type LifestyleSubTab = "nutrition" | "workout" | "biomarker_rx" | "grocery" | "coach";

export default function LifestylePlan() {
  const { profile } = useAuth();
  const { hasLabReports, uploads, loading: reportsLoading } = usePatientLabReports();
  const { panels, loading: panelsLoading, hasPanels } = usePatientLabPanels();
  const {
    activePanel,
    biomarkerTrends,
    multiPanelMeta,
    isAllReports,
    selectedReportId,
    setSelectedReportId,
  } = useActiveReport(panels);

  const location = useLocation();
  const navigate = useNavigate();

  // Determine active sub-tab from URL parameter
  const [activeTab, setActiveTab] = useState<LifestyleSubTab>(() => {
    try {
      const params = new URLSearchParams(location.search);
      const tab = params.get("tab");
      if (tab === "workout" || tab === "exercise" || tab === "fitness") return "workout";
      if (tab === "biomarker_rx" || tab === "safety" || tab === "labs") return "biomarker_rx";
      if (tab === "grocery" || tab === "shopping") return "grocery";
      if (tab === "coach" || tab === "chat" || tab === "dietitian") return "coach";
      if (location.pathname.includes("exercise")) return "workout";
    } catch {}
    return "nutrition";
  });

  // Sync tab with URL search parameter
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const tab = params.get("tab");
      if (tab === "workout" || tab === "exercise" || tab === "fitness") setActiveTab("workout");
      else if (tab === "biomarker_rx" || tab === "safety") setActiveTab("biomarker_rx");
      else if (tab === "grocery") setActiveTab("grocery");
      else if (tab === "coach" || tab === "chat") setActiveTab("coach");
      else if (tab === "nutrition" || tab === "diet") setActiveTab("nutrition");
      else if (location.pathname.includes("exercise")) setActiveTab("workout");
      else if (location.pathname.includes("diet")) setActiveTab("nutrition");
    } catch {}
  }, [location.search, location.pathname]);

  const handleTabChange = (tab: LifestyleSubTab) => {
    setActiveTab(tab);
    navigate(`/patient/lifestyle?tab=${tab}`, { replace: true });
  };

  // ==========================================
  // METABOLIC & PROFILE SETTINGS
  // ==========================================
  const settingsStorageKey = `zebra_diet_settings_${profile?.id || "default"}`;
  const [settings, setSettings] = useState<DietUserSettings>(() => {
    try {
      const saved = localStorage.getItem(settingsStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      activityLevel: "moderate",
      goal: "maintain_longevity",
      targetWeightKg: profile?.weight_kg || 70,
      weeklyPaceKg: -0.25,
      dailyWaterTargetMl: 2500,
      dietaryPreference: profile?.dietary_preference || "omnivore",
      foodAllergies: profile?.food_allergies || [],
      dietaryConditions: profile?.dietary_conditions || [],
      dietaryNotes: profile?.dietary_notes || "",
    };
  });

  useEffect(() => {
    if (profile) {
      setSettings((prev) => ({
        ...prev,
        dietaryPreference: profile.dietary_preference || prev.dietaryPreference,
        foodAllergies: profile.food_allergies || prev.foodAllergies,
        dietaryConditions: profile.dietary_conditions || prev.dietaryConditions,
        dietaryNotes: profile.dietary_notes ?? prev.dietaryNotes,
        targetWeightKg: prev.targetWeightKg || profile.weight_kg || 70,
      }));
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
    } catch {}
  }, [settings, settingsStorageKey]);

  // Calculations: BMR, TDEE, Calories, Macros
  const currentWeight = profile?.weight_kg || 75;
  const currentHeight = profile?.height_cm || 175;
  const bmr = useMemo(() => calculateBMR(currentWeight, currentHeight, 34, "male"), [currentWeight, currentHeight]);
  const tdee = useMemo(() => calculateTDEE(bmr, settings.activityLevel), [bmr, settings.activityLevel]);
  const calorieTarget = useMemo(
    () => settings.customCalorieTarget || calculateCalorieTarget(tdee, settings.goal, settings.weeklyPaceKg),
    [tdee, settings.goal, settings.weeklyPaceKg, settings.customCalorieTarget]
  );
  const macroTargets = useMemo(
    () => calculateMacroTargets(calorieTarget, settings.goal, currentWeight, settings.customMacroSplit),
    [calorieTarget, settings.goal, currentWeight, settings.customMacroSplit]
  );
  const microTargets = useMemo(
    () => calculateMicroTargets(calorieTarget, settings.dietaryConditions, activePanel),
    [calorieTarget, settings.dietaryConditions, activePanel]
  );

  // BMI Calculation
  const calculatedBmi = useMemo(() => {
    if (currentHeight && currentWeight && currentHeight > 0) {
      return Number((currentWeight / Math.pow(currentHeight / 100, 2)).toFixed(1));
    }
    return null;
  }, [currentHeight, currentWeight]);

  // ==========================================
  // FOOD LOGGING & WATER TRACKING
  // ==========================================
  const todayKey = new Date().toISOString().split("T")[0];
  const logsStorageKey = `zebra_food_logs_${profile?.id || "default"}_${todayKey}`;
  const [loggedFoods, setLoggedFoods] = useState<LoggedMealItem[]>(() => {
    try {
      const saved = localStorage.getItem(logsStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "default_log_1",
        name: "Avocado & Chia Toast",
        meal: "breakfast",
        servings: 1,
        servingSize: "2 slices",
        calories: 380,
        protein: 14,
        carbs: 42,
        fat: 18,
        fiber: 9,
        sodium: 290,
        loggedAt: new Date().toISOString(),
      },
      {
        id: "default_log_2",
        name: "Greek Yogurt with Berries",
        meal: "snack",
        servings: 1,
        servingSize: "1 cup",
        calories: 160,
        protein: 15,
        carbs: 18,
        fat: 3,
        fiber: 4,
        sodium: 65,
        loggedAt: new Date().toISOString(),
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(logsStorageKey, JSON.stringify(loggedFoods));
    } catch {}
  }, [loggedFoods, logsStorageKey]);

  // Logged totals
  const consumedTotals = useMemo(() => {
    return loggedFoods.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
        fiber: acc.fiber + (item.fiber || 0),
        sodium: acc.sodium + (item.sodium || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 }
    );
  }, [loggedFoods]);

  // Water tracking
  const waterStorageKey = `zebra_water_logs_${profile?.id || "default"}_${todayKey}`;
  const [waterConsumedMl, setWaterConsumedMl] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(waterStorageKey);
      if (saved) return Number(saved);
    } catch {}
    return 1500;
  });

  const handleAddWater = (amountMl: number) => {
    setWaterConsumedMl((prev) => {
      const next = Math.max(0, prev + amountMl);
      localStorage.setItem(waterStorageKey, String(next));
      return next;
    });
    toast.success(`Logged +${amountMl}ml hydration`);
  };

  // ==========================================
  // MEAL PLAN & SWAP ENGINE
  // ==========================================
  const [selectedPlanDay, setSelectedPlanDay] = useState<number>(1);
  const [weeklyPlan, setWeeklyPlan] = useState<DayDietPlan[]>(() => {
    return generateWeeklyDietPlan(activePanel, biomarkerTrends, settings);
  });

  useEffect(() => {
    setWeeklyPlan(generateWeeklyDietPlan(activePanel, biomarkerTrends, settings));
  }, [activePanel, biomarkerTrends, settings]);

  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState<{ dayNum: number; mealType: MealCategory; currentRecipeId: string } | null>(null);

  const swapAlternatives = useMemo(() => {
    if (!swapTarget) return [];
    return getMealAlternatives(swapTarget.currentRecipeId, swapTarget.mealType, settings);
  }, [swapTarget, settings]);

  const handleApplyMealSwap = (newRecipe: MealRecipe) => {
    if (!swapTarget) return;
    setWeeklyPlan((prev) =>
      prev.map((day) => {
        if (day.dayNumber !== swapTarget.dayNum) return day;
        const updatedMeals = { ...day.meals, [swapTarget.mealType]: newRecipe };
        return {
          ...day,
          meals: updatedMeals,
        };
      })
    );
    toast.success(`Swapped ${swapTarget.mealType} to "${newRecipe.title}"`);
    setIsSwapModalOpen(false);
    setSwapTarget(null);
  };

  // Add food modal
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [selectedMealForAdd, setSelectedMealForAdd] = useState<MealCategory>("breakfast");
  const [foodSearchQuery, setFoodSearchQuery] = useState("");
  const [customFoodMode, setCustomFoodMode] = useState(false);
  const [customFoodName, setCustomFoodName] = useState("");
  const [customFoodCal, setCustomFoodCal] = useState("");
  const [customFoodProt, setCustomFoodProt] = useState("");
  const [customFoodCarb, setCustomFoodCarb] = useState("");
  const [customFoodFat, setCustomFoodFat] = useState("");

  const filteredFoodDatabase = useMemo(() => {
    if (!foodSearchQuery.trim()) return FOOD_DATABASE.slice(0, 8);
    const q = foodSearchQuery.toLowerCase();
    return FOOD_DATABASE.filter((f) => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q));
  }, [foodSearchQuery]);

  const handleLogFood = (item: FoodItem) => {
    const newEntry: LoggedMealItem = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: item.name,
      meal: selectedMealForAdd,
      servings: 1,
      servingSize: item.servingSize,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      fiber: item.fiber,
      sodium: item.sodium,
      loggedAt: new Date().toISOString(),
    };
    setLoggedFoods((prev) => [...prev, newEntry]);
    toast.success(`Logged ${item.name} (${item.calories} kcal) to ${selectedMealForAdd.toUpperCase()}`);
    setIsAddFoodOpen(false);
  };

  const handleLogCustomFood = () => {
    if (!customFoodName.trim()) {
      toast.error("Please enter a food name");
      return;
    }
    const cal = Number(customFoodCal) || 0;
    const newEntry: LoggedMealItem = {
      id: `log_custom_${Date.now()}`,
      name: customFoodName,
      meal: selectedMealForAdd,
      servings: 1,
      servingSize: "1 custom serving",
      calories: cal,
      protein: Number(customFoodProt) || 0,
      carbs: Number(customFoodCarb) || 0,
      fat: Number(customFoodFat) || 0,
      fiber: 0,
      sodium: 0,
      loggedAt: new Date().toISOString(),
    };
    setLoggedFoods((prev) => [...prev, newEntry]);
    toast.success(`Logged ${customFoodName} (${cal} kcal)`);
    setIsAddFoodOpen(false);
    setCustomFoodMode(false);
    setCustomFoodName("");
    setCustomFoodCal("");
  };

  // ==========================================
  // EXERCISE PLAN ENGINE
  // ==========================================
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>("beginner");
  const [equipment, setEquipment] = useState<EquipmentAccess>("home_minimal");
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>("general_health");
  const [durationMin, setDurationMin] = useState<number>(30);
  const [exercisePlan, setExercisePlan] = useState<WeeklyExercisePlan | null>(null);
  const [isGeneratingExercise, setIsGeneratingExercise] = useState(false);
  const [selectedWorkoutDay, setSelectedWorkoutDay] = useState<number>(1);

  // Exercise completed items tracking
  const exerciseStorageKey = `zebra_exercise_completed_${profile?.id || "default"}`;
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(exerciseStorageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleExerciseDone = (exerciseId: string) => {
    setCompletedExercises((prev) => {
      const next = { ...prev, [exerciseId]: !prev[exerciseId] };
      localStorage.setItem(exerciseStorageKey, JSON.stringify(next));
      return next;
    });
  };

  // Generate / Load Exercise Plan
  useEffect(() => {
    let cancelled = false;
    async function loadPlan() {
      if (!activePanel && panels.length === 0) return;
      setIsGeneratingExercise(true);

      const profileInput: ExerciseProfileInput = {
        fitnessLevel,
        equipment,
        goal: primaryGoal,
        targetDurationMin: durationMin,
        heightCm: currentHeight,
        weightKg: currentWeight,
        dietaryConditions: settings.dietaryConditions,
        age: 34,
        systolicBp: activePanel?.biomarkers?.["systolic_bp"] ?? activePanel?.biomarkers?.["systolic"] ?? null,
        diastolicBp: activePanel?.biomarkers?.["diastolic_bp"] ?? activePanel?.biomarkers?.["diastolic"] ?? null,
      } as any;

      try {
        const generated = await generateAIExercisePlan(activePanel, biomarkerTrends, profileInput);
        if (!cancelled) {
          setExercisePlan(generated);
        }
      } catch (err) {
        console.error("Exercise plan generation error:", err);
      } finally {
        if (!cancelled) setIsGeneratingExercise(false);
      }
    }
    loadPlan();
    return () => {
      cancelled = true;
    };
  }, [activePanel, biomarkerTrends, fitnessLevel, equipment, primaryGoal, durationMin, currentHeight, currentWeight, settings.dietaryConditions, panels.length]);

  // Current active day's workout
  const activeWorkoutDay = useMemo(() => {
    if (!exercisePlan?.days) return null;
    return exercisePlan.days.find((d) => d.dayNumber === selectedWorkoutDay) || exercisePlan.days[0];
  }, [exercisePlan, selectedWorkoutDay]);

  // Today's estimated workout burn
  const estimatedWorkoutBurnKcal = activeWorkoutDay?.estimatedCalories || 250;

  // ==========================================
  // GROCERY LIST ENGINE
  // ==========================================
  const rawGroceryList = useMemo(() => {
    return generateGroceryList(weeklyPlan);
  }, [weeklyPlan]);

  const groceryGroups = useMemo(() => {
    return [
      { category: "Fresh Produce", items: rawGroceryList.produce || [] },
      { category: "Proteins & Legumes", items: rawGroceryList.protein || [] },
      { category: "Pantry & Grains", items: rawGroceryList.pantry || [] },
      { category: "Dairy & Alternatives", items: rawGroceryList.dairy_alt || [] },
    ];
  }, [rawGroceryList]);

  const [checkedGroceryItems, setCheckedGroceryItems] = useState<Record<string, boolean>>({});
  const toggleGroceryItem = (item: string) => {
    setCheckedGroceryItems((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  // ==========================================
  // AI LIFESTYLE COACH
  // ==========================================
  const [coachInput, setCoachInput] = useState("");
  const [coachChatLogs, setCoachChatLogs] = useState<Array<{ sender: "ai" | "user"; text: string; time: string }>>([
    {
      sender: "ai",
      text: "Hello! I am your Zebra Synapse AI Lifestyle & Metabolic Coach. I synthesize your latest lab biomarkers with your nutrition and workout plans. Ask me for recipe ideas, meal swaps, workout modifications, or safe training pacing!",
      time: "Just now",
    },
  ]);

  const handleSendCoachMessage = () => {
    if (!coachInput.trim()) return;
    const userText = coachInput.trim();
    setCoachInput("");

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setCoachChatLogs((prev) => [...prev, { sender: "user", text: userText, time: now }]);

    setTimeout(() => {
      let reply = "Based on your current biomarker targets, keeping meals rich in soluble fiber and maintaining steady-state aerobic pacing will support optimal metabolic recovery. Let me know if you'd like a specific recipe swap or lower-impact workout variation!";
      const lower = userText.toLowerCase();
      if (lower.includes("protein") || lower.includes("muscle")) {
        reply = `To support your training recovery, your daily target is ${macroTargets.grams.protein}g of protein. Great high-bioavailability sources aligned with your profile include Greek yogurt, lentils, tofu, chia seeds, and lean poultry.`;
      } else if (lower.includes("sodium") || lower.includes("blood pressure") || lower.includes("hypertension")) {
        reply = `Your profile enforces low-sodium DASH guidelines (< ${microTargets.sodiumMg} mg/day). Use lemon juice, garlic, smoked paprika, and nutritional yeast instead of table salt, and avoid heavy isometric breath-holding during workouts.`;
      } else if (lower.includes("knee") || lower.includes("joint") || lower.includes("squat")) {
        reply = `For joint protection, replace deep barbell squats with seated leg presses, glute bridges, or low-impact cycling. Keep movements controlled through a pain-free range of motion.`;
      }
      setCoachChatLogs((prev) => [...prev, { sender: "ai", text: reply, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    }, 600);
  };

  // Goals customization dialog
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  // Fallback placeholder if no lab reports
  if (!reportsLoading && !hasLabReports) {
    return (
      <PatientPortalPage>
        <LabReportsRequiredPlaceholder
          title="Lifestyle & Nutrition Plan"
          description="Upload your laboratory test report to unlock automated personalized nutrition, macro targets, and biomarker-safe exercise circuits."
        />
      </PatientPortalPage>
    );
  }

  return (
    <PatientPortalPage>
      {/* ========================================================================= */}
      {/* 1. TOP HERO & REPORT SCOPE SELECTOR */}
      {/* ========================================================================= */}
      <PatientPageHero
        badge="Biomarker-Synchronized"
        eyebrow="Clinical Lifestyle Medicine"
        title="Lifestyle & Metabolic Rx"
        description="Dynamic clinical nutrition, macro budgeting, and lab-safeguarded exercise circuits tailored to your metabolic profile."
        icon={HeartPulse}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <ReportScopeSelector
              panels={panels}
              uploads={uploads}
              selectedReportId={selectedReportId}
              onSelectReportId={setSelectedReportId}
              multiPanelMeta={multiPanelMeta}
              biomarkerTrends={biomarkerTrends}
            />
            <Button
              onClick={() => setIsCustomizeOpen(true)}
              variant="outline"
              className={portalSecondaryButtonClass}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2 text-slate-500" />
              Adjust Goals
            </Button>
          </div>
        }
      />

      {/* ========================================================================= */}
      {/* 2. UNIFIED METABOLIC COMMAND BAR (Energy Balance & Active Safeguards) */}
      {/* ========================================================================= */}
      <section className={`${portalPanelClass} p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-[#0a152e] to-[#041026] text-white border-blue-900/50 shadow-xl overflow-hidden relative`}>
        {/* Glow Accent Backdrop */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-lime-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
          
          {/* Energy Equation Breakdown */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Flame className="h-4 w-4" />
              </span>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300">
                Daily Metabolic Energy Balance
              </h3>
              <Badge variant="outline" className="text-[10px] font-mono border-blue-400/30 text-blue-200 ml-auto sm:ml-2">
                {settings.goal.replace("_", " ").toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {/* Daily Target */}
              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                <p className="text-[11px] font-medium text-slate-400">Target Budget</p>
                <p className="text-lg font-mono font-bold text-white mt-0.5">
                  {calorieTarget} <span className="text-xs font-sans text-slate-400">kcal</span>
                </p>
              </div>

              {/* Consumed Food */}
              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                <p className="text-[11px] font-medium text-slate-400">Food Consumed</p>
                <p className="text-lg font-mono font-bold text-lime-400 mt-0.5">
                  {consumedTotals.calories} <span className="text-xs font-sans text-slate-400">kcal</span>
                </p>
              </div>

              {/* Workout Burn */}
              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                <p className="text-[11px] font-medium text-slate-400">Workout Burn</p>
                <p className="text-lg font-mono font-bold text-amber-400 mt-0.5">
                  -{estimatedWorkoutBurnKcal} <span className="text-xs font-sans text-slate-400">kcal</span>
                </p>
              </div>

              {/* Net Balance */}
              <div className="p-3 rounded-2xl bg-slate-800/60 border border-cyan-500/30 bg-cyan-950/20">
                <p className="text-[11px] font-medium text-cyan-300">Remaining Budget</p>
                <p className="text-lg font-mono font-bold text-cyan-400 mt-0.5">
                  {Math.max(0, calorieTarget - consumedTotals.calories + estimatedWorkoutBurnKcal)}{" "}
                  <span className="text-xs font-sans text-slate-400">kcal</span>
                </p>
              </div>
            </div>
          </div>

          {/* Active Clinical Safeguards Pill Matrix */}
          <div className="lg:w-[420px] shrink-0 p-4 rounded-2xl bg-slate-950/60 border border-blue-900/60 backdrop-blur-md space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-bold text-slate-200">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Active Clinical Safeguards
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {activePanel?.recorded_at ? formatLabDate(activePanel.recorded_at) : "Standard Guidelines"}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {settings.dietaryConditions?.map((c) => (
                <span key={c} className="px-2.5 py-1 rounded-lg bg-blue-950/80 border border-blue-800/60 text-cyan-300 font-medium">
                  🛡️ {c.replace("_", " ")}
                </span>
              ))}
              <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 font-medium">
                🥗 DASH Sodium &lt;{microTargets.sodiumMg}mg
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-800/60 text-amber-300 font-medium">
                ⚡ {fitnessLevel.toUpperCase()} Pacing ({durationMin}m)
              </span>
              {calculatedBmi && calculatedBmi >= 25 && (
                <span className="px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-800/60 text-purple-300 font-medium">
                  🦵 Joint-Friendly Safe Load
                </span>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. CYBER-GLASS SUB-TAB NAVIGATION */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto [scrollbar-width:none]">
        {(
          [
            { id: "nutrition", label: "Nutrition & Meal Plan", icon: Apple },
            { id: "workout", label: "Workout & Fitness", icon: Dumbbell },
            { id: "biomarker_rx", label: "Biomarker Rx & Safety", icon: Activity },
            { id: "grocery", label: "Smart Grocery List", icon: ShoppingCart },
            { id: "coach", label: "AI Lifestyle Coach", icon: Bot },
          ] as Array<{ id: LifestyleSubTab; label: string; icon: any }>
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/20 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB CONTENT 1: NUTRITION & MEAL PLAN */}
      {/* ========================================================================= */}
      {activeTab === "nutrition" && (
        <div className="space-y-6">
          
          {/* Macro Progress Rings & Water Widget */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Protein */}
            <div className={`${portalPanelClass} p-5 flex items-center justify-between`}>
              <div>
                <p className="text-xs font-semibold text-slate-500">Protein</p>
                <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                  {consumedTotals.protein} <span className="text-xs font-normal text-slate-400">/ {macroTargets.grams.protein}g</span>
                </p>
                <div className="w-28 h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (consumedTotals.protein / (macroTargets.grams.protein || 1)) * 100)}%` }}
                  />
                </div>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 font-bold text-xs">
                {Math.round((consumedTotals.protein / (macroTargets.grams.protein || 1)) * 100)}%
              </span>
            </div>

            {/* Carbs */}
            <div className={`${portalPanelClass} p-5 flex items-center justify-between`}>
              <div>
                <p className="text-xs font-semibold text-slate-500">Complex Carbs</p>
                <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                  {consumedTotals.carbs} <span className="text-xs font-normal text-slate-400">/ {macroTargets.grams.carbs}g</span>
                </p>
                <div className="w-28 h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-lime-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (consumedTotals.carbs / (macroTargets.grams.carbs || 1)) * 100)}%` }}
                  />
                </div>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-50 text-lime-600 font-bold text-xs">
                {Math.round((consumedTotals.carbs / (macroTargets.grams.carbs || 1)) * 100)}%
              </span>
            </div>

            {/* Healthy Fats */}
            <div className={`${portalPanelClass} p-5 flex items-center justify-between`}>
              <div>
                <p className="text-xs font-semibold text-slate-500">Healthy Fats</p>
                <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                  {consumedTotals.fat} <span className="text-xs font-normal text-slate-400">/ {macroTargets.grams.fat}g</span>
                </p>
                <div className="w-28 h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (consumedTotals.fat / (macroTargets.grams.fat || 1)) * 100)}%` }}
                  />
                </div>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 font-bold text-xs">
                {Math.round((consumedTotals.fat / (macroTargets.grams.fat || 1)) * 100)}%
              </span>
            </div>

            {/* Daily Hydration */}
            <div className={`${portalPanelClass} p-5 flex items-center justify-between bg-sky-50/50 border-sky-100`}>
              <div>
                <p className="text-xs font-semibold text-sky-800 flex items-center gap-1">
                  <Droplets className="h-3.5 w-3.5 text-sky-600" /> Hydration
                </p>
                <p className="text-xl font-bold font-mono text-sky-950 mt-1">
                  {(waterConsumedMl / 1000).toFixed(1)} <span className="text-xs font-normal text-sky-600">/ {(settings.dailyWaterTargetMl / 1000).toFixed(1)} L</span>
                </p>
                <button
                  onClick={() => handleAddWater(250)}
                  className="mt-2 text-[11px] font-bold text-sky-700 hover:text-sky-900 bg-sky-100 hover:bg-sky-200 px-2.5 py-1 rounded-lg transition-all"
                >
                  +250 ml Glass
                </button>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-500/20">
                {Math.min(100, Math.round((waterConsumedMl / (settings.dailyWaterTargetMl || 2500)) * 100))}%
              </span>
            </div>

          </div>

          {/* 7-Day Meal Plan Timeline */}
          <div className={`${portalPanelClass} p-5 sm:p-6 space-y-6`}>
            
            {/* Header with Day Selector & Quick Log */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-lime-600" />
                  Prescribed 7-Day Meal Plan
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Formulated for {settings.dietaryPreference.toUpperCase()} diet with active metabolic safeguards
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setSelectedMealForAdd("breakfast");
                    setIsAddFoodOpen(true);
                  }}
                  className={portalPrimaryButtonClass}
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Log Custom Food
                </Button>
              </div>
            </div>

            {/* Day Selector Strip (1 to 7) */}
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {weeklyPlan.map((d) => (
                <button
                  key={d.dayNumber}
                  onClick={() => setSelectedPlanDay(d.dayNumber)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                    selectedPlanDay === d.dayNumber
                      ? "bg-lime-500 text-slate-950 font-bold shadow-md shadow-lime-500/20 scale-105"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
                  }`}
                >
                  {d.dayName}
                  <span className="block text-[10px] opacity-75 font-mono">{d.totalNutrition.calories} kcal</span>
                </button>
              ))}
            </div>

            {/* 4-Meal Cards for Selected Day */}
            {(() => {
              const activeDay = weeklyPlan.find((d) => d.dayNumber === selectedPlanDay) || weeklyPlan[0];
              const mealsList: Array<{ type: MealCategory; label: string; recipe: MealRecipe }> = [
                { type: "breakfast", label: "Breakfast (Morning Fuel)", recipe: activeDay.meals.breakfast },
                { type: "lunch", label: "Lunch (Sustained Glycemic Index)", recipe: activeDay.meals.lunch },
                { type: "dinner", label: "Dinner (Restorative & Light)", recipe: activeDay.meals.dinner },
                { type: "snack", label: "Metabolic Snack", recipe: activeDay.meals.snack },
              ];

              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {mealsList.map((m) => (
                    <div
                      key={m.type}
                      className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-lime-300 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                          {m.label}
                        </span>
                        <Button
                          onClick={() => {
                            setSwapTarget({ dayNum: selectedPlanDay, mealType: m.type, currentRecipeId: m.recipe.id });
                            setIsSwapModalOpen(true);
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-lime-700 hover:bg-lime-100/60 rounded-lg"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" /> Swap
                        </Button>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{m.recipe.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{Array.isArray(m.recipe.instructions) ? m.recipe.instructions.join(" ") : m.recipe.instructions}</p>
                      </div>

                      {/* Nutrient Pills */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono pt-1">
                        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 font-bold">
                          {m.recipe.calories} kcal
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-cyan-700">P: {m.recipe.protein}g</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-lime-700">C: {m.recipe.carbs}g</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-amber-700">F: {m.recipe.fat}g</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

          </div>

          {/* Today's Logged Foods List */}
          <div className={`${portalPanelClass} p-5 sm:p-6 space-y-4`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Today's Logged Foods</h3>
              <span className="text-xs font-mono text-slate-500">{loggedFoods.length} items logged</span>
            </div>

            {loggedFoods.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3 text-center">No foods logged today yet.</p>
            ) : (
              <div className="space-y-2">
                {loggedFoods.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{item.name}</span>
                      <span className="text-slate-400 ml-2">({item.servingSize})</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="font-bold text-slate-700">{item.calories} kcal</span>
                      <button
                        onClick={() => {
                          setLoggedFoods((prev) => prev.filter((f) => f.id !== item.id));
                          toast.info(`Removed ${item.name}`);
                        }}
                        className="text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 2: WORKOUT & FITNESS */}
      {/* ========================================================================= */}
      {activeTab === "workout" && (
        <div className="space-y-6">
          
          {/* Workout Header with Day Strip */}
          <div className={`${portalPanelClass} p-5 sm:p-6 space-y-6`}>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-amber-600" />
                  Prescribed 7-Day Training Track
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Target: {durationMin} min/session • Level: {fitnessLevel.toUpperCase()} • Equipment: {equipment.replace("_", " ")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setIsCustomizeOpen(true)}
                  variant="outline"
                  className={portalSecondaryButtonClass}
                >
                  <SlidersHorizontal className="h-4 w-4 mr-1.5" /> Configure Fitness
                </Button>
              </div>
            </div>

            {/* 7-Day Selector */}
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {exercisePlan?.days?.map((d) => (
                <button
                  key={d.dayNumber}
                  onClick={() => setSelectedWorkoutDay(d.dayNumber)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                    selectedWorkoutDay === d.dayNumber
                      ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20 scale-105"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
                  }`}
                >
                  Day {d.dayNumber}: {d.dayName}
                  <span className="block text-[10px] opacity-75 font-mono">{d.focus}</span>
                </button>
              ))}
            </div>

            {/* 3-Phase Circuit for Selected Workout Day */}
            {activeWorkoutDay ? (
              <div className="space-y-6">
                
                {/* Circuit Title & Estimated Burn */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-200/60 flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">{activeWorkoutDay.focus}</h4>
                    <p className="text-xs text-slate-600 mt-0.5">{activeWorkoutDay.intensity} • {activeWorkoutDay.estimatedDurationMin} min session</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-slate-500">Estimated Burn</p>
                    <p className="text-lg font-mono font-bold text-amber-700">~{activeWorkoutDay.estimatedCalories} kcal</p>
                  </div>
                </div>

                {/* Phase 1: Warmup */}
                <div className="space-y-3">
                  <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-700 flex items-center gap-1.5">
                    <Zap className="h-4 w-4" /> 1. Dynamic Warm-Up (5 - 8 Minutes)
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeWorkoutDay.warmup?.map((ex, idx) => {
                      const isDone = completedExercises[ex.id];
                      return (
                        <div
                          key={ex.id || idx}
                          onClick={() => toggleExerciseDone(ex.id)}
                          className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-all ${
                            isDone ? "bg-emerald-50/60 border-emerald-300" : "bg-slate-50 hover:bg-cyan-50/40 border-slate-100"
                          }`}
                        >
                          <div>
                            <p className={`text-xs font-bold ${isDone ? "text-emerald-900 line-through" : "text-slate-900"}`}>
                              {ex.name}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{ex.instructions || `${ex.durationMin || 5} min`}</p>
                          </div>
                          <span className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${isDone ? "bg-emerald-500 text-white" : "border border-slate-300"}`}>
                            {isDone && <Check className="h-3 w-3" />}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Phase 2: Main Compound & Aerobic Workout */}
                <div className="space-y-3">
                  <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                    <Flame className="h-4 w-4" /> 2. Main Training Circuit (20 - 25 Minutes)
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeWorkoutDay.mainWorkout?.map((ex, idx) => {
                      const isDone = completedExercises[ex.id];
                      return (
                        <div
                          key={ex.id || idx}
                          onClick={() => toggleExerciseDone(ex.id)}
                          className={`p-4 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-all ${
                            isDone ? "bg-emerald-50/60 border-emerald-300" : "bg-white hover:border-amber-400 border-slate-200 shadow-sm"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className={`text-xs font-bold ${isDone ? "text-emerald-900 line-through" : "text-slate-900"}`}>
                                {ex.name}
                              </p>
                              {ex.equipment && (
                                <Badge variant="outline" className="text-[9px] font-mono border-slate-200">
                                  {ex.equipment}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1 font-mono">
                              {ex.sets ? `${ex.sets} sets × ${ex.reps || `${ex.durationMin || 5}m`}` : `${ex.durationMin || 5}m`} • Rest: {ex.restSec || 60}s
                            </p>
                            {ex.safetyNote && <p className="text-[11px] text-slate-400 italic mt-0.5">{ex.safetyNote}</p>}
                          </div>
                          <span className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${isDone ? "bg-emerald-500 text-white" : "border-2 border-slate-300"}`}>
                            {isDone && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Phase 3: Cooldown */}
                <div className="space-y-3">
                  <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                    <Heart className="h-4 w-4" /> 3. Restorative Cool-Down (5 Minutes)
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeWorkoutDay.cooldown?.map((ex, idx) => {
                      const isDone = completedExercises[ex.id];
                      return (
                        <div
                          key={ex.id || idx}
                          onClick={() => toggleExerciseDone(ex.id)}
                          className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-all ${
                            isDone ? "bg-emerald-50/60 border-emerald-300" : "bg-slate-50 hover:bg-emerald-50/40 border-slate-100"
                          }`}
                        >
                          <div>
                            <p className={`text-xs font-bold ${isDone ? "text-emerald-900 line-through" : "text-slate-900"}`}>
                              {ex.name}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{ex.instructions || `${ex.durationMin || 5} min`}</p>
                          </div>
                          <span className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${isDone ? "bg-emerald-500 text-white" : "border border-slate-300"}`}>
                            {isDone && <Check className="h-3 w-3" />}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">Loading workout recommendations...</p>
            )}

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 3: BIOMARKER RX & CLINICAL SAFETY */}
      {/* ========================================================================= */}
      {activeTab === "biomarker_rx" && (
        <div className="space-y-6">
          <div className={`${portalPanelClass} p-5 sm:p-6 space-y-5`}>
            <div>
              <h3 className="text-base font-bold text-slate-900">Lab Biomarker Lifestyle Alignment</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                How your active clinical panels dictate specific nutrition limits and exercise safeguards
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Cardiovascular & Blood Pressure */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <HeartPulse className="h-4 w-4 text-rose-500" /> Cardiovascular & Lipids
                  </span>
                  <Badge variant="outline" className="text-[10px] border-rose-200 text-rose-700 bg-rose-50">
                    High Priority
                  </Badge>
                </div>
                <p className="text-xs text-slate-600">
                  • <strong>Nutrition:</strong> Soluble oat fiber, omega-3 fatty acids, and saturated fat &lt; 6% of total caloric intake to optimize LDL particle size.
                </p>
                <p className="text-xs text-slate-600">
                  • <strong>Exercise:</strong> Moderate aerobic sessions (120-135 BPM target) with extended 8-min warmup to avoid acute vascular pressure spikes.
                </p>
              </div>

              {/* Glycemic & Insulin Sensitivity */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-amber-500" /> Glycemic Control & HbA1c
                  </span>
                  <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-700 bg-amber-50">
                    Target: &lt;5.7%
                  </Badge>
                </div>
                <p className="text-xs text-slate-600">
                  • <strong>Nutrition:</strong> Low-glycemic complex carbohydrates paired with protein and dietary fats to buffer postprandial glucose excursions.
                </p>
                <p className="text-xs text-slate-600">
                  • <strong>Exercise:</strong> Resistance training stimulates GLUT4 receptor translocation, enhancing non-insulin dependent glucose uptake for 48 hours.
                </p>
              </div>

              {/* Renal & Sodium Excretion */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-cyan-600" /> Renal Function & Electrolytes
                  </span>
                  <Badge variant="outline" className="text-[10px] border-cyan-200 text-cyan-700 bg-cyan-50">
                    Safe Filtration
                  </Badge>
                </div>
                <p className="text-xs text-slate-600">
                  • <strong>Nutrition:</strong> Controlled dietary sodium (&lt;1,500mg) and balanced hydration (2.5L/day) to maintain optimal glomerular filtration.
                </p>
                <p className="text-xs text-slate-600">
                  • <strong>Exercise:</strong> Mandatory intra-workout hydration to prevent exercise-induced hemoconcentration and creatinine elevations.
                </p>
              </div>

              {/* Orthopedic & Joint Integrity */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-purple-600" /> Orthopedic & Joint Integrity
                  </span>
                  <Badge variant="outline" className="text-[10px] border-purple-200 text-purple-700 bg-purple-50">
                    BMI: {calculatedBmi || "24.5"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600">
                  • <strong>Nutrition:</strong> Anti-inflammatory polyphenol-rich foods (berries, extra virgin olive oil, turmeric) to mitigate systemic joint inflammation.
                </p>
                <p className="text-xs text-slate-600">
                  • <strong>Exercise:</strong> Low-impact modalities (cycling, seated rows, swimming) to minimize peak ground reaction forces on knees and lumbar spine.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 4: SMART GROCERY LIST */}
      {/* ========================================================================= */}
      {activeTab === "grocery" && (
        <div className="space-y-6">
          <div className={`${portalPanelClass} p-5 sm:p-6 space-y-6`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-lime-600" />
                  Weekly Prescription Grocery List
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ingredients auto-compiled from your 7-day meal plan, grouped by market aisle
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    const text = groceryGroups
                      .map((g) => `${g.category.toUpperCase()}:\n${g.items.map((i) => `• ${i.name} (${i.amount})`).join("\n")}`)
                      .join("\n\n");
                    navigator.clipboard.writeText(text);
                    toast.success("Grocery list copied to clipboard!");
                  }}
                  variant="outline"
                  size="sm"
                  className={portalSecondaryButtonClass}
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy List
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {groceryGroups.map((group) => (
                <div key={group.category} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-3">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                    {group.category}
                  </h4>
                  <div className="space-y-2">
                    {group.items.map((item) => {
                      const isChecked = checkedGroceryItems[item.name];
                      return (
                        <div
                          key={item.name}
                          onClick={() => toggleGroceryItem(item.name)}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                            isChecked ? "bg-lime-50 text-slate-400 line-through" : "bg-white text-slate-800 hover:border-lime-300 border border-slate-100"
                          }`}
                        >
                          <span>{item.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">{item.amount}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 5: AI LIFESTYLE COACH */}
      {/* ========================================================================= */}
      {activeTab === "coach" && (
        <div className="space-y-6">
          <div className={`${portalPanelClass} p-5 sm:p-6 space-y-4 max-w-4xl mx-auto`}>
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">AI Lifestyle & Metabolic Assistant</h3>
                <p className="text-xs text-slate-500">Ask questions about meal swaps, recipe nutrients, or workout modifications</p>
              </div>
            </div>

            {/* Chat message feed */}
            <div className="h-80 overflow-y-auto space-y-3 p-3 rounded-2xl bg-slate-50/70 border border-slate-100 [scrollbar-width:thin]">
              {coachChatLogs.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-slate-900 text-white rounded-br-none"
                        : "bg-white border border-slate-200/80 text-slate-800 shadow-sm rounded-bl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 mt-1 px-1">{msg.time}</span>
                </div>
              ))}
            </div>

            {/* Quick Prompt Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                "Suggest a high-protein post-workout snack",
                "What can I substitute for eggs in breakfast?",
                "How to protect knees during squats?",
                "Low-sodium seasoning alternatives",
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setCoachInput(chip)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-all"
                >
                  ✨ {chip}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="flex gap-2 pt-2">
              <Input
                placeholder="Type your nutrition or fitness question..."
                value={coachInput}
                onChange={(e) => setCoachInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendCoachMessage()}
                className={portalInputClass}
              />
              <Button onClick={handleSendCoachMessage} className={portalPrimaryButtonClass}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADJUST GOALS & METABOLIC SETTINGS */}
      {/* ========================================================================= */}
      <Dialog open={isCustomizeOpen} onOpenChange={setIsCustomizeOpen}>
        <DialogContent className="sm:max-w-[550px] bg-white text-slate-900 rounded-[28px] p-6 border-slate-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Customize Lifestyle & Metabolic Targets</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Adjust your daily pacing, dietary preferences, and fitness equipment access
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Primary Health Goal</Label>
              <Select
                value={settings.goal}
                onValueChange={(val: any) => setSettings((prev) => ({ ...prev, goal: val }))}
              >
                <SelectTrigger className="mt-1 h-10 rounded-xl bg-slate-50 border-slate-200 text-xs">
                  <SelectValue placeholder="Select goal" />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl shadow-xl border-slate-100">
                  <SelectItem value="maintain_longevity">Longevity & Biomarker Stability</SelectItem>
                  <SelectItem value="fat_loss">Fat Loss & Lipid Reduction</SelectItem>
                  <SelectItem value="muscle_gain">Lean Muscle & Insulin Sensitivity</SelectItem>
                  <SelectItem value="cardiovascular_health">Cardiovascular & Blood Pressure Optimization</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Fitness Level</Label>
                <Select
                  value={fitnessLevel}
                  onValueChange={(val: any) => setFitnessLevel(val)}
                >
                  <SelectTrigger className="mt-1 h-10 rounded-xl bg-slate-50 border-slate-200 text-xs">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl shadow-xl border-slate-100">
                    <SelectItem value="beginner">Beginner (Gentle)</SelectItem>
                    <SelectItem value="intermediate">Intermediate (Active)</SelectItem>
                    <SelectItem value="advanced">Advanced (High Output)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Available Equipment</Label>
                <Select
                  value={equipment}
                  onValueChange={(val: any) => setEquipment(val)}
                >
                  <SelectTrigger className="mt-1 h-10 rounded-xl bg-slate-50 border-slate-200 text-xs">
                    <SelectValue placeholder="Equipment" />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl shadow-xl border-slate-100">
                    <SelectItem value="bodyweight_only">Bodyweight Only</SelectItem>
                    <SelectItem value="home_minimal">Home Dumbbells & Bands</SelectItem>
                    <SelectItem value="full_gym">Full Gym Facility</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Session Duration (min)</Label>
                <Input
                  type="number"
                  value={durationMin}
                  onChange={(e) => setDurationMin(Number(e.target.value) || 30)}
                  className="mt-1 h-10 rounded-xl bg-slate-50 border-slate-200 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Daily Water Target (ml)</Label>
                <Input
                  type="number"
                  value={settings.dailyWaterTargetMl}
                  onChange={(e) => setSettings((prev) => ({ ...prev, dailyWaterTargetMl: Number(e.target.value) || 2500 }))}
                  className="mt-1 h-10 rounded-xl bg-slate-50 border-slate-200 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setIsCustomizeOpen(false)}
              className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              Save Targets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: SWAP MEAL DIALOG */}
      {/* ========================================================================= */}
      <Dialog open={isSwapModalOpen} onOpenChange={setIsSwapModalOpen}>
        <DialogContent className="sm:max-w-[550px] bg-white text-slate-900 rounded-[28px] p-6 border-slate-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Swap Meal Alternative</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select an alternative clinical recipe with matched macro & calorie bounds
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-80 overflow-y-auto space-y-3 pr-1 my-2 [scrollbar-width:thin]">
            {swapAlternatives.map((alt) => (
              <div
                key={alt.id}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-lime-50/50 border border-slate-100 flex items-center justify-between transition-all"
              >
                <div>
                  <h5 className="text-xs font-bold text-slate-900">{alt.title}</h5>
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 mt-1">
                    <span className="text-lime-700">{alt.calories} kcal</span>
                    <span>•</span>
                    <span>C {alt.carbs}g</span>
                    <span>•</span>
                    <span>P {alt.protein}g</span>
                    <span>•</span>
                    <span>F {alt.fat}g</span>
                  </div>
                </div>
                <Button
                  onClick={() => handleApplyMealSwap(alt)}
                  className="h-8 px-3 rounded-xl bg-lime-500 hover:bg-lime-600 text-slate-950 text-xs font-bold"
                >
                  Select
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              onClick={() => setIsSwapModalOpen(false)}
              variant="outline"
              className="h-10 rounded-xl border-slate-200 text-slate-700 text-xs font-semibold"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: LOG FOOD / SEARCH */}
      {/* ========================================================================= */}
      <Dialog open={isAddFoodOpen} onOpenChange={setIsAddFoodOpen}>
        <DialogContent className="sm:max-w-[550px] bg-white text-slate-900 rounded-[28px] p-6 border-slate-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Log Food Entry</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select an item from the database or enter custom nutrients
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!customFoodMode ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search food database..."
                      value={foodSearchQuery}
                      onChange={(e) => setFoodSearchQuery(e.target.value)}
                      className="pl-9 h-10 rounded-xl bg-slate-50 border-slate-200 text-xs"
                    />
                  </div>
                  <Button
                    onClick={() => setCustomFoodMode(true)}
                    variant="outline"
                    className="h-10 text-xs rounded-xl"
                  >
                    Custom
                  </Button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 [scrollbar-width:thin]">
                  {filteredFoodDatabase.map((food) => (
                    <div
                      key={food.id}
                      onClick={() => handleLogFood(food)}
                      className="p-3 rounded-xl bg-slate-50 hover:bg-lime-50/60 border border-slate-100 flex items-center justify-between cursor-pointer transition-all"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">{food.name}</p>
                        <p className="text-[11px] text-slate-400">{food.servingSize} • {food.category}</p>
                      </div>
                      <div className="text-right font-mono">
                        <p className="text-xs font-bold text-lime-700">{food.calories} kcal</p>
                        <p className="text-[10px] text-slate-400">P:{food.protein}g C:{food.carbs}g</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold">Food Name</Label>
                  <Input
                    placeholder="e.g., Homemade Protein Shake"
                    value={customFoodName}
                    onChange={(e) => setCustomFoodName(e.target.value)}
                    className="mt-1 h-10 rounded-xl bg-slate-50 border-slate-200 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <Label className="text-[11px]">Calories</Label>
                    <Input
                      type="number"
                      placeholder="kcal"
                      value={customFoodCal}
                      onChange={(e) => setCustomFoodCal(e.target.value)}
                      className="mt-1 h-9 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Protein (g)</Label>
                    <Input
                      type="number"
                      placeholder="g"
                      value={customFoodProt}
                      onChange={(e) => setCustomFoodProt(e.target.value)}
                      className="mt-1 h-9 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Carbs (g)</Label>
                    <Input
                      type="number"
                      placeholder="g"
                      value={customFoodCarb}
                      onChange={(e) => setCustomFoodCarb(e.target.value)}
                      className="mt-1 h-9 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Fat (g)</Label>
                    <Input
                      type="number"
                      placeholder="g"
                      value={customFoodFat}
                      onChange={(e) => setCustomFoodFat(e.target.value)}
                      className="mt-1 h-9 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {customFoodMode ? (
              <>
                <Button
                  onClick={() => setCustomFoodMode(false)}
                  variant="outline"
                  className="h-10 text-xs rounded-xl"
                >
                  Back
                </Button>
                <Button
                  onClick={handleLogCustomFood}
                  className="h-10 text-xs rounded-xl bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold"
                >
                  Log Custom Food
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsAddFoodOpen(false)}
                variant="outline"
                className="h-10 text-xs rounded-xl"
              >
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </PatientPortalPage>
  );
}
