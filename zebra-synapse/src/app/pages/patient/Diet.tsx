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
  ChevronLeft,
  ChevronDown,
  ChevronUp,
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
  Zap,
  Footprints,
  Moon,
  Dumbbell,
  Bell,
  User,
  Heart,
  FileDown,
  CheckCircle,
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  BookOpen,
  MessageSquare,
  LogOut,
  Bot,
  Send,
} from "lucide-react";
import { Link, useLocation } from "react-router";
import PatientDietChat from "./PatientDietChat";
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
  type RecommendedExercise,
  RECOMMENDED_EXERCISES,
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

export interface DietProps {
  embedded?: boolean;
  selectedDate?: string;
  onDateChange?: (dateStr: string) => void;
  loggedFoods?: LoggedMealItem[];
  onLoggedFoodsChange?: (logs: LoggedMealItem[]) => void;
}

export default function Diet({
  embedded = false,
  selectedDate: externalDate,
  onDateChange,
  loggedFoods: externalLoggedFoods,
  onLoggedFoodsChange,
}: DietProps = {}) {
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

  const location = useLocation();

  // Active Navigation Mode for Zebra Synapse Sidebar
  type DietNavTab = "dashboard" | "weekly_plan" | "biomarker_rx" | "messages";
  const [activeTab, setActiveTab] = useState<DietNavTab>(() => {
    try {
      const params = new URLSearchParams(location.search);
      const tab = params.get("tab");
      if (tab === "messages" || tab === "dietitian" || tab === "chat") return "messages";
      if (tab === "weekly_plan" || tab === "meal_plan") return "weekly_plan";
      if (tab === "biomarker_rx") return "biomarker_rx";
    } catch {}
    return "dashboard";
  });

  // Sync activeTab if location search changes
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const tab = params.get("tab");
      if (tab === "messages" || tab === "dietitian" || tab === "chat") setActiveTab("messages");
      else if (tab === "weekly_plan" || tab === "meal_plan") setActiveTab("weekly_plan");
      else if (tab === "biomarker_rx") setActiveTab("biomarker_rx");
    } catch {}
  }, [location.search]);

  // AI Dietitian Chat Messages State
  const [aiChatInput, setAiChatInput] = useState("");
  const [aiChatLogs, setAiChatLogs] = useState<{ sender: "ai" | "user"; text: string; time: string }[]>([
    {
      sender: "ai",
      text: "Hello! I am your Zebra Synapse AI Nutritionist. Based on your current biomarkers and calorie targets, I can suggest delicious antioxidant-rich meals, advise on low-sodium swaps, and optimize your macro intake. How can I help you today?",
      time: "10:30 AM",
    },
  ]);

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
      weeklyPaceKg: -0.25,
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
  const [editWeeklyPace, setEditWeeklyPace] = useState<string>(String(settings.weeklyPaceKg || -0.25));
  const [editWaterTarget, setEditWaterTarget] = useState<string>(String(settings.dailyWaterTargetMl || 2500));
  const [editDietPref, setEditDietPref] = useState<string>(settings.dietaryPreference);

  // Sync edit states when dialog opens
  useEffect(() => {
    if (isCustomizeOpen) {
      setEditActivity(settings.activityLevel);
      setEditGoal(settings.goal);
      setEditTargetWeight(String(settings.targetWeightKg || profile?.weight_kg || 70));
      setEditWeeklyPace(String(settings.weeklyPaceKg || -0.25));
      setEditWaterTarget(String(settings.dailyWaterTargetMl || 2500));
      setEditDietPref(settings.dietaryPreference);
    }
  }, [isCustomizeOpen, settings, profile]);

  // Calculations
  const [currentWeight, setCurrentWeight] = useState<number>(() => profile?.weight_kg || 78);
  const currentHeight = profile?.height_cm || 175;
  const bmr = useMemo(() => calculateBMR(currentWeight, currentHeight, 34, "male"), [currentWeight, currentHeight]);
  const tdee = useMemo(() => calculateTDEE(bmr, settings.activityLevel), [bmr, settings.activityLevel]);
  const calorieTarget = 2100;
  const macroTargets = useMemo(
    () => calculateMacroTargets(calorieTarget, settings.goal, currentWeight, settings.customMacroSplit),
    [calorieTarget, settings.goal, currentWeight, settings.customMacroSplit]
  );
  const microTargets = useMemo(
    () => calculateMicroTargets(calorieTarget, settings.dietaryConditions, activePanel),
    [calorieTarget, settings.dietaryConditions, activePanel]
  );

  // ==========================================
  // FOOD TRACKING STATE (Per Selected Date)
  // ==========================================
  const activeDateKey = externalDate || new Date().toISOString().split("T")[0];
  const logsStorageKey = `zebra_food_logs_${profile?.id || "default"}_${activeDateKey}`;

  const [internalLoggedFoods, setInternalLoggedFoods] = useState<LoggedMealItem[]>(() => {
    try {
      const saved = localStorage.getItem(logsStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    const todayStr = new Date().toISOString().split("T")[0];
    if (activeDateKey === todayStr) {
      return [
        {
          id: "log_1",
          name: "Scrambled Eggs with Spinach & Whole Grain Toast",
          meal: "breakfast",
          servings: 1,
          servingSize: "1 plate",
          calories: 300,
          protein: 20,
          carbs: 25,
          fat: 12,
          fiber: 6,
          sodium: 240,
          loggedAt: new Date().toISOString(),
        },
        {
          id: "log_2",
          name: "Grilled Chicken Salad with Avocado and Quinoa",
          meal: "lunch",
          servings: 1,
          servingSize: "1 bowl",
          calories: 450,
          protein: 36,
          carbs: 40,
          fat: 20,
          fiber: 8,
          sodium: 320,
          loggedAt: new Date().toISOString(),
        },
        {
          id: "log_3",
          name: "Greek Yogurt with Mixed Berries and Almonds",
          meal: "snack",
          servings: 1,
          servingSize: "1 bowl",
          calories: 200,
          protein: 12,
          carbs: 18,
          fat: 10,
          fiber: 4,
          sodium: 60,
          loggedAt: new Date().toISOString(),
        },
        {
          id: "log_4",
          name: "Grilled Chicken with Sweet Potato and Green Beans",
          meal: "dinner",
          servings: 1,
          servingSize: "1 plate",
          calories: 500,
          protein: 35,
          carbs: 45,
          fat: 20,
          fiber: 9,
          sodium: 380,
          loggedAt: new Date().toISOString(),
        },
      ];
    }
    return [];
  });

  // Keep internal state updated if activeDateKey changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(logsStorageKey);
      if (saved) {
        setInternalLoggedFoods(JSON.parse(saved));
        return;
      }
    } catch (e) {
      console.error(e);
    }
    const todayStr = new Date().toISOString().split("T")[0];
    if (activeDateKey === todayStr) {
      setInternalLoggedFoods([
        {
          id: "log_1",
          name: "Scrambled Eggs with Spinach & Whole Grain Toast",
          meal: "breakfast",
          servings: 1,
          servingSize: "1 plate",
          calories: 300,
          protein: 20,
          carbs: 25,
          fat: 12,
          fiber: 6,
          sodium: 240,
          loggedAt: new Date().toISOString(),
        },
        {
          id: "log_2",
          name: "Grilled Chicken Salad with Avocado and Quinoa",
          meal: "lunch",
          servings: 1,
          servingSize: "1 bowl",
          calories: 450,
          protein: 36,
          carbs: 40,
          fat: 20,
          fiber: 8,
          sodium: 320,
          loggedAt: new Date().toISOString(),
        },
        {
          id: "log_3",
          name: "Greek Yogurt with Mixed Berries and Almonds",
          meal: "snack",
          servings: 1,
          servingSize: "1 bowl",
          calories: 200,
          protein: 12,
          carbs: 18,
          fat: 10,
          fiber: 4,
          sodium: 60,
          loggedAt: new Date().toISOString(),
        },
        {
          id: "log_4",
          name: "Grilled Chicken with Sweet Potato and Green Beans",
          meal: "dinner",
          servings: 1,
          servingSize: "1 plate",
          calories: 500,
          protein: 35,
          carbs: 45,
          fat: 20,
          fiber: 9,
          sodium: 380,
          loggedAt: new Date().toISOString(),
        },
      ]);
    } else {
      setInternalLoggedFoods([]);
    }
  }, [activeDateKey, logsStorageKey]);

  const loggedFoods = externalLoggedFoods ?? internalLoggedFoods;

  const updateLoggedFoods = (updater: (prev: LoggedMealItem[]) => LoggedMealItem[]) => {
    const next = updater(loggedFoods);
    if (onLoggedFoodsChange) {
      onLoggedFoodsChange(next);
    } else {
      setInternalLoggedFoods(next);
      try {
        localStorage.setItem(logsStorageKey, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Water Intake State (Nutrigo widget)
  const waterStorageKey = `zebra_water_logs_${profile?.id || "default"}_${activeDateKey}`;
  const [waterConsumedMl, setWaterConsumedMl] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(waterStorageKey);
      return saved ? Number(saved) : 1300;
    } catch {
      return 1300;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(waterStorageKey, String(waterConsumedMl));
    } catch (e) {
      console.error(e);
    }
  }, [waterConsumedMl, waterStorageKey]);

  const handleAddWater = (amountMl: number = 250) => {
    setWaterConsumedMl((prev) => {
      const next = prev + amountMl;
      toast.success(`Hydration logged: +${amountMl}ml (Total: ${(next / 1000).toFixed(1)}L)`);
      addActivity(`Logged +${amountMl}ml water (${(next / 1000).toFixed(1)}L / ${(settings.dailyWaterTargetMl / 1000).toFixed(1)}L target)`);
      return next;
    });
  };

  // Steps & Sleep Mock State (Nutrigo widget)
  const [stepsCount] = useState<number>(8050);
  const stepsGoal = 10000;
  const stepsLeft = Math.max(0, stepsGoal - stepsCount);
  const stepsPct = Math.round((stepsCount / stepsGoal) * 100);
  const [sleepHours] = useState<number>(6.5);
  const [burnedCalories] = useState<number>(510);

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

  const caloriesRemaining = Math.max(0, calorieTarget - totalsConsumed.calories);

  // Macro percentages for progress bars
  const carbProgressPct = Math.min(100, Math.round((totalsConsumed.carbs / Math.max(1, macroTargets.grams.carbs)) * 100));
  const protProgressPct = Math.min(100, Math.round((totalsConsumed.protein / Math.max(1, macroTargets.grams.protein)) * 100));
  const fatProgressPct = Math.min(100, Math.round((totalsConsumed.fat / Math.max(1, macroTargets.grams.fat)) * 100));

  // Calendar Day Strip (Nutrigo mini-calendar)
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(1); // Tuesday (Index 1) as active in mockup
  const weekDays = [
    { dayName: "Mon", dateNum: 4, full: "Monday, Sep 4" },
    { dayName: "Tue", dateNum: 5, full: "Tuesday, Sep 5" },
    { dayName: "Wed", dateNum: 6, full: "Wednesday, Sep 6" },
    { dayName: "Thu", dateNum: 7, full: "Thursday, Sep 7" },
    { dayName: "Fri", dateNum: 8, full: "Friday, Sep 8" },
    { dayName: "Sat", dateNum: 9, full: "Saturday, Sep 9" },
  ];

  // Meal Accordion Open States (Nutrigo right panel)
  const [openMealCategories, setOpenMealCategories] = useState<Record<MealCategory, boolean>>({
    breakfast: true,
    lunch: true,
    snack: false,
    dinner: false,
  });

  const toggleMealCategory = (category: MealCategory) => {
    setOpenMealCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  // Recent Activity Feed
  const [activityFeed, setActivityFeed] = useState<
    { id: string; time: string; text: string; type: "bell" | "yoga" | "run" | "food" }[]
  >([
    {
      id: "act_1",
      time: "6:00 PM",
      text: 'Notification sent: "Congratulations! You\'ve reached 75% of your cardio endurance goal!"',
      type: "bell",
    },
    {
      id: "act_2",
      time: "5:15 PM",
      text: "Completed 3rd stretching session for flexibility improvement",
      type: "yoga",
    },
    {
      id: "act_3",
      time: "3:00 PM",
      text: "Cardio progress updated – 7.5 km completed out of 10 km goal for endurance improvement",
      type: "run",
    },
    {
      id: "act_4",
      time: "12:45 PM",
      text: "Logged lunch meal: Grilled Chicken Wrap with Avocado and Spinach (450 kcal)",
      type: "food",
    },
  ]);

  const addActivity = (text: string, type: "bell" | "yoga" | "run" | "food" = "food") => {
    const timeStr = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    setActivityFeed((prev) => [{ id: `act_${Date.now()}`, time: timeStr, text, type }, ...prev]);
  };

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
    updateLoggedFoods((prev) => [...prev, newEntry]);
    addActivity(`Logged ${food.name} (${newEntry.calories} kcal) to ${selectedMealForAdd.toUpperCase()}`, "food");
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
    updateLoggedFoods((prev) => [...prev, newEntry]);
    addActivity(`Logged ${customFoodName} (${cal} kcal) to ${selectedMealForAdd.toUpperCase()}`, "food");
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
    const item = loggedFoods.find((f) => f.id === id);
    updateLoggedFoods((prev) => prev.filter((i) => i.id !== id));
    if (item) {
      toast.info(`Removed ${item.name}`);
    }
  };

  // ==========================================
  // WEEKLY MEAL PLAN & SWAPPER
  // ==========================================
  const [selectedPlanDay, setSelectedPlanDay] = useState<number>(1);
  const [weeklyPlan, setWeeklyPlan] = useState<DayDietPlan[]>(() => {
    return generateWeeklyDietPlan(activePanel, biomarkerTrends, settings);
  });

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
    updateLoggedFoods((prev) => [...prev, newEntry]);
    addActivity(`Logged ${recipe.title} (${recipe.calories} kcal) to ${recipe.mealType.toUpperCase()}`, "food");
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
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8f5] text-slate-600">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin text-lime-500" />
          <span className="text-sm font-medium">Loading Diet & Wellness Hub...</span>
        </div>
      </div>
    );
  }

  if (!hasLabReports && activeTab !== "messages") {
    return (
      <div className="p-6 bg-[#f6f8f5] min-h-full space-y-6">
        <LabReportsRequiredPlaceholder
          title="Clinical Biomarker Lab Reports Required for Dashboard"
          description="Upload your blood panel to unlock precision biomarker targets, metabolic BMR adjustments, and cardiovascular dietary prescriptions. Or chat directly with your AI Dietitian right now without any lab reports!"
        />
        <div className="flex justify-center">
          <Button
            onClick={() => setActiveTab("messages")}
            className="h-12 px-6 rounded-2xl bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold shadow-md shadow-lime-500/20 flex items-center gap-2"
          >
            <Bot className="h-5 w-5" />
            <span>Open AI Dietitian Chat (No Lab Reports Required)</span>
          </Button>
        </div>
      </div>
    );
  }

  // Active recipes for recommended menu
  const recommendedMenuBreakfast = weeklyPlan[0]?.meals?.breakfast;
  const recommendedMenuLunch = weeklyPlan[0]?.meals?.lunch;

  // Render sub-views or main Zebra Synapse dashboard with dedicated Left Sidebar
  return (
    <div className={embedded ? "w-full" : "min-h-screen bg-[#f8faf6] text-slate-800 font-sans selection:bg-lime-200 selection:text-slate-900 pt-2 sm:pt-3 lg:pt-4 pb-4 sm:pb-6 lg:pb-8 px-2 sm:px-4 lg:px-6"}>
      <div className={embedded ? "w-full flex flex-col gap-6" : "max-w-[1680px] mx-auto flex flex-col lg:flex-row gap-5 lg:gap-6 items-start w-full"}>
        
        {/* ========================================================================= */}
        {/* 1. ZEBRA SYNAPSE LEFT SIDEBAR (DEDICATED TO DIET SECTION) */}
        {/* ========================================================================= */}
        {!embedded && (
          <aside className="w-full lg:w-[245px] xl:w-[255px] shrink-0 lg:sticky lg:top-4 bg-white rounded-[28px] p-4 sm:p-5 border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col justify-between self-stretch lg:self-auto min-h-fit lg:min-h-[calc(100vh-3rem)] select-none">
            {/* Brand Header */}
            <div
              onClick={() => setActiveTab("dashboard")}
              className="flex items-center gap-3 pb-4 pt-1 px-1 border-b border-slate-100/70 cursor-pointer group"
            >
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-lime-400 border border-slate-700/40 shadow-sm transition-transform group-hover:scale-105">
                <Activity className="h-5 w-5 stroke-[2.3]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-slate-900 font-['Manrope']">
                  Zebra Synapse
                </span>
                <span className="text-[10px] font-semibold text-slate-400 tracking-wider">
                  Clinical Nutrition & Diet
                </span>
              </div>
            </div>

          {/* Navigation Links */}
          <nav className="my-3 space-y-1 flex-1 overflow-y-auto [scrollbar-width:none]">
            {(
              [
                { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                { id: "weekly_plan", label: "Calendar", icon: Calendar },
                { id: "messages", label: "AI Dietitian", icon: Bot },
                { id: "weekly_plan", label: "Meal Plan", icon: ClipboardList, hasSubmenu: true },
              ] as Array<{
                id: string;
                label: string;
                icon: any;
                hasSubmenu?: boolean;
                badge?: string | number;
              }>
            ).map((item, idx) => {
              const Icon = item.icon;
              const active = activeTab === item.id;

              return (
                <button
                  key={`${item.id}_${item.label}_${idx}`}
                  type="button"
                  onClick={() => setActiveTab(item.id as any)}
                  className={`group flex w-full items-center gap-3.5 px-3.5 py-2.5 rounded-[16px] text-sm font-semibold transition-all duration-150 cursor-pointer ${
                    active
                      ? "bg-[#9de438] text-slate-900 shadow-sm shadow-lime-500/20 font-bold"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center transition-colors ${
                      active ? "text-slate-900" : "text-slate-400 group-hover:text-slate-700"
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={active ? 2.3 : 1.9} />
                  </span>

                  <span className="truncate text-[13px] font-medium leading-none">
                    {item.label}
                  </span>

                  {item.badge !== undefined && (
                    <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#ff7a29] px-1.5 text-[11px] font-bold text-white shadow-sm shadow-orange-500/20">
                      {item.badge}
                    </span>
                  )}

                  {item.hasSubmenu && !item.badge && (
                    <ChevronDown
                      className={`ml-auto h-4 w-4 transition-transform ${
                        active ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"
                      }`}
                      strokeWidth={2}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Logout / Exit button */}
          <Link
            to="/patient"
            className="mt-auto flex w-full items-center gap-3 rounded-[14px] px-3.5 py-2 text-[13px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <LogOut className="h-4 w-4 stroke-[2]" />
            <span>Exit to Portal</span>
          </Link>
        </aside>
        )}

        {/* ========================================================================= */}
        {/* 2. MAIN DIET CONTENT AREA */}
        {/* ========================================================================= */}
        <div className="flex-1 min-w-0 space-y-6">
          
          {/* TOP APP HEADER: BRAND / GREETING / SEARCH / SUB-TABS / LOG FOOD BUTTON */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-[24px] p-5 sm:p-6 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-500/15 text-lime-600 shadow-sm">
                <Apple className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Hello, {profile?.full_name?.split(" ")[0] || "Adam"}!
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-lime-100 px-2.5 py-0.5 text-xs font-semibold text-lime-800">
                    <Sparkles className="h-3 w-3" /> Zebra Synapse Active
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Let's begin our journey to better health today
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative hidden md:block w-48 lg:w-60">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search anything..."
                  value={foodSearchQuery}
                  onChange={(e) => setFoodSearchQuery(e.target.value)}
                  className="pl-9 h-11 rounded-2xl bg-slate-50 border-slate-200/70 text-xs text-slate-700"
                />
              </div>

              <Button
                onClick={() => setIsCustomizeOpen(true)}
                variant="outline"
                className="h-11 px-4 rounded-2xl border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 flex items-center gap-2 text-xs"
              >
                <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                Goals
              </Button>

              <Button
                onClick={() => {
                  setSelectedMealForAdd("breakfast");
                  setIsAddFoodOpen(true);
                }}
                className="h-11 px-5 rounded-2xl bg-[#84cc16] hover:bg-[#73b512] text-white font-semibold shadow-md shadow-lime-500/25 transition-all active:scale-[0.98] flex items-center gap-2"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                Log Food
              </Button>
            </div>
          </header>

        {/* ========================================================================= */}
        {/* VIEW 1: ZEBRA SYNAPSE MAIN DAILY DASHBOARD */}
        {/* ========================================================================= */}
        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            
            {/* LEFT 8 COLUMNS: Top Stats, Radial Gauges, Workout Banner, Recommended Menus & Exercises */}
            <div className="xl:col-span-8 space-y-6">
              
              {/* --- HERO ROW: Calories Circular Ring & Macro Targets --- */}
              <div className="grid grid-cols-1 gap-6">

                {/* 2. Calories Intake Circular Ring Gauge Card */}
                <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-2">
                    <h3 className="font-bold text-slate-900 text-base">Calories Intake</h3>
                    <button
                      onClick={() => setIsCustomizeOpen(true)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                    >
                      •••
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center my-2">
                    
                    {/* Left: Circular Ring Meter */}
                    <div className="sm:col-span-5 flex flex-col items-center justify-center relative">
                      <div className="relative w-36 h-36 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                          <circle
                            cx="60"
                            cy="60"
                            r="48"
                            fill="transparent"
                            stroke="#f1f5f9"
                            strokeWidth="10"
                          />
                          <circle
                            cx="60"
                            cy="60"
                            r="48"
                            fill="transparent"
                            stroke="#f97316"
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray="301.6"
                            strokeDashoffset={`${301.6 * (1 - Math.min(1, totalsConsumed.calories / calorieTarget))}`}
                            className="transition-all duration-700 ease-out"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center text-center">
                          <Zap className="h-4 w-4 text-orange-500 fill-orange-500 mb-0.5" />
                          <span className="text-xl font-black text-slate-900 tracking-tight">{caloriesRemaining}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">kcal left</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Eaten vs Burned & Macro Bars */}
                    <div className="sm:col-span-7 space-y-3">
                      
                      {/* Top Pill Badges: Eaten vs Burned */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-lime-50 rounded-xl p-2 flex items-center gap-2 border border-lime-100/60">
                          <span className="h-6 w-6 rounded-lg bg-lime-500 text-white flex items-center justify-center text-[10px]">
                            <Utensils className="h-3 w-3" />
                          </span>
                          <div>
                            <div className="text-xs font-black text-slate-900">{totalsConsumed.calories} kcal</div>
                            <div className="text-[9px] font-semibold text-slate-400">Eaten calories</div>
                          </div>
                        </div>

                        <div className="flex-1 bg-orange-50 rounded-xl p-2 flex items-center gap-2 border border-orange-100/60">
                          <span className="h-6 w-6 rounded-lg bg-orange-500 text-white flex items-center justify-center text-[10px]">
                            <Flame className="h-3 w-3" />
                          </span>
                          <div>
                            <div className="text-xs font-black text-slate-900">{burnedCalories} kcal</div>
                            <div className="text-[9px] font-semibold text-slate-400">Burned calories</div>
                          </div>
                        </div>
                      </div>

                      {/* Macro Progress Bars (Carbs, Protein, Fat) */}
                      <div className="space-y-2 pt-1">
                        {/* Carbohydrates */}
                        <div>
                          <div className="flex justify-between items-center text-xs font-semibold mb-1">
                            <span className="text-slate-800">
                              <span className="font-bold text-slate-900">{totalsConsumed.carbs}</span>
                              <span className="text-slate-400 font-normal">/{macroTargets.grams.carbs}g</span>
                            </span>
                            <span className="text-[11px] text-slate-500">Carbohydrates</span>
                            <span className="text-[11px] font-bold text-lime-600">{carbProgressPct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-lime-500 rounded-full" style={{ width: `${carbProgressPct}%` }} />
                          </div>
                        </div>

                        {/* Proteins */}
                        <div>
                          <div className="flex justify-between items-center text-xs font-semibold mb-1">
                            <span className="text-slate-800">
                              <span className="font-bold text-slate-900">{totalsConsumed.protein}</span>
                              <span className="text-slate-400 font-normal">/{macroTargets.grams.protein}g</span>
                            </span>
                            <span className="text-[11px] text-slate-500">Proteins</span>
                            <span className="text-[11px] font-bold text-lime-600">{protProgressPct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-lime-500 rounded-full" style={{ width: `${protProgressPct}%` }} />
                          </div>
                        </div>

                        {/* Fats */}
                        <div>
                          <div className="flex justify-between items-center text-xs font-semibold mb-1">
                            <span className="text-slate-800">
                              <span className="font-bold text-slate-900">{totalsConsumed.fat}</span>
                              <span className="text-slate-400 font-normal">/{macroTargets.grams.fat}g</span>
                            </span>
                            <span className="text-[11px] text-slate-500">Fats</span>
                            <span className="text-[11px] font-bold text-orange-500">{fatProgressPct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-400 rounded-full" style={{ width: `${fatProgressPct}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* --- WORKOUT PROGRESS BANNER (Horizontal Cards: Cardio, Strength, Flexibility) --- */}
              <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-base">Workout Progress</h3>
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
                    <span>This Week</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* 1. Cardio - Running */}
                  <div className="bg-[#f2fbe8] rounded-2xl p-4 border border-lime-200/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white text-slate-900 flex items-center justify-center shadow-sm">
                        <Footprints className="h-5 w-5 text-lime-600" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Running 10 km</div>
                        <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                          <span className="text-slate-900 font-bold">75%</span> (7/10)
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-lime-800 bg-lime-200/80 px-2.5 py-1 rounded-full">
                      Cardio
                    </span>
                  </div>

                  {/* 2. Strength - Squats */}
                  <div className="bg-[#fffbeb] rounded-2xl p-4 border border-amber-200/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white text-slate-900 flex items-center justify-center shadow-sm">
                        <Dumbbell className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Squatting 50kg</div>
                        <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                          <span className="text-slate-900 font-bold">60%</span> (5/8)
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-800 bg-amber-200/80 px-2.5 py-1 rounded-full">
                      Strength
                    </span>
                  </div>

                  {/* 3. Flexibility - Stretching */}
                  <div className="bg-[#fff7ed] rounded-2xl p-4 border border-orange-200/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white text-slate-900 flex items-center justify-center shadow-sm">
                        <Activity className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Stretching to touch toes</div>
                        <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                          <span className="text-slate-900 font-bold">50%</span> (3/6)
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-orange-800 bg-orange-200/80 px-2.5 py-1 rounded-full">
                      Flexibility
                    </span>
                  </div>
                </div>
              </div>

              {/* --- BOTTOM SECTION: RECOMMENDED MENU --- */}
              <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-base">Recommended Menu</h3>
                  <button
                    onClick={() => setActiveTab("weekly_plan")}
                    className="text-xs font-semibold text-lime-600 hover:text-lime-700 flex items-center gap-1 cursor-pointer"
                  >
                    View Full Plan <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Breakfast Card */}
                  {recommendedMenuBreakfast && (
                    <div className="bg-slate-50/70 rounded-2xl p-3.5 border border-slate-100/90 flex flex-col justify-between hover:shadow-md transition-all group">
                      <div>
                        {/* Image Thumbnail */}
                        <div className="relative h-28 w-full rounded-xl overflow-hidden mb-3 bg-slate-200">
                          <img
                            src={recommendedMenuBreakfast.imageUrl || "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=400&q=80"}
                            alt={recommendedMenuBreakfast.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-2 left-2 flex items-center gap-1.5">
                            <span className="bg-lime-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                              Breakfast
                            </span>
                            <span className="bg-white/90 backdrop-blur-sm text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                              {recommendedMenuBreakfast.calories} kcal
                            </span>
                          </div>
                        </div>

                        {/* Macro Pills */}
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 mb-1.5">
                          <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">C {recommendedMenuBreakfast.carbs}g</span>
                          <span className="bg-lime-100 text-lime-800 px-1.5 py-0.5 rounded">P {recommendedMenuBreakfast.protein}g</span>
                          <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded">F {recommendedMenuBreakfast.fat}g</span>
                        </div>

                        <h4 className="font-bold text-slate-900 text-xs line-clamp-1 mb-1">
                          {recommendedMenuBreakfast.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {recommendedMenuBreakfast.clinicalBenefits[0] || "Rich in fiber and antioxidants, providing energy."}
                        </p>
                      </div>

                      <Button
                        onClick={() => handleLogMealFromPlanToToday(recommendedMenuBreakfast)}
                        className="mt-3 h-8 w-full rounded-xl bg-white hover:bg-lime-50 text-lime-700 border border-lime-300 font-semibold text-xs transition-colors shadow-none cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Log to Today
                      </Button>
                    </div>
                  )}

                  {/* Lunch Card */}
                  {recommendedMenuLunch && (
                    <div className="bg-slate-50/70 rounded-2xl p-3.5 border border-slate-100/90 flex flex-col justify-between hover:shadow-md transition-all group">
                      <div>
                        {/* Image Thumbnail */}
                        <div className="relative h-28 w-full rounded-xl overflow-hidden mb-3 bg-slate-200">
                          <img
                            src={recommendedMenuLunch.imageUrl || "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=400&q=80"}
                            alt={recommendedMenuLunch.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-2 left-2 flex items-center gap-1.5">
                            <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                              Lunch
                            </span>
                            <span className="bg-white/90 backdrop-blur-sm text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                              {recommendedMenuLunch.calories} kcal
                            </span>
                          </div>
                        </div>

                        {/* Macro Pills */}
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 mb-1.5">
                          <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">C {recommendedMenuLunch.carbs}g</span>
                          <span className="bg-lime-100 text-lime-800 px-1.5 py-0.5 rounded">P {recommendedMenuLunch.protein}g</span>
                          <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded">F {recommendedMenuLunch.fat}g</span>
                        </div>

                        <h4 className="font-bold text-slate-900 text-xs line-clamp-1 mb-1">
                          {recommendedMenuLunch.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {recommendedMenuLunch.clinicalBenefits[0] || "Rich in protein and healthy fats for recovery."}
                        </p>
                      </div>

                      <Button
                        onClick={() => handleLogMealFromPlanToToday(recommendedMenuLunch)}
                        className="mt-3 h-8 w-full rounded-xl bg-white hover:bg-orange-50 text-orange-700 border border-orange-300 font-semibold text-xs transition-colors shadow-none cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Log to Today
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ===================================================================== */}
            {/* RIGHT 4 COLUMNS: User Pill, Calendar Strip, Meal Timeline, Activity Feed */}
            {/* ===================================================================== */}
            <div className="xl:col-span-4 space-y-6">
              
              {/* 1. Mini Profile Header Pill */}
              <div className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-600 flex items-center justify-center text-slate-950 font-black shadow-sm">
                    {profile?.full_name?.charAt(0) || "A"}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {profile?.full_name || "Adam Vasylenko"}
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-400">Premium Member</p>
                  </div>
                </div>
                <div className="relative">
                  <button className="h-9 w-9 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors">
                    <Bell className="h-4 w-4" />
                  </button>
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-orange-500" />
                </div>
              </div>



              {/* 3. Daily Meal Timeline Accordions (Breakfast, Lunch, Snack, Dinner) */}
              <div className="bg-white rounded-[28px] p-5 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <h4 className="font-bold text-slate-900 text-sm">Today's Meals Timeline</h4>
                  <button
                    onClick={() => {
                      setSelectedMealForAdd("breakfast");
                      setIsAddFoodOpen(true);
                    }}
                    className="text-xs font-semibold text-lime-600 hover:text-lime-700 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Meal
                  </button>
                </div>

                {/* Accordions */}
                <div className="space-y-2.5">
                  
                  {/* Breakfast */}
                  <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                    <div
                      onClick={() => toggleMealCategory("breakfast")}
                      className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-lime-600 fill-lime-100" />
                        <span className="text-xs font-bold text-slate-900">Breakfast</span>
                        <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200/60">
                          300 kcal
                        </span>
                      </div>
                      <ChevronUp
                        className={`h-4 w-4 text-slate-400 transition-transform ${
                          openMealCategories.breakfast ? "" : "transform rotate-180"
                        }`}
                      />
                    </div>

                    {openMealCategories.breakfast && (
                      <div className="px-3.5 pb-3.5 pt-1 space-y-2 border-t border-slate-100 bg-white">
                        <div className="flex items-start gap-2.5">
                          <img
                            src="https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=200&q=80"
                            alt="Scrambled eggs"
                            className="h-12 w-12 rounded-xl object-cover shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-bold text-slate-900 leading-snug">
                              Scrambled Eggs with Spinach & Whole Grain Toast
                            </h5>
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 mt-1">
                              <span>C 25g</span>
                              <span>•</span>
                              <span>P 20g</span>
                              <span>•</span>
                              <span>F 12g</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Lunch */}
                  <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                    <div
                      onClick={() => toggleMealCategory("lunch")}
                      className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-lime-600 fill-lime-100" />
                        <span className="text-xs font-bold text-slate-900">Lunch</span>
                        <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200/60">
                          450 kcal
                        </span>
                      </div>
                      <ChevronUp
                        className={`h-4 w-4 text-slate-400 transition-transform ${
                          openMealCategories.lunch ? "" : "transform rotate-180"
                        }`}
                      />
                    </div>

                    {openMealCategories.lunch && (
                      <div className="px-3.5 pb-3.5 pt-1 space-y-2 border-t border-slate-100 bg-white">
                        <div className="flex items-start gap-2.5">
                          <img
                            src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=200&q=80"
                            alt="Grilled chicken salad"
                            className="h-12 w-12 rounded-xl object-cover shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-bold text-slate-900 leading-snug">
                              Grilled Chicken Salad with Avocado and Quinoa
                            </h5>
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 mt-1">
                              <span>C 40g</span>
                              <span>•</span>
                              <span>P 36g</span>
                              <span>•</span>
                              <span>F 20g</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Snack */}
                  <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                    <div
                      onClick={() => toggleMealCategory("snack")}
                      className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-amber-500 fill-amber-100" />
                        <span className="text-xs font-bold text-slate-900">Snack</span>
                        <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200/60">
                          200 kcal
                        </span>
                      </div>
                      <ChevronUp
                        className={`h-4 w-4 text-slate-400 transition-transform ${
                          openMealCategories.snack ? "" : "transform rotate-180"
                        }`}
                      />
                    </div>

                    {openMealCategories.snack && (
                      <div className="px-3.5 pb-3.5 pt-1 space-y-2 border-t border-slate-100 bg-white">
                        <div className="flex items-start gap-2.5">
                          <img
                            src="https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=200&q=80"
                            alt="Greek yogurt"
                            className="h-12 w-12 rounded-xl object-cover shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-bold text-slate-900 leading-snug">
                              Greek Yogurt with Mixed Berries and Almonds
                            </h5>
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 mt-1">
                              <span>C 18g</span>
                              <span>•</span>
                              <span>P 12g</span>
                              <span>•</span>
                              <span>F 10g</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dinner */}
                  <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                    <div
                      onClick={() => toggleMealCategory("dinner")}
                      className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-orange-500 fill-orange-100" />
                        <span className="text-xs font-bold text-slate-900">Dinner</span>
                        <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200/60">
                          500 kcal
                        </span>
                      </div>
                      <ChevronUp
                        className={`h-4 w-4 text-slate-400 transition-transform ${
                          openMealCategories.dinner ? "" : "transform rotate-180"
                        }`}
                      />
                    </div>

                    {openMealCategories.dinner && (
                      <div className="px-3.5 pb-3.5 pt-1 space-y-2 border-t border-slate-100 bg-white">
                        <div className="flex items-start gap-2.5">
                          <img
                            src="https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=200&q=80"
                            alt="Grilled chicken sweet potato"
                            className="h-12 w-12 rounded-xl object-cover shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-bold text-slate-900 leading-snug">
                              Grilled Chicken with Sweet Potato and Green Beans
                            </h5>
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 mt-1">
                              <span>C 45g</span>
                              <span>•</span>
                              <span>P 35g</span>
                              <span>•</span>
                              <span>F 20g</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: 7-DAY MEAL PLANNER & SMART GROCERY LIST */}
        {/* ========================================================================= */}
        {activeTab === "weekly_plan" && (
          <div className="space-y-6">
            <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">7-Day Biomarker-Guided Meal Plan</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Clinically calibrated meals matching your metabolic target of {calorieTarget} kcal/day
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setGrocerySubTab(!grocerySubTab)}
                  className={`h-10 px-4 rounded-xl text-xs font-semibold transition-all ${
                    grocerySubTab
                      ? "bg-lime-500 text-white shadow-md shadow-lime-500/20"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {grocerySubTab ? "View Recipes" : "Grocery List"}
                </Button>
              </div>
            </div>

            {grocerySubTab ? (
              /* Grocery List View */
              <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-lime-600" />
                    Interactive Smart Grocery List
                  </h3>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        Object.entries(groceryList)
                          .map(([cat, items]) => `${cat.toUpperCase()}:\n${items.map((i) => `- ${i.name} (${i.amount})`).join("\n")}`)
                          .join("\n\n")
                      );
                      toast.success("Grocery list copied to clipboard!");
                    }}
                    className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                  >
                    Copy List
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Object.entries(groceryList).map(([category, items]) => (
                    <div key={category} className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100">
                      <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-3 flex items-center justify-between">
                        <span>{category.replace("_", " ")}</span>
                        <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border">
                          {items.length}
                        </span>
                      </h4>
                      <div className="space-y-2">
                        {items.map((item) => {
                          const isChecked = !!checkedGroceryItems[item.name];
                          return (
                            <label
                              key={item.name}
                              onClick={() => toggleGroceryItem(item.name)}
                              className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer p-1.5 rounded-lg hover:bg-white transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="mt-0.5 rounded text-lime-600 focus:ring-lime-500"
                              />
                              <span className={isChecked ? "line-through text-slate-400" : ""}>
                                {item.name} <span className="text-[10px] text-slate-400">({item.amount})</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Weekly Recipes Plan View */
              <div className="space-y-6">
                {/* Day selector tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
                  {weeklyPlan.map((day) => (
                    <button
                      key={day.dayNumber}
                      onClick={() => setSelectedPlanDay(day.dayNumber)}
                      className={`px-5 py-3 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                        selectedPlanDay === day.dayNumber
                          ? "bg-lime-500 text-white shadow-md shadow-lime-500/25 scale-[1.02]"
                          : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-100"
                      }`}
                    >
                      Day {day.dayNumber}: {day.dayName}
                    </button>
                  ))}
                </div>

                {/* Active Day Meals */}
                {(() => {
                  const day = weeklyPlan.find((d) => d.dayNumber === selectedPlanDay) || weeklyPlan[0];
                  if (!day) return null;

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {(["breakfast", "lunch", "dinner", "snack"] as MealCategory[]).map((mealType) => {
                        const recipe = day.meals[mealType];
                        return (
                          <div
                            key={mealType}
                            className="bg-white rounded-[28px] p-5 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col justify-between"
                          >
                            <div>
                              <div className="relative h-36 w-full rounded-2xl overflow-hidden mb-3 bg-slate-200">
                                <img
                                  src={recipe.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80"}
                                  alt={recipe.title}
                                  className="h-full w-full object-cover"
                                />
                                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                                  <span className="bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                                    {mealType}
                                  </span>
                                  <span className="bg-white/90 backdrop-blur-sm text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {recipe.calories} kcal
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 mb-2">
                                <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">C {recipe.carbs}g</span>
                                <span className="bg-lime-100 text-lime-800 px-1.5 py-0.5 rounded">P {recipe.protein}g</span>
                                <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded">F {recipe.fat}g</span>
                              </div>

                              <h4 className="font-bold text-slate-900 text-sm mb-1.5">{recipe.title}</h4>
                              <p className="text-xs text-slate-500 leading-relaxed mb-3">
                                {recipe.clinicalBenefits[0]}
                              </p>

                              {recipe.biomarkerBadges && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {recipe.biomarkerBadges.map((badge, idx) => (
                                    <span key={idx} className="text-[10px] font-semibold bg-lime-50 text-lime-800 px-2 py-0.5 rounded-md">
                                      {badge}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                              <Button
                                onClick={() => handleLogMealFromPlanToToday(recipe)}
                                className="flex-1 h-9 rounded-xl bg-lime-500 hover:bg-lime-600 text-white text-xs font-semibold"
                              >
                                Log to Today
                              </Button>
                              <Button
                                onClick={() => {
                                  setSwapTarget({ dayNum: day.dayNumber, mealType, currentRecipeId: recipe.id });
                                  setIsSwapModalOpen(true);
                                }}
                                className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                              >
                                Swap
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: BIOMARKER RX & CLINICAL LAB INSIGHTS */}
        {/* ========================================================================= */}
        {activeTab === "biomarker_rx" && (
          <div className="space-y-6">
            <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <HeartPulse className="h-6 w-6 text-rose-500" />
                  Clinical Biomarker Dietary Prescription
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Personalized dietary protocols derived from your uploaded lab panels
                </p>
              </div>

              <div className="flex items-center gap-3">
                <ReportScopeSelector
                  panels={panels}
                  uploads={uploads}
                  selectedReportId={selectedReportId}
                  onSelectReportId={setSelectedReportId}
                  multiPanelMeta={multiPanelMeta}
                  biomarkerTrends={biomarkerTrends}
                />
              </div>
            </div>

            {/* Micronutrient Targets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fiber Target</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{microTargets.fiberG} g/day</div>
                <p className="text-[11px] text-lime-700 font-medium mt-1">High soluble fiber for lipid clearance</p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sodium Ceiling</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{microTargets.sodiumMg} mg/day</div>
                <p className="text-[11px] text-orange-600 font-medium mt-1">DASH guideline for arterial pressure</p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Potassium Target</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{microTargets.potassiumMg} mg/day</div>
                <p className="text-[11px] text-lime-700 font-medium mt-1">Counters intracellular sodium load</p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Water Target</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{(microTargets.waterMl / 1000).toFixed(1)} L/day</div>
                <p className="text-[11px] text-lime-700 font-medium mt-1">Optimizes renal clearance rate</p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: AI DIETITIAN MESSAGES CHAT */}
        {/* ========================================================================= */}
        {activeTab === "messages" && (
          <div className="w-full">
            <PatientDietChat embedded />
          </div>
        )}

        </div> {/* Close main area div */}

        {/* ========================================================================= */}
        {/* MODAL: ADD FOOD DIALOG */}
        {/* ========================================================================= */}
        <Dialog open={isAddFoodOpen} onOpenChange={setIsAddFoodOpen}>
          <DialogContent className="sm:max-w-[550px] bg-white text-slate-900 rounded-[28px] p-6 border-slate-100 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Log Food to Daily Tracker</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Search verified food database or enter custom nutrition
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search oatmeal, chicken, quinoa..."
                    value={foodSearchQuery}
                    onChange={(e) => setFoodSearchQuery(e.target.value)}
                    className="pl-9 h-10 rounded-xl bg-slate-50 border-slate-200 text-xs"
                  />
                </div>
                <Select value={selectedMealForAdd} onValueChange={(v) => setSelectedMealForAdd(v as MealCategory)}>
                  <SelectTrigger className="w-[120px] h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-100 shadow-xl rounded-xl">
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Food Items List */}
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 [scrollbar-width:thin]">
                {filteredFoods.slice(0, 10).map((food) => (
                  <div
                    key={food.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-lime-50/60 border border-slate-100 transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{food.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {food.servingSize} • {food.calories} kcal (C {food.carbs}g, P {food.protein}g, F {food.fat}g)
                      </div>
                    </div>
                    <Button
                      onClick={() => handleLogFoodItem(food)}
                      className="h-8 px-3 rounded-lg bg-lime-500 hover:bg-lime-600 text-white text-xs font-semibold shadow-none"
                    >
                      + Add
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => setIsAddFoodOpen(false)}
                className="h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* MODAL: CUSTOMIZE GOALS & METABOLIC TARGETS */}
        {/* ========================================================================= */}
        <Dialog open={isCustomizeOpen} onOpenChange={setIsCustomizeOpen}>
          <DialogContent className="sm:max-w-[500px] bg-white text-slate-900 rounded-[28px] p-6 border-slate-100 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Customize Diet & Health Goals</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Adjust metabolic pace, weight target, and water goals
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2">
              <div>
                <Label className="text-xs font-semibold text-slate-600">Health Goal</Label>
                <Select value={editGoal} onValueChange={(v) => setEditGoal(v as HealthGoal)}>
                  <SelectTrigger className="mt-1 h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-100 shadow-xl rounded-xl">
                    <SelectItem value="fat_loss">Fat Loss & Calorie Deficit</SelectItem>
                    <SelectItem value="maintain_longevity">Maintenance & Longevity</SelectItem>
                    <SelectItem value="muscle_gain">Lean Muscle Building</SelectItem>
                    <SelectItem value="blood_sugar_balance">Blood Sugar & HbA1c Balance</SelectItem>
                    <SelectItem value="heart_cardiovascular">Cardiovascular & Lipid Control</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-600">Target Weight (kg)</Label>
                  <Input
                    type="number"
                    value={editTargetWeight}
                    onChange={(e) => setEditTargetWeight(e.target.value)}
                    className="mt-1 h-10 rounded-xl bg-slate-50 border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600">Daily Water Target (ml)</Label>
                  <Input
                    type="number"
                    value={editWaterTarget}
                    onChange={(e) => setEditWaterTarget(e.target.value)}
                    className="mt-1 h-10 rounded-xl bg-slate-50 border-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => setIsCustomizeOpen(false)}
                className="h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAdjustedGoals}
                className="h-10 rounded-xl bg-lime-500 hover:bg-lime-600 text-white text-xs font-semibold shadow-md shadow-lime-500/20"
              >
                Save Goals
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
                Choose an alternative clinical recipe with matching calorie & macro targets
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
                    className="h-8 px-3 rounded-xl bg-lime-500 hover:bg-lime-600 text-white text-xs font-semibold"
                  >
                    Select
                  </Button>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button
                onClick={() => setIsSwapModalOpen(false)}
                className="h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}

