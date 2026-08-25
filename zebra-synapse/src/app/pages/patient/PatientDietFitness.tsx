import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  UtensilsCrossed,
  Utensils,
  Dumbbell,
  Sparkles,
  Flame,
  Plus,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Activity,
  Apple,
  Clock,
  HeartPulse,
  CheckCircle2,
  Check,
  Trash2,
} from "lucide-react";
import { useAuth } from "../../../auth/AuthContext";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { useActiveReport } from "../../../hooks/useActiveReport";
import { generateDeterministicExercisePlan } from "../../../lib/exercisePlan";
import {
  portalPanelClass,
  portalPrimaryButtonClass,
  portalSecondaryButtonClass,
} from "../../components/patient/PortalTheme";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import Diet from "./Diet";
import ExercisePlan from "./ExercisePlan";

export type DietFitnessTab = "overview" | "meals" | "exercise";

function getTodayLocalDateStr(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split("-").map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  }
  return new Date();
}

function formatLocalDateTitle(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function PatientDietFitness() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { hasLabReports } = usePatientLabReports();
  const { panels } = usePatientLabPanels();

  const [activeTab, setActiveTab] = useState<DietFitnessTab>("overview");
  const [selectedExerciseDay, setSelectedExerciseDay] = useState<number>(1);

  // Sync active tab and exercise day from URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab")?.toLowerCase();
    const dayParam = params.get("day");

    if (tabParam === "meals" || tabParam === "diet" || tabParam === "nutrition") {
      setActiveTab("meals");
    } else if (tabParam === "exercise" || tabParam === "workout" || tabParam === "fitness") {
      setActiveTab("exercise");
    } else if (tabParam === "overview") {
      setActiveTab("overview");
    }

    if (dayParam) {
      const parsedDay = parseInt(dayParam, 10);
      if (!isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 7) {
        setSelectedExerciseDay(parsedDay);
      }
    }
  }, [location.search]);

  const todayStr = useMemo(() => getTodayLocalDateStr(), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const formattedDateTitle = useMemo(() => {
    return formatLocalDateTitle(selectedDate);
  }, [selectedDate]);

  const handlePrevDay = () => {
    setSelectedDate((prev) => addDaysToDateStr(prev, -1));
  };

  const handleNextDay = () => {
    setSelectedDate((prev) => addDaysToDateStr(prev, 1));
  };

  function getInitialDemoMeals(pref?: string | null) {
    const norm = (pref || "omnivore").toLowerCase();

    if (norm === "jain") {
      return [
        { id: "log_1", name: "Turmeric Tofu & Bell Pepper Stir-Fry", meal: "breakfast", calories: 320, protein: 24, carbs: 18, fat: 14 },
        { id: "log_2", name: "Moong Dal & Tri-Color Quinoa Bowl", meal: "lunch", calories: 420, protein: 28, carbs: 48, fat: 12 },
        { id: "log_3", name: "Roasted Almonds & Dried Figs", meal: "snack", calories: 190, protein: 8, carbs: 15, fat: 12 },
        { id: "log_4", name: "Grilled Paneer with Steamed Zucchini", meal: "dinner", calories: 480, protein: 30, carbs: 35, fat: 20 },
      ];
    }

    if (norm === "vegetarian" || norm === "vegan") {
      return [
        { id: "log_1", name: "Turmeric Tofu & Baby Spinach Scramble", meal: "breakfast", calories: 340, protein: 26, carbs: 18, fat: 16 },
        { id: "log_2", name: "Fresh Paneer Avocado & Quinoa Salad", meal: "lunch", calories: 440, protein: 32, carbs: 42, fat: 18 },
        { id: "log_3", name: "Greek Yogurt with Mixed Berries", meal: "snack", calories: 220, protein: 14, carbs: 20, fat: 10 },
        { id: "log_4", name: "Lentil Dal with Brown Rice & Broccoli", meal: "dinner", calories: 480, protein: 30, carbs: 52, fat: 14 },
      ];
    }

    return [
      { id: "log_1", name: "Scrambled Eggs with Spinach & Toast", meal: "breakfast", calories: 300, protein: 20, carbs: 25, fat: 12 },
      { id: "log_2", name: "Grilled Chicken Salad with Quinoa", meal: "lunch", calories: 450, protein: 36, carbs: 40, fat: 20 },
      { id: "log_3", name: "Greek Yogurt with Almonds", meal: "snack", calories: 200, protein: 12, carbs: 18, fat: 10 },
      { id: "log_4", name: "Grilled Chicken with Sweet Potato", meal: "dinner", calories: 500, protein: 35, carbs: 45, fat: 20 },
    ];
  }

  const logsStorageKey = `zebra_food_logs_${profile?.id || "default"}_${selectedDate}`;
  const [loggedMeals, setLoggedMeals] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem(logsStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    if (selectedDate === todayStr) {
      return getInitialDemoMeals(profile?.dietary_preference);
    }
    return [];
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(logsStorageKey);
      if (saved) {
        setLoggedMeals(JSON.parse(saved));
        return;
      }
    } catch (e) {
      console.error(e);
    }
    if (selectedDate === todayStr) {
      setLoggedMeals(getInitialDemoMeals(profile?.dietary_preference));
    } else {
      setLoggedMeals([]);
    }
  }, [selectedDate, logsStorageKey, todayStr, profile?.dietary_preference]);

  const handleLoggedMealsChange = (nextMeals: any[]) => {
    setLoggedMeals(nextMeals);
    try {
      localStorage.setItem(logsStorageKey, JSON.stringify(nextMeals));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteLoggedMeal = (mealIdOrIndex: string | number) => {
    const updated = loggedMeals.filter((m, idx) => {
      if (m.id) return m.id !== mealIdOrIndex;
      return idx !== mealIdOrIndex;
    });
    handleLoggedMealsChange(updated);
  };

  const totals = useMemo(() => {
    return loggedMeals.reduce(
      (acc, item) => ({
        calories: acc.calories + (Number(item.calories) || 0),
        protein: acc.protein + (Number(item.protein) || 0),
        carbs: acc.carbs + (Number(item.carbs) || 0),
        fat: acc.fat + (Number(item.fat) || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [loggedMeals]);

  const targetCal = 2100;
  const targetCarbs = 230;
  const targetProtein = 140;
  const targetFat = 65;

  const carbPct = Math.min(100, Math.round((totals.carbs / targetCarbs) * 100));
  const proteinPct = Math.min(100, Math.round((totals.protein / targetProtein) * 100));
  const fatPct = Math.min(100, Math.round((totals.fat / targetFat) * 100));
  const caloriesPct = Math.min(100, Math.round((totals.calories / targetCal) * 100));

  const currentDayOfWeekNumber = useMemo(() => {
    const jsDay = parseLocalDate(selectedDate).getDay();
    return jsDay === 0 ? 7 : jsDay;
  }, [selectedDate]);

  const { activePanel, biomarkerTrends } = useActiveReport(panels);

  const exercisePlan = useMemo(() => {
    const fitnessStorageKey = `zebra_fitness_prefs_${profile?.id || "default"}`;
    let prefs: any = {};
    try {
      const saved = localStorage.getItem(fitnessStorageKey);
      if (saved) prefs = JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return generateDeterministicExercisePlan(activePanel, biomarkerTrends, {
      fitnessLevel: prefs.fitnessLevel || "beginner",
      equipment: prefs.workoutEnv || prefs.equipment || "home_minimal",
      goal: prefs.primaryGoal || "general_health",
      targetDurationMin: Number(prefs.durationMin) || 30,
      physicalLimitations: prefs.limitations || [],
    });
  }, [activePanel, biomarkerTrends, profile?.id]);

  const todayWorkout = useMemo(() => {
    return (
      exercisePlan.days.find((d) => d.dayNumber === currentDayOfWeekNumber) ||
      exercisePlan.days[0]
    );
  }, [exercisePlan, currentDayOfWeekNumber]);

  const allDayExercises = useMemo(() => {
    if (!todayWorkout) return [];
    return [...todayWorkout.warmup, ...todayWorkout.mainWorkout, ...todayWorkout.cooldown];
  }, [todayWorkout]);

  // Track completed exercise IDs per date (defaults to empty array - unticked)
  const completedExKey = `zebra_completed_exercises_${profile?.id || "default"}_${selectedDate}`;
  const [completedExerciseIds, setCompletedExerciseIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(completedExKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(completedExKey);
      if (saved !== null) {
        setCompletedExerciseIds(JSON.parse(saved));
        return;
      }
    } catch (e) {
      console.error(e);
    }
    setCompletedExerciseIds([]);
  }, [completedExKey]);

  const toggleExerciseCompleted = (exId: string) => {
    const next = completedExerciseIds.includes(exId)
      ? completedExerciseIds.filter((id) => id !== exId)
      : [...completedExerciseIds, exId];

    setCompletedExerciseIds(next);
    try {
      localStorage.setItem(completedExKey, JSON.stringify(next));
      const isAllDone =
        todayWorkout.restDay ||
        (allDayExercises.length > 0 &&
          allDayExercises.every((e, idx) => next.includes(e.id || `ex_${idx}`)));
      localStorage.setItem(
        `zebra_workout_done_${profile?.id || "default"}_${selectedDate}`,
        JSON.stringify(isAllDone)
      );
    } catch (e) {
      console.error(e);
    }
  };

  const isWorkoutDone = useMemo(() => {
    if (todayWorkout.restDay) return true;
    if (allDayExercises.length === 0) return true;
    return allDayExercises.every((e, idx) => {
      const id = e.id || `ex_${idx}`;
      return completedExerciseIds.includes(id);
    });
  }, [todayWorkout.restDay, allDayExercises, completedExerciseIds]);

  // Calculate real week days compliance and active streak dynamically
  const currentWeekDays = useMemo(() => {
    const refDate = parseLocalDate(selectedDate);
    const jsDay = refDate.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;
    const monDate = new Date(refDate);
    monDate.setDate(refDate.getDate() - (dayOfWeek - 1));

    const labels = ["M", "T", "W", "T", "F", "S", "S"];
    const days = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monDate);
      d.setDate(monDate.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dStr = `${yyyy}-${mm}-${dd}`;
      const dayNum = i + 1;

      let isDone = false;
      if (dStr === selectedDate) {
        isDone = loggedMeals.length > 0 && isWorkoutDone;
      } else {
        try {
          const savedMeals = localStorage.getItem(`zebra_food_logs_${profile?.id || "default"}_${dStr}`);
          const meals = savedMeals ? JSON.parse(savedMeals) : [];
          const savedW = localStorage.getItem(`zebra_workout_done_${profile?.id || "default"}_${dStr}`);
          const wDone = savedW !== null ? JSON.parse(savedW) : false;
          isDone = Array.isArray(meals) && meals.length > 0 && wDone;
        } catch {
          isDone = false;
        }
      }

      days.push({
        dayNum,
        label: labels[i],
        dateStr: dStr,
        isDone,
      });
    }
    return days;
  }, [selectedDate, loggedMeals, isWorkoutDone, profile?.id]);

  const streakCount = useMemo(() => {
    let count = 0;
    for (const day of currentWeekDays) {
      if (day.dayNum > currentDayOfWeekNumber) break;
      if (day.isDone) {
        count++;
      } else {
        count = 0;
      }
    }
    return count;
  }, [currentWeekDays, currentDayOfWeekNumber]);

  const handleTabChange = (tab: DietFitnessTab) => {
    setActiveTab(tab);
    const searchParams = new URLSearchParams(location.search);
    searchParams.set("tab", tab);
    navigate({ search: searchParams.toString() }, { replace: true });
  };

  const handleSelectExerciseDayFromSnapshot = (dayNum: number) => {
    setSelectedExerciseDay(dayNum);
    setActiveTab("exercise");
    const searchParams = new URLSearchParams(location.search);
    searchParams.set("tab", "exercise");
    searchParams.set("day", dayNum.toString());
    navigate({ search: searchParams.toString() }, { replace: true });
  };

  return (
    <div className="h-full flex flex-col p-3 sm:p-4 lg:p-5 max-w-[1600px] mx-auto overflow-hidden bg-[#f6f8f5]">
      {/* 1. COMPACT TOP HEADER & NAVIGATION BAR */}
      <header className="flex shrink-0 flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 rounded-2xl bg-white/75 backdrop-blur-md border border-white/90 px-3.5 py-2 sm:px-4.5 sm:py-2.5 shadow-[0_4px_20px_rgba(30,100,180,0.05)] mb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-2xl bg-lime-500/15 text-lime-700 shadow-sm">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-['Manrope'] leading-tight">
                Diet & Fitness
              </h1>
              <span className="rounded-full border border-lime-200 bg-lime-50 px-2 py-0.5 text-[9px] font-bold text-lime-800 uppercase tracking-wider font-['Manrope']">
                Integrated
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 leading-tight">
              Nutrition tracking, macro goals, and conditioning schedule
            </p>
          </div>
        </div>

        {/* Tab switcher + Date stepper + Quick action */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Tab Group */}
          <div className="inline-flex items-center gap-1 rounded-xl bg-slate-200/60 p-0.5 text-xs font-semibold text-slate-600 font-['Manrope']">
            <button
              type="button"
              onClick={() => handleTabChange("overview")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer font-['Manrope'] ${
                activeTab === "overview"
                  ? "bg-[#84cc16] text-slate-950 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Overview</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("meals")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer font-['Manrope'] ${
                activeTab === "meals"
                  ? "bg-[#84cc16] text-slate-950 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Utensils className="h-3.5 w-3.5" />
              <span>Meal Plan</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("exercise")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer font-['Manrope'] ${
                activeTab === "exercise"
                  ? "bg-[#84cc16] text-slate-950 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Dumbbell className="h-3.5 w-3.5" />
              <span>Exercise Plan</span>
            </button>
          </div>

          {/* Date Selector */}
          {activeTab !== "exercise" && (
            <div className="flex items-center gap-1 bg-white rounded-xl p-0.5 border border-slate-200 shadow-2xs text-xs font-['Manrope']">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevDay}
                className="h-7 px-1.5 text-slate-600 hover:bg-slate-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="font-bold text-slate-800 text-[11px] px-1 font-['Manrope']">{formattedDateTitle}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextDay}
                className="h-7 px-1.5 text-slate-600 hover:bg-slate-50"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <Button
            size="sm"
            onClick={() => handleTabChange("meals")}
            className="h-8 px-3 rounded-xl bg-[#84cc16] hover:bg-[#73b512] text-white text-xs font-bold gap-1 shadow-2xs cursor-pointer font-['Manrope']"
          >
            <Plus className="h-3.5 w-3.5" /> Log Meal
          </Button>
        </div>
      </header>

      {/* 2. OVERVIEW TAB: 2-COLUMN SINGLE SCREEN DASHBOARD */}
      {activeTab === "overview" && (
        <div className="flex-1 min-h-0 flex flex-col gap-2.5">
          {/* Greeting & Targets Mini Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-[#0a1b38] to-slate-900 border border-slate-800 px-4 py-2.5 text-white flex flex-wrap items-center justify-between gap-3 shadow-sm shrink-0">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-lime-400 animate-pulse" />
              <h2 className="text-xs sm:text-sm font-bold font-['Manrope']">
                Hello, {profile?.full_name || "Maya Thompson"}!
              </h2>
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">• Active Protocol</span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-xl">
                <span className="text-[10px] uppercase text-slate-400 font-bold">Daily Target:</span>
                <span className="font-mono font-bold text-lime-400">2,100 kcal</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-xl">
                <span className="text-[10px] uppercase text-slate-400 font-bold">Workout:</span>
                <span className="font-bold text-cyan-300">
                  Day {todayWorkout.dayNumber} {todayWorkout.dayName}
                </span>
              </div>
            </div>
          </div>

          {/* 2-Column Split */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* LEFT COLUMN: NUTRITION RING & WEEKLY WORKOUT SNAPSHOT */}
            <div className="lg:col-span-5 xl:col-span-5 flex flex-col gap-2.5 min-h-0 overflow-y-auto pr-0.5 [scrollbar-width:thin]">
              {/* Calories & Macros Card */}
              <div className="rounded-[22px] bg-white border border-slate-100 p-3.5 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-2.5 shrink-0">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 font-['Manrope']">Calories & Macros</h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {totals.calories} / {targetCal} kcal
                  </span>
                </div>

                <div className="flex items-center justify-around gap-2 pt-1">
                  {/* Calorie Ring Mini */}
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#84cc16"
                        strokeWidth="12"
                        strokeDasharray="251.2"
                        strokeDashoffset={251.2 - (251.2 * caloriesPct) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-700"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-bold font-mono text-slate-900 leading-none">{totals.calories}</span>
                      <span className="text-[8px] text-slate-400 font-bold">kcal</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs flex-1 max-w-[170px]">
                    <div className="flex items-center justify-between text-[11px] font-semibold bg-slate-50 px-2 py-1 rounded-lg">
                      <span className="flex items-center gap-1 text-slate-600">
                        <span className="h-2 w-2 rounded-full bg-lime-500" /> Eaten
                      </span>
                      <span className="font-mono font-bold text-slate-900">{totals.calories} kcal</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-semibold bg-slate-50 px-2 py-1 rounded-lg">
                      <span className="flex items-center gap-1 text-slate-600">
                        <span className="h-2 w-2 rounded-full bg-orange-500" /> Burned
                      </span>
                      <span className="font-mono font-bold text-slate-900">420 kcal</span>
                    </div>
                  </div>
                </div>

                {/* Macro Progress Bars */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-[10px]">
                  <div>
                    <div className="flex justify-between font-bold text-slate-600 mb-0.5">
                      <span>Carbs</span>
                      <span className="font-mono">{totals.carbs}g</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${carbPct}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between font-bold text-slate-600 mb-0.5">
                      <span>Protein</span>
                      <span className="font-mono">{totals.protein}g</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${proteinPct}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between font-bold text-slate-600 mb-0.5">
                      <span>Fat</span>
                      <span className="font-mono">{totals.fat}g</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-sky-500 rounded-full" style={{ width: `${fatPct}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Daily Workout Snapshot Card */}
              <div className="rounded-[22px] bg-white border border-slate-100 p-3.5 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex-1 flex flex-col gap-2.5 min-h-0">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Dumbbell className="h-4 w-4 text-lime-600" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 font-['Manrope']">
                      {todayWorkout.dayName}'s Workout Routine
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectExerciseDayFromSnapshot(todayWorkout.dayNumber)}
                    className="text-[11px] font-bold text-lime-700 hover:text-lime-800 inline-flex items-center gap-0.5 cursor-pointer font-['Manrope']"
                  >
                    Full Plan <ChevronRight className="h-3 w-3" />
                  </button>
                </div>

                {/* Day Focus Header */}
                <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 space-y-1.5 shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="px-2 py-0.5 rounded-md bg-lime-100 text-lime-800 text-[10px] font-extrabold uppercase font-['Manrope'] shrink-0">
                        Day {todayWorkout.dayNumber}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 truncate font-['Manrope']">
                        {todayWorkout.focus}
                      </h4>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold font-mono shrink-0 ${
                        todayWorkout.restDay ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"
                      }`}
                    >
                      {todayWorkout.intensity}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-slate-500 font-semibold font-['Manrope']">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {todayWorkout.estimatedDurationMin} mins
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame className="h-3 w-3 text-orange-500" />
                      {todayWorkout.estimatedCalories} kcal
                    </span>
                    <span className="flex items-center gap-1">
                      <HeartPulse className="h-3 w-3 text-rose-500" />
                      {todayWorkout.targetHeartRateBpm.split("(")[0]}
                    </span>
                  </div>
                </div>

                {/* Exercises list or Rest box for specific day */}
                <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5 [scrollbar-width:thin]">
                  {todayWorkout.restDay ? (
                    <div className="h-full flex flex-col items-center justify-center p-4 bg-amber-50/50 rounded-2xl border border-amber-100 text-center space-y-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100/80 text-amber-700 shadow-2xs">
                        <HeartPulse className="h-5 w-5" />
                      </div>
                      <div className="space-y-1 max-w-sm">
                        <p className="text-xs font-extrabold text-amber-950 font-['Manrope']">Active Rest & Recovery Day</p>
                        <p className="text-[11px] text-amber-800/90 leading-normal font-medium font-['Manrope']">
                          {todayWorkout.recoveryTip || "Focus on light walking, hydration, and restorative rest."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    allDayExercises.map((ex, idx) => {
                      const exId = ex.id || `ex_${idx}`;
                      const isChecked = completedExerciseIds.includes(exId);

                      return (
                        <div
                          key={exId}
                          className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all text-xs ${
                            isChecked
                              ? "bg-lime-50/50 border-lime-200/80"
                              : "bg-slate-50/70 border-slate-100 hover:border-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Round Check Button */}
                            <button
                              type="button"
                              onClick={() => toggleExerciseCompleted(exId)}
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all cursor-pointer ${
                                isChecked
                                  ? "bg-[#84cc16] border-[#84cc16] text-slate-950 shadow-2xs"
                                  : "border-slate-300 bg-white hover:border-lime-500 text-transparent"
                              }`}
                              title={isChecked ? "Mark incomplete" : "Mark completed"}
                            >
                              <Check className="h-3 w-3 stroke-[3]" />
                            </button>

                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 font-['Manrope'] ${
                                ex.category === "warmup"
                                  ? "bg-amber-100 text-amber-800"
                                  : ex.category === "cardio"
                                  ? "bg-sky-100 text-sky-800"
                                  : ex.category === "strength"
                                  ? "bg-purple-100 text-purple-800"
                                  : ex.category === "mobility"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {ex.category}
                            </span>
                            <div className="min-w-0">
                              <p
                                className={`font-bold text-xs truncate leading-tight font-['Manrope'] ${
                                  isChecked ? "text-slate-900 line-through decoration-slate-400" : "text-slate-800"
                                }`}
                              >
                                {ex.name}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium truncate font-['Manrope']">
                                {ex.targetMuscles}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {ex.durationMin ? `${ex.durationMin}m` : ex.sets && ex.reps ? `${ex.sets}x${ex.reps}` : "1 set"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: MEALS TIMELINE & CONSISTENCY (SCROLLABLE CONTAINER) */}
            <div className="lg:col-span-7 xl:col-span-7 rounded-[22px] bg-white border border-slate-100 p-3.5 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col gap-3 min-h-0">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-lime-600" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 font-['Manrope']">
                    Meals Logged for {formattedDateTitle}
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {loggedMeals.length} items
                </span>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
                {loggedMeals.length > 0 ? (
                  loggedMeals.map((meal, idx) => (
                    <div
                      key={meal.id || idx}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 hover:bg-lime-50/30 transition-all text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-lime-700">
                          <Apple className="h-4 w-4 text-lime-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                              {meal.meal || "Meal"}
                            </span>
                            <span className="rounded bg-lime-100 text-lime-800 text-[9px] font-bold px-1">Logged</span>
                          </div>
                          <p className="font-semibold text-slate-700 text-xs truncate mt-0.5">{meal.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="font-mono font-bold text-slate-900 text-xs">{meal.calories} kcal</span>
                          <div className="text-[9px] font-mono text-slate-400">
                            C:{meal.carbs || 0}g P:{meal.protein || 0}g F:{meal.fat || 0}g
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteLoggedMeal(meal.id || idx)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                          title="Delete logged meal"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-2">
                    <Utensils className="h-8 w-8 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">No meals logged for this day.</p>
                    <Button
                      size="sm"
                      onClick={() => handleTabChange("meals")}
                      className="h-8 px-3 rounded-xl bg-[#84cc16] hover:bg-[#73b512] text-white text-xs font-bold"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Food Item
                    </Button>
                  </div>
                )}
              </div>

              {/* Consistency & Protocol Streak Card (Light Theme, Gap-Free) */}
              <div className="rounded-2xl bg-slate-50/90 border border-slate-200/80 p-3 shadow-2xs space-y-2.5 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-50 text-orange-600 border border-orange-200/60">
                      <Flame className="h-4 w-4 fill-orange-500 text-orange-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-slate-900 font-['Manrope']">
                          Consistency Tracker
                        </h4>
                        <span className="bg-orange-100/80 text-orange-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-orange-200 font-['Manrope']">
                          {streakCount} {streakCount === 1 ? "Day" : "Days"} Streak 🔥
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium font-['Manrope']">
                        Based on logged meals & workout activity
                      </p>
                    </div>
                  </div>

                  {/* Stat Badges */}
                  <div className="flex items-center gap-1.5 text-[10px] font-['Manrope']">
                    <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-700">
                      Meals: {loggedMeals.length}/4
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-lg font-bold border transition-all ${
                        isWorkoutDone
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-amber-100 text-amber-800 border-amber-300"
                      }`}
                    >
                      {todayWorkout.restDay
                        ? "Rest Day ✓"
                        : isWorkoutDone
                        ? "Workout Completed ✓"
                        : `Workout: ${completedExerciseIds.length}/${allDayExercises.length}`}
                    </span>
                  </div>
                </div>

                {/* 7-Day Dynamic Weekly Streak Grid */}
                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {currentWeekDays.map((item) => {
                    const isToday = item.dayNum === currentDayOfWeekNumber;
                    const isDone = item.isDone;

                    return (
                      <div
                        key={item.dayNum}
                        className={`py-1.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                          isToday
                            ? "bg-[#84cc16] text-slate-950 font-extrabold border-lime-500 shadow-2xs"
                            : isDone
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold"
                            : "bg-white text-slate-400 border-slate-200 font-medium"
                        }`}
                      >
                        <span className="text-[10px] uppercase font-bold">{item.label}</span>
                        <span className="mt-0.5">
                          {isDone ? (
                            <Check className={`h-3 w-3 ${isToday ? "text-slate-950" : "text-emerald-600"} stroke-[2.5]`} />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 inline-block" />
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: MEAL PLAN */}
      {activeTab === "meals" && (
        <div className="flex-1 min-h-0 overflow-y-auto animate-in fade-in duration-200 pr-1 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
          <Diet
            embedded={true}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            loggedFoods={loggedMeals}
            onLoggedFoodsChange={handleLoggedMealsChange}
          />
        </div>
      )}

      {/* Tab 3: EXERCISE PLAN */}
      {activeTab === "exercise" && (
        <div className="flex-1 min-h-0 overflow-y-auto animate-in fade-in duration-200 pr-1 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
          <ExercisePlan embedded={true} initialDay={selectedExerciseDay} />
        </div>
      )}
    </div>
  );
}
