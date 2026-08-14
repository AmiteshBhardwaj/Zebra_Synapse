import { useState, useEffect, useMemo } from "react";
import {
  Utensils,
  Flame,
  Apple,
  Droplets,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Scale,
  Calendar,
  SlidersHorizontal,
  ChevronRight,
  RefreshCw,
  Search,
  ShoppingCart,
  Check,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  Activity,
  HeartPulse,
  Info,
  Clock,
  Layers,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "../../../auth/AuthContext";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { useActiveReport } from "../../../hooks/useActiveReport";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
import ReportScopeSelector from "../../components/patient/ReportScopeSelector";
import {
  PatientPortalPage,
  portalPanelClass,
  portalInputClass,
  portalPrimaryButtonClass,
  portalSecondaryButtonClass,
} from "../../components/patient/PortalTheme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
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
  type WeightLogEntry,
  type DietUserSettings,
  FOOD_DATABASE,
  HEALTH_GOALS,
  ACTIVITY_MULTIPLIERS,
  calculateBMR,
  calculateTDEE,
  calculateCalorieTarget,
  calculateMacroTargets,
  calculateMicroTargets,
  generateWeeklyDietPlan,
  getMealAlternatives,
  generateGroceryList,
} from "../../../lib/dietEngine";
import { toast } from "sonner";

export default function Diet() {
  const { profile, updateProfile } = useAuth();
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

  // Active View Tab
  const [activeTab, setActiveTab] = useState<"tracker" | "weekly_plan" | "weight_goals" | "biomarker_rx">("tracker");

  // User Diet & Metabolic Settings
  const settingsStorageKey = `zebra_diet_settings_${profile?.id || "default"}`;
  const [settings, setSettings] = useState<DietUserSettings>(() => {
    try {
      const saved = localStorage.getItem(settingsStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      activityLevel: "moderate",
      goal: "maintain_longevity",
      targetWeightKg: profile?.weight_kg || 70,
      weeklyPaceKg: 0,
      dailyWaterTargetMl: 2500,
      dietaryPreference: profile?.dietary_preference || "omnivore",
      foodAllergies: profile?.food_allergies || [],
      dietaryConditions: profile?.dietary_conditions || [],
      dietaryNotes: profile?.dietary_notes || "",
    };
  });

  // Sync profile dietary preferences into settings if updated
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

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
    } catch (e) {
      console.error(e);
    }
  }, [settings, settingsStorageKey]);

  // Goals Customization Dialog State
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<ActivityLevel>(settings.activityLevel);
  const [editGoal, setEditGoal] = useState<HealthGoal>(settings.goal);
  const [editTargetWeight, setEditTargetWeight] = useState<string>(String(settings.targetWeightKg || 70));
  const [editWeeklyPace, setEditWeeklyPace] = useState<string>(String(settings.weeklyPaceKg || 0));
  const [editWaterTarget, setEditWaterTarget] = useState<string>(String(settings.dailyWaterTargetMl || 2500));
  const [editDietPref, setEditDietPref] = useState<string>(settings.dietaryPreference);

  // Sync edit states when dialog opens
  useEffect(() => {
    if (isCustomizeOpen) {
      setEditActivity(settings.activityLevel);
      setEditGoal(settings.goal);
      setEditTargetWeight(String(settings.targetWeightKg || profile?.weight_kg || 70));
      setEditWeeklyPace(String(settings.weeklyPaceKg || 0));
      setEditWaterTarget(String(settings.dailyWaterTargetMl || 2500));
      setEditDietPref(settings.dietaryPreference);
    }
  }, [isCustomizeOpen, settings, profile]);

  // Calculations
  const currentWeight = profile?.weight_kg || settings.targetWeightKg || 70;
  const currentHeight = profile?.height_cm || 175;
  const bmr = useMemo(() => calculateBMR(currentWeight, currentHeight, 36, "male"), [currentWeight, currentHeight]);
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

  // ==========================================
  // FOOD TRACKING STATE (Today's Logs)
  // ==========================================
  const todayKey = new Date().toISOString().split("T")[0];
  const logsStorageKey = `zebra_food_logs_${profile?.id || "default"}_${todayKey}`;
  const [loggedFoods, setLoggedFoods] = useState<LoggedMealItem[]>(() => {
    try {
      const saved = localStorage.getItem(logsStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    // Default initial demonstration logs
    return [
      {
        id: "log_1",
        name: "Rolled Steel Cut / Rolled Oats",
        meal: "breakfast",
        servings: 1,
        servingSize: "50g dry",
        calories: 190,
        protein: 7,
        carbs: 34,
        fat: 3.5,
        fiber: 5,
        sodium: 2,
        loggedAt: new Date().toISOString(),
      },
      {
        id: "log_2",
        name: "Organic Black Chia Seeds",
        meal: "breakfast",
        servings: 1,
        servingSize: "2 tbsp (24g)",
        calories: 117,
        protein: 4,
        carbs: 10,
        fat: 7.4,
        fiber: 8.3,
        sodium: 4,
        loggedAt: new Date().toISOString(),
      },
      {
        id: "log_3",
        name: "Wild Organic Blueberries",
        meal: "breakfast",
        servings: 1,
        servingSize: "1 cup (148g)",
        calories: 84,
        protein: 1.1,
        carbs: 21.4,
        fat: 0.5,
        fiber: 3.6,
        sodium: 1,
        loggedAt: new Date().toISOString(),
      },
      {
        id: "log_4",
        name: "Mediterranean Wild Salmon & Tri-Color Quinoa Bowl",
        meal: "lunch",
        servings: 1,
        servingSize: "1 bowl",
        calories: 520,
        protein: 42,
        carbs: 44,
        fat: 18,
        fiber: 9,
        sodium: 380,
        loggedAt: new Date().toISOString(),
      },
    ];
  });

  // Persist logged foods
  useEffect(() => {
    try {
      localStorage.setItem(logsStorageKey, JSON.stringify(loggedFoods));
    } catch (e) {
      console.error(e);
    }
  }, [loggedFoods, logsStorageKey]);

  // Water Intake State
  const waterStorageKey = `zebra_water_logs_${profile?.id || "default"}_${todayKey}`;
  const [waterConsumedMl, setWaterConsumedMl] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(waterStorageKey);
      return saved ? Number(saved) : 1500;
    } catch {
      return 1500;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(waterStorageKey, String(waterConsumedMl));
    } catch (e) {
      console.error(e);
    }
  }, [waterConsumedMl, waterStorageKey]);

  // Calculate Totals Consumed
  const totalsConsumed = useMemo(() => {
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

  const caloriesRemaining = calorieTarget - totalsConsumed.calories;

  // Add Food Modal State
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [selectedMealForAdd, setSelectedMealForAdd] = useState<MealCategory>("breakfast");
  const [foodSearchQuery, setFoodSearchQuery] = useState("");
  const [foodCategoryFilter, setFoodCategoryFilter] = useState<string>("all");
  const [customServings, setCustomServings] = useState<number>(1);
  const [customFoodMode, setCustomFoodMode] = useState(false);
  const [customFoodName, setCustomFoodName] = useState("");
  const [customFoodCal, setCustomFoodCal] = useState("");
  const [customFoodProt, setCustomFoodProt] = useState("");
  const [customFoodCarb, setCustomFoodCarb] = useState("");
  const [customFoodFat, setCustomFoodFat] = useState("");

  const filteredFoods = useMemo(() => {
    return FOOD_DATABASE.filter((food) => {
      const matchesCategory = foodCategoryFilter === "all" || food.category === foodCategoryFilter;
      const matchesSearch =
        !foodSearchQuery ||
        food.name.toLowerCase().includes(foodSearchQuery.toLowerCase()) ||
        food.dietaryTags.some((t) => t.toLowerCase().includes(foodSearchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [foodSearchQuery, foodCategoryFilter]);

  const handleLogFoodItem = (food: FoodItem) => {
    const newEntry: LoggedMealItem = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      foodId: food.id,
      name: food.name,
      meal: selectedMealForAdd,
      servings: customServings,
      servingSize: food.servingSize,
      calories: Math.round(food.calories * customServings),
      protein: Math.round(food.protein * customServings * 10) / 10,
      carbs: Math.round(food.carbs * customServings * 10) / 10,
      fat: Math.round(food.fat * customServings * 10) / 10,
      fiber: Math.round(food.fiber * customServings * 10) / 10,
      sodium: Math.round(food.sodium * customServings),
      loggedAt: new Date().toISOString(),
    };
    setLoggedFoods((prev) => [...prev, newEntry]);
    toast.success(`Logged ${food.name} to ${selectedMealForAdd.toUpperCase()}`);
    setIsAddFoodOpen(false);
    setFoodSearchQuery("");
    setCustomServings(1);
  };

  const handleLogCustomFood = () => {
    if (!customFoodName || !customFoodCal) {
      toast.error("Please enter food name and calories");
      return;
    }
    const cal = Number(customFoodCal) || 0;
    const prot = Number(customFoodProt) || 0;
    const carb = Number(customFoodCarb) || 0;
    const fat = Number(customFoodFat) || 0;

    const newEntry: LoggedMealItem = {
      id: `log_${Date.now()}`,
      name: customFoodName,
      meal: selectedMealForAdd,
      servings: 1,
      servingSize: "1 custom portion",
      calories: cal,
      protein: prot,
      carbs: carb,
      fat: fat,
      fiber: 0,
      sodium: 0,
      loggedAt: new Date().toISOString(),
    };
    setLoggedFoods((prev) => [...prev, newEntry]);
    toast.success(`Logged ${customFoodName} to ${selectedMealForAdd.toUpperCase()}`);
    setIsAddFoodOpen(false);
    setCustomFoodMode(false);
    setCustomFoodName("");
    setCustomFoodCal("");
    setCustomFoodProt("");
    setCustomFoodCarb("");
    setCustomFoodFat("");
  };

  const handleDeleteLoggedFood = (id: string) => {
    setLoggedFoods((prev) => prev.filter((item) => item.id !== id));
    toast.info("Food item removed from daily log");
  };

  // ==========================================
  // WEEKLY MEAL PLAN & SWAPPER
  // ==========================================
  const [selectedPlanDay, setSelectedPlanDay] = useState<number>(1);
  const [weeklyPlan, setWeeklyPlan] = useState<DayDietPlan[]>(() => {
    return generateWeeklyDietPlan(activePanel, biomarkerTrends, settings);
  });

  // Regenerate weekly plan when settings or active panel change
  useEffect(() => {
    setWeeklyPlan(generateWeeklyDietPlan(activePanel, biomarkerTrends, settings));
  }, [activePanel, biomarkerTrends, settings]);

  // Meal Swap Dialog
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
        const totalCal = updatedMeals.breakfast.calories + updatedMeals.lunch.calories + updatedMeals.dinner.calories + updatedMeals.snack.calories;
        const totalProt = updatedMeals.breakfast.protein + updatedMeals.lunch.protein + updatedMeals.dinner.protein + updatedMeals.snack.protein;
        const totalCarb = updatedMeals.breakfast.carbs + updatedMeals.lunch.carbs + updatedMeals.dinner.carbs + updatedMeals.snack.carbs;
        const totalFat = updatedMeals.breakfast.fat + updatedMeals.lunch.fat + updatedMeals.dinner.fat + updatedMeals.snack.fat;
        const totalFib = updatedMeals.breakfast.fiber + updatedMeals.lunch.fiber + updatedMeals.dinner.fiber + updatedMeals.snack.fiber;

        return {
          ...day,
          meals: updatedMeals,
          totalNutrition: {
            ...day.totalNutrition,
            calories: totalCal,
            protein: totalProt,
            carbs: totalCarb,
            fat: totalFat,
            fiber: totalFib,
          },
        };
      })
    );
    toast.success(`Swapped to ${newRecipe.title}`);
    setIsSwapModalOpen(false);
    setSwapTarget(null);
  };

  const handleLogMealFromPlanToToday = (recipe: MealRecipe) => {
    const newEntry: LoggedMealItem = {
      id: `log_${Date.now()}`,
      name: recipe.title,
      meal: recipe.mealType,
      servings: 1,
      servingSize: "1 recipe serving",
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
      fiber: recipe.fiber,
      sodium: 350,
      loggedAt: new Date().toISOString(),
    };
    setLoggedFoods((prev) => [...prev, newEntry]);
    toast.success(`Logged "${recipe.title}" to Today's ${recipe.mealType.toUpperCase()}!`);
  };

  // Smart Grocery List
  const [grocerySubTab, setGrocerySubTab] = useState(false);
  const groceryList = useMemo(() => generateGroceryList(weeklyPlan), [weeklyPlan]);
  const groceryStorageKey = `zebra_grocery_checks_${profile?.id || "default"}`;
  const [checkedGroceryItems, setCheckedGroceryItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(groceryStorageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleGroceryItem = (name: string) => {
    setCheckedGroceryItems((prev) => {
      const updated = { ...prev, [name]: !prev[name] };
      try {
        localStorage.setItem(groceryStorageKey, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  // ==========================================
  // WEIGHT & METABOLIC GOALS STATE
  // ==========================================
  const weightHistoryKey = `zebra_weight_logs_${profile?.id || "default"}`;
  const [weightLogs, setWeightLogs] = useState<WeightLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(weightHistoryKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      { id: "w_1", date: "2026-07-15", weightKg: (profile?.weight_kg || 74) + 2.5, notes: "Baseline check-in" },
      { id: "w_2", date: "2026-07-28", weightKg: (profile?.weight_kg || 74) + 1.2, notes: "Consistent nutrition" },
      { id: "w_3", date: "2026-08-10", weightKg: profile?.weight_kg || 74, notes: "Feeling energetic" },
    ];
  });

  const [isLogWeightOpen, setIsLogWeightOpen] = useState(false);
  const [newWeightInput, setNewWeightInput] = useState("");
  const [newWeightDate, setNewWeightDate] = useState(todayKey);
  const [newWeightNotes, setNewWeightNotes] = useState("");

  const handleSaveWeightEntry = () => {
    const val = parseFloat(newWeightInput);
    if (!val || val <= 0) {
      toast.error("Please enter a valid weight in kg");
      return;
    }
    const entry: WeightLogEntry = {
      id: `w_${Date.now()}`,
      date: newWeightDate,
      weightKg: val,
      notes: newWeightNotes.trim() || undefined,
    };
    const updated = [entry, ...weightLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setWeightLogs(updated);
    try {
      localStorage.setItem(weightHistoryKey, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    // Sync with profile
    if (updateProfile) {
      updateProfile({ weight_kg: val });
    }
    toast.success(`Logged weight ${val} kg for ${newWeightDate}`);
    setIsLogWeightOpen(false);
    setNewWeightInput("");
    setNewWeightNotes("");
  };

  // Projected Goal Completion Date Calculation
  const weightDifference = currentWeight - settings.targetWeightKg;
  const projectedWeeks = useMemo(() => {
    if (settings.weeklyPaceKg === 0 || Math.abs(weightDifference) < 0.2) return null;
    const pace = Math.abs(settings.weeklyPaceKg);
    const weeks = Math.abs(weightDifference) / pace;
    return Math.ceil(weeks);
  }, [weightDifference, settings.weeklyPaceKg]);

  const projectedDate = useMemo(() => {
    if (!projectedWeeks) return null;
    const d = new Date();
    d.setDate(d.getDate() + projectedWeeks * 7);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }, [projectedWeeks]);

  // Save Settings from Quick Adjust Modal
  const handleSaveAdjustedGoals = () => {
    const targetW = parseFloat(editTargetWeight) || currentWeight;
    const pace = parseFloat(editWeeklyPace) || 0;
    const water = parseInt(editWaterTarget, 10) || 2500;

    const newSettings: DietUserSettings = {
      ...settings,
      activityLevel: editActivity,
      goal: editGoal,
      targetWeightKg: targetW,
      weeklyPaceKg: pace,
      dailyWaterTargetMl: water,
      dietaryPreference: editDietPref,
    };
    setSettings(newSettings);

    if (updateProfile) {
      updateProfile({
        dietary_preference: editDietPref,
      });
    }

    toast.success("Diet & metabolic goals updated successfully!");
    setIsCustomizeOpen(false);
  };

  if (reportsLoading || panelsLoading) {
    return (
      <PatientPortalPage>
        <p className="text-sm text-[#A1A1AA]">Loading Diet & Nutrition Hub...</p>
      </PatientPortalPage>
    );
  }

  if (!hasLabReports) {
    return (
      <LabReportsRequiredPlaceholder
        title="Diet & Nutrition Hub"
        description="Daily calorie/macro tracking, 7-day customizable meal plans, and precision clinical nutrition driven by your lab data."
      />
    );
  }

  return (
    <PatientPortalPage>
      {/* ========================================== */}
      {/* 1. EXECUTIVE HEADER & CONTROLS            */}
      {/* ========================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/25 to-teal-600/15 border border-emerald-500/35 shadow-[0_12px_28px_rgba(16,185,129,0.2)]">
            <Utensils className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Diet & Nutrition</h1>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">
                Clinical Precision
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#b4c9e8] mt-1 font-medium">
              {HEALTH_GOALS[settings.goal]?.label || "Precision Nutrition"} •{" "}
              <span className="capitalize text-white font-semibold">{settings.dietaryPreference}</span> • Calorie Target:{" "}
              <span className="text-emerald-400 font-semibold">{calorieTarget} kcal</span>
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCustomizeOpen(true)}
            className="border-white/15 bg-white/[0.04] text-white hover:bg-white/10 hover:border-emerald-500/40 text-xs font-medium gap-1.5 transition-all shadow-sm"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-400" />
            Adjust Goals & Macros
          </Button>
          <ReportScopeSelector
            panels={panels}
            selectedReportId={selectedReportId}
            onSelectReportId={setSelectedReportId}
            multiPanelMeta={multiPanelMeta}
          />
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. NAVIGATION TABS                         */}
      {/* ========================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6 p-1.5 rounded-2xl bg-white/[0.03] border border-white/10">
        <button
          onClick={() => setActiveTab("tracker")}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === "tracker"
              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)]"
              : "text-[#94a3b8] hover:text-white hover:bg-white/[0.05]"
          }`}
        >
          <Flame className="h-4 w-4" />
          Today's Tracker
        </button>
        <button
          onClick={() => setActiveTab("weekly_plan")}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === "weekly_plan"
              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)]"
              : "text-[#94a3b8] hover:text-white hover:bg-white/[0.05]"
          }`}
        >
          <Calendar className="h-4 w-4" />
          7-Day Meal Plan
        </button>
        <button
          onClick={() => setActiveTab("weight_goals")}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === "weight_goals"
              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)]"
              : "text-[#94a3b8] hover:text-white hover:bg-white/[0.05]"
          }`}
        >
          <Scale className="h-4 w-4" />
          Weight & Goals
        </button>
        <button
          onClick={() => setActiveTab("biomarker_rx")}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === "biomarker_rx"
              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)]"
              : "text-[#94a3b8] hover:text-white hover:bg-white/[0.05]"
          }`}
        >
          <HeartPulse className="h-4 w-4" />
          Biomarker Food Rx
        </button>
      </div>

      {/* ========================================== */}
      {/* 3. TAB 1: TODAY'S TRACKER (MyFitnessPal)  */}
      {/* ========================================== */}
      {activeTab === "tracker" && (
        <div className="space-y-6">
          {/* Calorie & Macro Dashboard Card */}
          <Card className={`${portalPanelClass} border-emerald-500/20 shadow-xl overflow-hidden`}>
            <CardHeader className="pb-3 border-b border-white/5 bg-gradient-to-r from-emerald-950/30 via-slate-900/40 to-teal-950/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base sm:text-lg text-white flex items-center gap-2">
                    <Flame className="h-5 w-5 text-emerald-400" />
                    Daily Energy & Macro Balance
                  </CardTitle>
                  <CardDescription className="text-xs text-[#94a3b8]">
                    Live tracker for {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-[#94a3b8]">
                    Goal: <strong className="text-white">{calorieTarget} kcal</strong>
                  </span>
                  <span className="text-[#94a3b8]">
                    Food: <strong className="text-emerald-400">{totalsConsumed.calories} kcal</strong>
                  </span>
                  <span className="rounded-lg bg-white/10 px-2.5 py-1 text-white font-bold">
                    {caloriesRemaining >= 0 ? `${caloriesRemaining} kcal remaining` : `${Math.abs(caloriesRemaining)} kcal over`}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Visual Calorie Bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                  <span className="text-white/80">Calorie Progress</span>
                  <span className="text-emerald-400 font-bold">
                    {Math.min(100, Math.round((totalsConsumed.calories / calorieTarget) * 100))}% of Daily Target
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 transition-all duration-500"
                    style={{ width: `${Math.min(100, (totalsConsumed.calories / calorieTarget) * 100)}%` }}
                  />
                </div>
              </div>

              {/* 3 Macro Progress Gauges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Protein */}
                <div className="rounded-xl border border-blue-500/20 bg-blue-950/15 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-300">Protein (g)</span>
                    <Badge variant="outline" className="border-blue-500/30 text-blue-300 text-[10px]">
                      {macroTargets.split.proteinPct}% Cal
                    </Badge>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-xl font-bold text-white">
                      {Math.round(totalsConsumed.protein)}g
                    </div>
                    <div className="text-xs text-[#94a3b8]">Target: {macroTargets.grams.protein}g</div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-blue-950/60 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (totalsConsumed.protein / (macroTargets.grams.protein || 1)) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Carbs */}
                <div className="rounded-xl border border-amber-500/20 bg-amber-950/15 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-300">Carbohydrates (g)</span>
                    <Badge variant="outline" className="border-amber-500/30 text-amber-300 text-[10px]">
                      {macroTargets.split.carbsPct}% Cal
                    </Badge>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-xl font-bold text-white">
                      {Math.round(totalsConsumed.carbs)}g
                    </div>
                    <div className="text-xs text-[#94a3b8]">Target: {macroTargets.grams.carbs}g</div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-amber-950/60 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (totalsConsumed.carbs / (macroTargets.grams.carbs || 1)) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Fats */}
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/15 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-300">Healthy Fats (g)</span>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-300 text-[10px]">
                      {macroTargets.split.fatPct}% Cal
                    </Badge>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-xl font-bold text-white">
                      {Math.round(totalsConsumed.fat)}g
                    </div>
                    <div className="text-xs text-[#94a3b8]">Target: {macroTargets.grams.fat}g</div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-emerald-950/60 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (totalsConsumed.fat / (macroTargets.grams.fat || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Micronutrient Guard & Hydration Tracker Bar */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                {/* Clinical Micronutrient Health Guard */}
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-teal-400" />
                      Clinical Micronutrient Guard
                    </span>
                    <span className="text-[11px] text-[#94a3b8]">Lab-Adjusted Limits</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg bg-black/20 p-2 border border-white/5">
                      <div className="flex justify-between text-white/70 mb-1">
                        <span>Prebiotic Fiber</span>
                        <span className="font-bold text-teal-300">{totalsConsumed.fiber}g / {microTargets.fiberG}g</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10">
                        <div
                          className="h-full bg-teal-400 rounded-full"
                          style={{ width: `${Math.min(100, (totalsConsumed.fiber / microTargets.fiberG) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="rounded-lg bg-black/20 p-2 border border-white/5">
                      <div className="flex justify-between text-white/70 mb-1">
                        <span>Sodium Guard</span>
                        <span className={`font-bold ${totalsConsumed.sodium > microTargets.sodiumMg ? "text-rose-400" : "text-emerald-400"}`}>
                          {totalsConsumed.sodium}mg / {microTargets.sodiumMg}mg
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full ${totalsConsumed.sodium > microTargets.sodiumMg ? "bg-rose-400" : "bg-emerald-400"}`}
                          style={{ width: `${Math.min(100, (totalsConsumed.sodium / microTargets.sodiumMg) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hydration Tracker */}
                <div className="rounded-xl border border-sky-500/20 bg-sky-950/15 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-sky-300 flex items-center gap-1.5">
                      <Droplets className="h-4 w-4 text-sky-400" />
                      Daily Hydration Tracker
                    </span>
                    <span className="text-xs text-white font-bold">
                      {(waterConsumedMl / 1000).toFixed(2)}L / {(settings.dailyWaterTargetMl / 1000).toFixed(1)}L
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 rounded-full bg-sky-950/60 overflow-hidden p-0.5 border border-sky-500/20">
                      <div
                        className="h-full bg-gradient-to-r from-sky-500 to-blue-400 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (waterConsumedMl / (settings.dailyWaterTargetMl || 2500)) * 100)}%` }}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setWaterConsumedMl((prev) => Math.max(0, prev - 250))}
                      className="h-7 px-2 text-xs border-sky-500/30 text-sky-300 hover:bg-sky-500/20"
                    >
                      -250ml
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setWaterConsumedMl((prev) => prev + 250);
                        toast.success("Hydration updated! +250ml (+1 glass)");
                      }}
                      className="h-7 px-2.5 text-xs bg-sky-500 hover:bg-sky-600 text-white font-semibold"
                    >
                      + Glass (+250ml)
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* MEAL LOGS SECTION: Breakfast, Lunch, Dinner, Snacks */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Utensils className="h-4 w-4 text-emerald-400" />
                Meals Logged Today
              </h2>
              <span className="text-xs text-[#94a3b8]">Click "+ Add Food" to record meals or search library</span>
            </div>

            {(["breakfast", "lunch", "dinner", "snack"] as MealCategory[]).map((mealType) => {
              const mealItems = loggedFoods.filter((item) => item.meal === mealType);
              const mealCalories = mealItems.reduce((acc, curr) => acc + curr.calories, 0);
              const mealProtein = mealItems.reduce((acc, curr) => acc + curr.protein, 0);
              const mealCarbs = mealItems.reduce((acc, curr) => acc + curr.carbs, 0);
              const mealFat = mealItems.reduce((acc, curr) => acc + curr.fat, 0);

              const mealTitle = mealType.charAt(0).toUpperCase() + mealType.slice(1);

              return (
                <Card key={mealType} className={`${portalPanelClass} border-white/10 hover:border-white/20 transition-all`}>
                  <CardHeader className="py-3.5 px-4 sm:px-6 flex flex-row items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 font-bold text-xs capitalize">
                        {mealType[0]}
                      </div>
                      <div>
                        <CardTitle className="text-sm sm:text-base text-white">{mealTitle}</CardTitle>
                        <CardDescription className="text-xs text-[#94a3b8]">
                          {mealItems.length} item{mealItems.length !== 1 ? "s" : ""} • {mealCalories} kcal
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="hidden sm:flex items-center gap-3 text-xs text-[#94a3b8] mr-2">
                        <span>P: <strong className="text-white">{Math.round(mealProtein)}g</strong></span>
                        <span>C: <strong className="text-white">{Math.round(mealCarbs)}g</strong></span>
                        <span>F: <strong className="text-white">{Math.round(mealFat)}g</strong></span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedMealForAdd(mealType);
                          setIsAddFoodOpen(true);
                        }}
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium gap-1 shadow-sm"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Food
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 divide-y divide-white/5">
                    {mealItems.length === 0 ? (
                      <div className="py-5 px-6 text-center text-xs text-[#94a3b8] italic">
                        No food items logged for {mealTitle} yet.
                      </div>
                    ) : (
                      mealItems.map((item) => (
                        <div key={item.id} className="py-3 px-4 sm:px-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                          <div className="flex-1 pr-3">
                            <p className="text-sm font-medium text-white">{item.name}</p>
                            <p className="text-xs text-[#94a3b8]">
                              {item.servings} x {item.servingSize} • P: {item.protein}g • C: {item.carbs}g • F: {item.fat}g
                              {item.fiber ? ` • Fiber: ${item.fiber}g` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-emerald-400">{item.calories} kcal</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteLoggedFood(item.id)}
                              className="h-8 w-8 p-0 text-white/40 hover:text-rose-400 hover:bg-rose-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 4. TAB 2: WEEKLY MEAL PLAN & SWAPPER       */}
      {/* ========================================== */}
      {activeTab === "weekly_plan" && (
        <div className="space-y-6">
          {/* Weekly Plan Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-white/10 bg-white/[0.02]">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                7-Day Clinical Meal Schedule
              </h2>
              <p className="text-xs sm:text-sm text-[#94a3b8] mt-0.5">
                Precision diet schedule synthesized for <span className="text-emerald-300 font-semibold">{settings.dietaryPreference}</span> with {calorieTarget} kcal daily balance.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={grocerySubTab ? "default" : "outline"}
                size="sm"
                onClick={() => setGrocerySubTab(!grocerySubTab)}
                className={`text-xs font-semibold gap-1.5 transition-all ${
                  grocerySubTab
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : "border-white/15 text-white hover:bg-white/10"
                }`}
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                {grocerySubTab ? "View Daily Meals" : "Smart Grocery List"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setWeeklyPlan(generateWeeklyDietPlan(activePanel, biomarkerTrends, settings));
                  toast.success("Regenerated 7-day meal plan based on current biomarkers & preferences!");
                }}
                className="border-white/15 text-white hover:bg-white/10 text-xs font-medium gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
                Regenerate
              </Button>
            </div>
          </div>

          {/* GROCERY LIST VIEW */}
          {grocerySubTab ? (
            <Card className={`${portalPanelClass} border-white/10 p-6 space-y-6`}>
              <div>
                <CardTitle className="text-base sm:text-lg text-white flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-emerald-400" />
                  Consolidated Weekly Grocery Checklist
                </CardTitle>
                <CardDescription className="text-xs text-[#94a3b8]">
                  Automatically aggregated ingredients for all 7 days categorized by aisle. Check items as you shop.
                </CardDescription>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Produce */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-emerald-500/20 pb-1 flex items-center justify-between">
                    <span>Fresh Produce ({groceryList.produce.length})</span>
                    <Apple className="h-3.5 w-3.5" />
                  </h3>
                  <div className="space-y-2">
                    {groceryList.produce.map((item, idx) => (
                      <label
                        key={idx}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          checkedGroceryItems[item.name]
                            ? "bg-white/[0.02] border-white/5 text-white/40 line-through"
                            : "bg-white/[0.04] border-white/10 text-white hover:border-emerald-500/30"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(checkedGroceryItems[item.name])}
                          onChange={() => toggleGroceryItem(item.name)}
                          className="mt-0.5 rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-0"
                        />
                        <div className="flex-1">
                          <span className="font-medium">{item.name}</span>
                          <span className="block text-[10px] text-[#94a3b8]">{item.amount}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Proteins */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-blue-500/20 pb-1 flex items-center justify-between">
                    <span>Proteins & Seafood ({groceryList.protein.length})</span>
                    <Utensils className="h-3.5 w-3.5" />
                  </h3>
                  <div className="space-y-2">
                    {groceryList.protein.map((item, idx) => (
                      <label
                        key={idx}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          checkedGroceryItems[item.name]
                            ? "bg-white/[0.02] border-white/5 text-white/40 line-through"
                            : "bg-white/[0.04] border-white/10 text-white hover:border-blue-500/30"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(checkedGroceryItems[item.name])}
                          onChange={() => toggleGroceryItem(item.name)}
                          className="mt-0.5 rounded border-white/20 bg-black/40 text-blue-500 focus:ring-0"
                        />
                        <div className="flex-1">
                          <span className="font-medium">{item.name}</span>
                          <span className="block text-[10px] text-[#94a3b8]">{item.amount}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Pantry & Grains */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-amber-500/20 pb-1 flex items-center justify-between">
                    <span>Pantry, Grains & Spices ({groceryList.pantry.length})</span>
                    <Layers className="h-3.5 w-3.5" />
                  </h3>
                  <div className="space-y-2">
                    {groceryList.pantry.map((item, idx) => (
                      <label
                        key={idx}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          checkedGroceryItems[item.name]
                            ? "bg-white/[0.02] border-white/5 text-white/40 line-through"
                            : "bg-white/[0.04] border-white/10 text-white hover:border-amber-500/30"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(checkedGroceryItems[item.name])}
                          onChange={() => toggleGroceryItem(item.name)}
                          className="mt-0.5 rounded border-white/20 bg-black/40 text-amber-500 focus:ring-0"
                        />
                        <div className="flex-1">
                          <span className="font-medium">{item.name}</span>
                          <span className="block text-[10px] text-[#94a3b8]">{item.amount}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Dairy & Plant Alts */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider border-b border-teal-500/20 pb-1 flex items-center justify-between">
                    <span>Dairy & Plant-Alts ({groceryList.dairy_alt.length})</span>
                    <Droplets className="h-3.5 w-3.5" />
                  </h3>
                  <div className="space-y-2">
                    {groceryList.dairy_alt.map((item, idx) => (
                      <label
                        key={idx}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          checkedGroceryItems[item.name]
                            ? "bg-white/[0.02] border-white/5 text-white/40 line-through"
                            : "bg-white/[0.04] border-white/10 text-white hover:border-teal-500/30"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(checkedGroceryItems[item.name])}
                          onChange={() => toggleGroceryItem(item.name)}
                          className="mt-0.5 rounded border-white/20 bg-black/40 text-teal-500 focus:ring-0"
                        />
                        <div className="flex-1">
                          <span className="font-medium">{item.name}</span>
                          <span className="block text-[10px] text-[#94a3b8]">{item.amount}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <>
              {/* Day Selector Tabs (Day 1 - Day 7) */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {weeklyPlan.map((day) => (
                  <button
                    key={day.dayNumber}
                    onClick={() => setSelectedPlanDay(day.dayNumber)}
                    className={`py-3 px-1 rounded-xl border text-center transition-all ${
                      selectedPlanDay === day.dayNumber
                        ? "bg-emerald-600/30 border-emerald-500 text-white shadow-[0_4px_16px_rgba(16,185,129,0.2)]"
                        : "bg-white/[0.02] border-white/10 text-[#94a3b8] hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
                      {day.dayName.substring(0, 3)}
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-white mt-0.5">Day {day.dayNumber}</div>
                    <div className="text-[9px] text-emerald-400 font-medium hidden sm:block mt-1">
                      {day.totalNutrition.calories} kcal
                    </div>
                  </button>
                ))}
              </div>

              {/* Active Day Plan Detail */}
              {(() => {
                const currentDay = weeklyPlan.find((d) => d.dayNumber === selectedPlanDay) || weeklyPlan[0];
                const meals = currentDay.meals;

                return (
                  <div className="space-y-4">
                    {/* Day Clinical Note */}
                    <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/20 flex items-start gap-3">
                      <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-xs sm:text-sm text-emerald-200">
                        <strong className="text-white font-semibold">{currentDay.dayName} Nutrition Focus: </strong>
                        {currentDay.clinicalRationale}
                        <div className="flex items-center gap-4 text-xs font-bold text-white mt-1.5">
                          <span>Total: {currentDay.totalNutrition.calories} kcal</span>
                          <span>Protein: {currentDay.totalNutrition.protein}g</span>
                          <span>Carbs: {currentDay.totalNutrition.carbs}g</span>
                          <span>Fats: {currentDay.totalNutrition.fat}g</span>
                          <span>Fiber: {currentDay.totalNutrition.fiber}g</span>
                        </div>
                      </div>
                    </div>

                    {/* Meal Cards */}
                    {(["breakfast", "lunch", "dinner", "snack"] as MealCategory[]).map((mealType) => {
                      const recipe = meals[mealType];
                      const typeLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);

                      return (
                        <Card key={mealType} className={`${portalPanelClass} border-white/10 hover:border-emerald-500/30 transition-all`}>
                          <CardHeader className="py-4 px-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.01]">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] uppercase font-bold">
                                  {typeLabel}
                                </Badge>
                                <span className="text-xs text-[#94a3b8] flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {recipe.prepTimeMin} mins prep
                                </span>
                              </div>
                              <CardTitle className="text-base sm:text-lg text-white mt-1">{recipe.title}</CardTitle>
                            </div>
                            <div className="flex items-center flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSwapTarget({
                                    dayNum: currentDay.dayNumber,
                                    mealType,
                                    currentRecipeId: recipe.id,
                                  });
                                  setIsSwapModalOpen(true);
                                }}
                                className="h-8 text-xs border-white/15 text-white hover:bg-white/10 hover:border-emerald-500/40 gap-1.5"
                              >
                                <RotateCcw className="h-3 w-3 text-emerald-400" />
                                Swap Meal
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleLogMealFromPlanToToday(recipe)}
                                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium gap-1.5 shadow-sm"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Log to Today
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="p-6 space-y-4">
                            {/* Macro Pills */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-bold text-emerald-400">
                                {recipe.calories} kcal
                              </span>
                              <span className="rounded-md bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-xs text-blue-300">
                                Protein: {recipe.protein}g
                              </span>
                              <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-xs text-amber-300">
                                Carbs: {recipe.carbs}g
                              </span>
                              <span className="rounded-md bg-teal-500/15 border border-teal-500/30 px-2 py-0.5 text-xs text-teal-300">
                                Fats: {recipe.fat}g
                              </span>
                              <span className="rounded-md bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-xs text-purple-300">
                                Fiber: {recipe.fiber}g
                              </span>
                            </div>

                            {/* Clinical Benefits */}
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">
                                Biomarker & Health Rationale:
                              </span>
                              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-[#cbd5e1]">
                                {recipe.clinicalBenefits.map((b, i) => (
                                  <li key={i} className="flex items-start gap-1.5">
                                    <span className="text-emerald-400 mt-0.5">•</span>
                                    <span>{b}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Ingredients & Instructions Split */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-white/5 text-xs">
                              {/* Ingredients */}
                              <div className="space-y-1.5">
                                <span className="font-semibold text-white">Ingredients:</span>
                                <ul className="space-y-1 text-[#cbd5e1]">
                                  {recipe.ingredients.map((ing, i) => (
                                    <li key={i} className="flex justify-between bg-white/[0.02] p-1.5 rounded border border-white/5">
                                      <span>{ing.name}</span>
                                      <span className="text-[#94a3b8] font-medium">{ing.amount}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              {/* Instructions */}
                              <div className="space-y-1.5">
                                <span className="font-semibold text-white">Preparation Steps:</span>
                                <ol className="space-y-1 text-[#cbd5e1] list-decimal list-inside">
                                  {recipe.instructions.map((step, i) => (
                                    <li key={i} className="leading-relaxed pl-1">{step}</li>
                                  ))}
                                </ol>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* 5. TAB 3: WEIGHT & METABOLIC GOALS         */}
      {/* ========================================== */}
      {activeTab === "weight_goals" && (
        <div className="space-y-6">
          {/* Goal Header Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Current vs Target */}
            <Card className={`${portalPanelClass} border-emerald-500/20 p-5 space-y-3`}>
              <div className="flex items-center justify-between text-xs text-[#94a3b8]">
                <span>Weight Progress</span>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                  {settings.goal === "fat_loss" ? "Deficit Phase" : "Energy Balance"}
                </Badge>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white">{currentWeight} kg</div>
                  <span className="text-xs text-[#94a3b8]">Current Weight</span>
                </div>
                <ArrowRight className="h-5 w-5 text-white/30" />
                <div className="text-right">
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">{settings.targetWeightKg} kg</div>
                  <span className="text-xs text-[#94a3b8]">Target Goal</span>
                </div>
              </div>
              <div className="text-xs text-[#cbd5e1] pt-2 border-t border-white/5 flex justify-between">
                <span>Total Net Change:</span>
                <strong className={currentWeight > settings.targetWeightKg ? "text-emerald-400" : "text-blue-400"}>
                  {(currentWeight - settings.targetWeightKg).toFixed(1)} kg {currentWeight > settings.targetWeightKg ? "to lose" : "to gain"}
                </strong>
              </div>
            </Card>

            {/* Target Pace & Completion Date */}
            <Card className={`${portalPanelClass} border-white/10 p-5 space-y-3`}>
              <div className="flex items-center justify-between text-xs text-[#94a3b8]">
                <span>Projected Timeline</span>
                <Calendar className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-lg sm:text-xl font-bold text-white">
                  {projectedDate || "Goal Achieved / Maintained"}
                </div>
                <p className="text-xs text-[#94a3b8] mt-1">
                  {projectedWeeks
                    ? `Estimated ${projectedWeeks} weeks at current pace (${settings.weeklyPaceKg} kg/week)`
                    : "Maintaining current weight equilibrium"}
                </p>
              </div>
              <div className="text-xs text-[#cbd5e1] pt-2 border-t border-white/5">
                <span>Daily Caloric Offset: </span>
                <strong className="text-emerald-400">
                  {settings.weeklyPaceKg !== 0 ? `${Math.round(settings.weeklyPaceKg * 1100)} kcal/day` : "0 kcal (Energy Balance)"}
                </strong>
              </div>
            </Card>

            {/* Metabolic Breakdown (BMR / TDEE) */}
            <Card className={`${portalPanelClass} border-white/10 p-5 space-y-3`}>
              <div className="flex items-center justify-between text-xs text-[#94a3b8]">
                <span>Metabolic Engine</span>
                <Activity className="h-4 w-4 text-teal-400" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white/[0.03] p-2.5 border border-white/5">
                  <span className="text-[#94a3b8] block">Basal Rate (BMR)</span>
                  <span className="text-lg font-bold text-white">{bmr}</span>
                  <span className="text-[10px] text-white/50 block">kcal at rest</span>
                </div>
                <div className="rounded-lg bg-white/[0.03] p-2.5 border border-white/5">
                  <span className="text-[#94a3b8] block">Maintenance (TDEE)</span>
                  <span className="text-lg font-bold text-teal-300">{tdee}</span>
                  <span className="text-[10px] text-teal-400/60 block">{settings.activityLevel}</span>
                </div>
              </div>
              <div className="text-xs text-[#cbd5e1] pt-2 border-t border-white/5">
                <span>Prescribed Calorie Intake: </span>
                <strong className="text-emerald-400 font-bold">{calorieTarget} kcal/day</strong>
              </div>
            </Card>
          </div>

          {/* Weight Log History & Check-in */}
          <Card className={`${portalPanelClass} border-white/10`}>
            <CardHeader className="py-4 px-6 border-b border-white/5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Scale className="h-4 w-4 text-emerald-400" />
                  Weight Check-In Log
                </CardTitle>
                <CardDescription className="text-xs text-[#94a3b8]">
                  Track weigh-ins to dynamically calibrate metabolic requirements.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setIsLogWeightOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs gap-1.5 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Log Weight
              </Button>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-white/5">
              {weightLogs.map((entry) => (
                <div key={entry.id} className="py-3 px-6 flex items-center justify-between hover:bg-white/[0.02]">
                  <div className="flex items-center gap-4">
                    <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white font-bold text-xs">
                      <Scale className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{entry.weightKg} kg</div>
                      <div className="text-xs text-[#94a3b8]">
                        {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {entry.notes ? ` • "${entry.notes}"` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-emerald-400">Recorded</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================== */}
      {/* 6. TAB 4: BIOMARKER FOOD RX                */}
      {/* ========================================== */}
      {activeTab === "biomarker_rx" && (
        <div className="space-y-6">
          <Card className={`${portalPanelClass} border-emerald-500/20 p-6 space-y-4`}>
            <div className="flex items-start gap-3">
              <HeartPulse className="h-6 w-6 text-emerald-400 shrink-0 mt-1" />
              <div>
                <CardTitle className="text-base sm:text-lg text-white">
                  Clinical Dietary Prescription Synthesizing Your Lab Panels
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-[#94a3b8] mt-1 leading-relaxed">
                  Dietary interventions mapped to your latest lipid profile, fasting blood glucose, liver function, and electrolyte panels.
                </CardDescription>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10">
              {/* Foods to Prioritize */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 space-y-3">
                <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Foods to Prioritize (Clinical Rx)
                </h3>
                <ul className="space-y-2 text-xs text-[#cbd5e1]">
                  <li className="p-2.5 rounded-lg bg-black/20 border border-emerald-500/10">
                    <strong className="text-white block">Soluble Beta-Glucan & Pectin Fibers</strong>
                    Steel-cut oats, barley, chia seeds, and whole apples bind intestinal bile acids to reduce LDL synthesis.
                  </li>
                  <li className="p-2.5 rounded-lg bg-black/20 border border-emerald-500/10">
                    <strong className="text-white block">Polyphenol-Dense Extra Virgin Olive Oil</strong>
                    Cold-pressed phenolic compounds enhance endothelial nitric oxide production and reduce oxidized LDL.
                  </li>
                  <li className="p-2.5 rounded-lg bg-black/20 border border-emerald-500/10">
                    <strong className="text-white block">Cruciferous Sulforaphane Sources</strong>
                    Steamed broccoli, arugula, and kale upregulate hepatic glutathione and phase-2 cellular detoxification.
                  </li>
                  <li className="p-2.5 rounded-lg bg-black/20 border border-emerald-500/10">
                    <strong className="text-white block">High-Potassium Leafy Greens & Legumes</strong>
                    Spreads sodium load, dampens sympathetic vascular tone, and stabilizes blood pressure.
                  </li>
                </ul>
              </div>

              {/* Foods to Minimize */}
              <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-4 space-y-3">
                <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-400" />
                  Foods to Minimize or Avoid
                </h3>
                <ul className="space-y-2 text-xs text-[#cbd5e1]">
                  <li className="p-2.5 rounded-lg bg-black/20 border border-rose-500/10">
                    <strong className="text-white block">Ultra-Processed Refined Carbohydrates & HFCS</strong>
                    Liquid fructose and white flour trigger hepatic de novo lipogenesis and elevate serum triglycerides.
                  </li>
                  <li className="p-2.5 rounded-lg bg-black/20 border border-rose-500/10">
                    <strong className="text-white block">Excess Saturated Animal Fats & Palm Oils</strong>
                    Downregulates hepatic LDL receptor clearance, elevating circulating ApoB atherogenic particles.
                  </li>
                  <li className="p-2.5 rounded-lg bg-black/20 border border-rose-500/10">
                    <strong className="text-white block">Hidden High-Sodium Preserved Foods</strong>
                    Canned soups, cured meats, and commercial dressings that exceed daily 2,000mg sodium threshold.
                  </li>
                  <li className="p-2.5 rounded-lg bg-black/20 border border-rose-500/10">
                    <strong className="text-white block">Late-Night Heavy Acid-Inducing Meals (GERD Alert)</strong>
                    Spicy or high-fat meals consumed within 3 hours of sleep trigger esophageal reflux and disrupt REM sleep.
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 1: ADD / SEARCH FOOD DIALOG         */}
      {/* ========================================== */}
      <Dialog open={isAddFoodOpen} onOpenChange={setIsAddFoodOpen}>
        <DialogContent className="max-w-xl bg-[#0e1626] border-white/15 text-white max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b border-white/10 bg-white/[0.02]">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <Utensils className="h-5 w-5 text-emerald-400" />
              Add Food to {selectedMealForAdd.toUpperCase()}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#94a3b8]">
              Search the verified nutrition database or quick-add a custom item.
            </DialogDescription>
          </DialogHeader>

          {/* Mode Switcher: Library vs Custom Food */}
          <div className="flex border-b border-white/10 px-5 pt-3 gap-4 text-xs font-semibold">
            <button
              onClick={() => setCustomFoodMode(false)}
              className={`pb-2.5 border-b-2 transition-all ${
                !customFoodMode
                  ? "border-emerald-400 text-emerald-400"
                  : "border-transparent text-[#94a3b8] hover:text-white"
              }`}
            >
              Food Database Library
            </button>
            <button
              onClick={() => setCustomFoodMode(true)}
              className={`pb-2.5 border-b-2 transition-all ${
                customFoodMode
                  ? "border-emerald-400 text-emerald-400"
                  : "border-transparent text-[#94a3b8] hover:text-white"
              }`}
            >
              Quick Custom Entry
            </button>
          </div>

          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            {!customFoodMode ? (
              <>
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#94a3b8]" />
                  <Input
                    placeholder="Search chicken, oats, salmon, avocado, quinoa..."
                    value={foodSearchQuery}
                    onChange={(e) => setFoodSearchQuery(e.target.value)}
                    className={`${portalInputClass} pl-9 text-xs`}
                  />
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {["all", "proteins", "grains", "vegetables", "fruits", "fats", "beverages"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFoodCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize border transition-all ${
                        foodCategoryFilter === cat
                          ? "bg-emerald-600 border-emerald-500 text-white"
                          : "bg-white/[0.04] border-white/10 text-[#94a3b8] hover:text-white"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Servings multiplier */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
                  <span className="text-[#94a3b8]">Serving Size Multiplier:</span>
                  <div className="flex items-center gap-2">
                    {[0.5, 1, 1.5, 2].map((s) => (
                      <button
                        key={s}
                        onClick={() => setCustomServings(s)}
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          customServings === s
                            ? "bg-emerald-500 text-white"
                            : "bg-white/10 text-white/70 hover:bg-white/20"
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Food Results List */}
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                  {filteredFoods.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#94a3b8]">
                      No matching foods found. Try a different search term or use "Quick Custom Entry".
                    </div>
                  ) : (
                    filteredFoods.map((food) => (
                      <div
                        key={food.id}
                        className="p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:border-emerald-500/40 hover:bg-white/[0.05] transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex-1">
                          <h4 className="text-xs sm:text-sm font-semibold text-white">{food.name}</h4>
                          <p className="text-[11px] text-[#94a3b8] mt-0.5">
                            {food.servingSize} • P: {Math.round(food.protein * customServings * 10) / 10}g • C:{" "}
                            {Math.round(food.carbs * customServings * 10) / 10}g • F:{" "}
                            {Math.round(food.fat * customServings * 10) / 10}g
                            {food.fiber ? ` • Fiber: ${Math.round(food.fiber * customServings * 10) / 10}g` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs sm:text-sm font-bold text-emerald-400">
                            {Math.round(food.calories * customServings)} kcal
                          </span>
                          <Button
                            size="sm"
                            onClick={() => handleLogFoodItem(food)}
                            className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            Log
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              /* Custom Food Form */
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-white">Food / Meal Name *</Label>
                  <Input
                    placeholder="e.g., Mom's Lentil Soup with Sourdough"
                    value={customFoodName}
                    onChange={(e) => setCustomFoodName(e.target.value)}
                    className={`${portalInputClass} mt-1 text-xs`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-white">Calories (kcal) *</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 350"
                      value={customFoodCal}
                      onChange={(e) => setCustomFoodCal(e.target.value)}
                      className={`${portalInputClass} mt-1 text-xs`}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-white">Protein (g)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 25"
                      value={customFoodProt}
                      onChange={(e) => setCustomFoodProt(e.target.value)}
                      className={`${portalInputClass} mt-1 text-xs`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-white">Carbohydrates (g)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 40"
                      value={customFoodCarb}
                      onChange={(e) => setCustomFoodCarb(e.target.value)}
                      className={`${portalInputClass} mt-1 text-xs`}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-white">Fats (g)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 10"
                      value={customFoodFat}
                      onChange={(e) => setCustomFoodFat(e.target.value)}
                      className={`${portalInputClass} mt-1 text-xs`}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleLogCustomFood}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs mt-2"
                >
                  Log Custom Food Entry
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================== */}
      {/* MODAL 2: SWAP MEAL ALTERNATIVES DIALOG     */}
      {/* ========================================== */}
      <Dialog open={isSwapModalOpen} onOpenChange={setIsSwapModalOpen}>
        <DialogContent className="max-w-lg bg-[#0e1626] border-white/15 text-white">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg text-white flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-emerald-400" />
              Swap Meal Alternatives
            </DialogTitle>
            <DialogDescription className="text-xs text-[#94a3b8]">
              Select a clinically compatible alternative recipe tailored to your profile restrictions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[50vh] overflow-y-auto py-2 pr-1">
            {swapAlternatives.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#94a3b8]">
                No other alternative recipes in this exact category match your strict allergen/diet filters.
              </div>
            ) : (
              swapAlternatives.map((alt) => (
                <div
                  key={alt.id}
                  className="p-3.5 rounded-xl border border-white/10 bg-white/[0.03] hover:border-emerald-500/40 hover:bg-white/[0.06] transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{alt.title}</h4>
                      <p className="text-xs text-[#94a3b8] mt-0.5">
                        {alt.prepTimeMin} mins prep • {alt.calories} kcal • P: {alt.protein}g • C: {alt.carbs}g • F: {alt.fat}g
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleApplyMealSwap(alt)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shrink-0"
                    >
                      Select
                    </Button>
                  </div>
                  <div className="text-[11px] text-[#cbd5e1] flex items-center gap-1.5 italic">
                    <span className="text-emerald-400">•</span>
                    <span>{alt.clinicalBenefits[0]}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================== */}
      {/* MODAL 3: LOG WEIGHT DIALOG                 */}
      {/* ========================================== */}
      <Dialog open={isLogWeightOpen} onOpenChange={setIsLogWeightOpen}>
        <DialogContent className="max-w-md bg-[#0e1626] border-white/15 text-white">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg text-white flex items-center gap-2">
              <Scale className="h-5 w-5 text-emerald-400" />
              Log Weight Entry
            </DialogTitle>
            <DialogDescription className="text-xs text-[#94a3b8]">
              Record your morning weigh-in to keep metabolic calculations accurate.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-white">Weight (kg) *</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="e.g., 72.4"
                value={newWeightInput}
                onChange={(e) => setNewWeightInput(e.target.value)}
                className={`${portalInputClass} mt-1 text-xs`}
              />
            </div>
            <div>
              <Label className="text-xs text-white">Date *</Label>
              <Input
                type="date"
                value={newWeightDate}
                onChange={(e) => setNewWeightDate(e.target.value)}
                className={`${portalInputClass} mt-1 text-xs`}
              />
            </div>
            <div>
              <Label className="text-xs text-white">Notes / Context (Optional)</Label>
              <Input
                placeholder="e.g., Fasted morning weigh-in"
                value={newWeightNotes}
                onChange={(e) => setNewWeightNotes(e.target.value)}
                className={`${portalInputClass} mt-1 text-xs`}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLogWeightOpen(false)}
              className="border-white/15 text-white text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveWeightEntry}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
            >
              Save Weigh-in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================== */}
      {/* MODAL 4: QUICK ADJUST GOALS & PREFERENCES  */}
      {/* ========================================== */}
      <Dialog open={isCustomizeOpen} onOpenChange={setIsCustomizeOpen}>
        <DialogContent className="max-w-lg bg-[#0e1626] border-white/15 text-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-emerald-400" />
              Adjust Diet & Metabolic Goals
            </DialogTitle>
            <DialogDescription className="text-xs text-[#94a3b8]">
              Configure your health objective, activity multiplier, target weight, and pace.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Primary Health Goal */}
            <div>
              <Label className="text-xs text-white">Primary Health & Metabolic Goal</Label>
              <Select value={editGoal} onValueChange={(val: HealthGoal) => setEditGoal(val)}>
                <SelectTrigger className={`${portalInputClass} mt-1 text-xs`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0e1626] border-white/15 text-white text-xs">
                  {Object.entries(HEALTH_GOALS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Activity Level */}
            <div>
              <Label className="text-xs text-white">Activity Level (TDEE Multiplier)</Label>
              <Select value={editActivity} onValueChange={(val: ActivityLevel) => setEditActivity(val)}>
                <SelectTrigger className={`${portalInputClass} mt-1 text-xs`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0e1626] border-white/15 text-white text-xs">
                  {Object.entries(ACTIVITY_MULTIPLIERS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label} ({v.desc})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Weight & Weekly Pace */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-white">Target Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={editTargetWeight}
                  onChange={(e) => setEditTargetWeight(e.target.value)}
                  className={`${portalInputClass} mt-1 text-xs`}
                />
              </div>
              <div>
                <Label className="text-xs text-white">Weekly Target Pace</Label>
                <Select value={editWeeklyPace} onValueChange={(val) => setEditWeeklyPace(val)}>
                  <SelectTrigger className={`${portalInputClass} mt-1 text-xs`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0e1626] border-white/15 text-white text-xs">
                    <SelectItem value="-0.75">-0.75 kg / week (Aggressive)</SelectItem>
                    <SelectItem value="-0.5">-0.5 kg / week (Recommended)</SelectItem>
                    <SelectItem value="-0.25">-0.25 kg / week (Gradual)</SelectItem>
                    <SelectItem value="0">0 kg / week (Maintain Equilibrium)</SelectItem>
                    <SelectItem value="0.25">+0.25 kg / week (Lean Gain)</SelectItem>
                    <SelectItem value="0.5">+0.5 kg / week (Bulking)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dietary Preference */}
            <div>
              <Label className="text-xs text-white">Dietary Pattern Preference</Label>
              <Select value={editDietPref} onValueChange={(val) => setEditDietPref(val)}>
                <SelectTrigger className={`${portalInputClass} mt-1 text-xs`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0e1626] border-white/15 text-white text-xs">
                  <SelectItem value="omnivore">Omnivore (Standard)</SelectItem>
                  <SelectItem value="vegetarian">Vegetarian (Lacto-Veg)</SelectItem>
                  <SelectItem value="vegan">Vegan (100% Plant-Based)</SelectItem>
                  <SelectItem value="eggetarian">Eggetarian</SelectItem>
                  <SelectItem value="pescatarian">Pescatarian (Fish & Veg)</SelectItem>
                  <SelectItem value="jain">Jain Vegetarian (No Root Veg)</SelectItem>
                  <SelectItem value="keto">Ketogenic / Low-Carb</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Daily Water Target */}
            <div>
              <Label className="text-xs text-white">Daily Hydration Target (ml)</Label>
              <Input
                type="number"
                step="250"
                value={editWaterTarget}
                onChange={(e) => setEditWaterTarget(e.target.value)}
                className={`${portalInputClass} mt-1 text-xs`}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCustomizeOpen(false)}
              className="border-white/15 text-white text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAdjustedGoals}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
            >
              Save Goals & Recalculate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PatientPortalPage>
  );
}
