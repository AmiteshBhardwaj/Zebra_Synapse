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
} from "lucide-react";
import { useAuth } from "../../../auth/AuthContext";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
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

  const daysList = [
    { dayNumber: 1, name: "Mon", title: "Cardio & Core", status: "Done" },
    { dayNumber: 2, name: "Tue", title: "Upper Body", status: "Done" },
    { dayNumber: 3, name: "Wed", title: "Mobility", status: "Rest" },
    { dayNumber: 4, name: "Thu", title: "Lower Body", status: "Plan" },
    { dayNumber: 5, name: "Fri", title: "HIIT", status: "Plan" },
    { dayNumber: 6, name: "Sat", title: "Endurance", status: "Plan" },
    { dayNumber: 7, name: "Sun", title: "Full Rest", status: "Rest" },
  ];

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
      <header className="flex shrink-0 flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200/80 mb-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-2xl bg-lime-500/15 text-lime-700 shadow-sm">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-['Manrope']">
                Diet & Fitness
              </h1>
              <span className="rounded-full border border-lime-200 bg-lime-50 px-2 py-0.2 text-[9px] font-bold text-lime-800 uppercase tracking-wider">
                Integrated
              </span>
            </div>
            <p className="text-[11px] text-slate-500 line-clamp-1">
              Nutrition tracking, macro goals, and conditioning schedule
            </p>
          </div>
        </div>

        {/* Tab switcher + Date stepper + Quick action */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Tab Group */}
          <div className="inline-flex items-center gap-1 rounded-xl bg-slate-200/60 p-0.5 text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => handleTabChange("overview")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
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
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
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
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
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
            <div className="flex items-center gap-1 bg-white rounded-xl p-0.5 border border-slate-200 shadow-2xs text-xs">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevDay}
                className="h-7 px-1.5 text-slate-600 hover:bg-slate-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="font-bold text-slate-800 text-[11px] px-1">{formattedDateTitle}</span>
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
            className="h-8 px-3 rounded-xl bg-[#84cc16] hover:bg-[#73b512] text-white text-xs font-bold gap-1 shadow-2xs cursor-pointer"
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
                <span className="font-bold text-cyan-300">Day 4 Lower Body</span>
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

              {/* Weekly Workout Snapshot Card */}
              <div className="rounded-[22px] bg-white border border-slate-100 p-3.5 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-2 flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Dumbbell className="h-4 w-4 text-lime-600" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 font-['Manrope']">7-Day Workout Routine</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTabChange("exercise")}
                    className="text-[11px] font-bold text-lime-700 hover:text-lime-800 inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    Full Plan <ChevronRight className="h-3 w-3" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {daysList.map((day) => {
                    const isToday = day.dayNumber === currentDayOfWeekNumber;
                    return (
                      <button
                        key={day.dayNumber}
                        type="button"
                        onClick={() => handleSelectExerciseDayFromSnapshot(day.dayNumber)}
                        className={`flex flex-col items-center justify-between p-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isToday
                            ? "border-lime-500 bg-lime-500 text-slate-950 font-bold shadow-2xs"
                            : "border-slate-100 bg-slate-50/70 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <span className="text-[10px] font-extrabold">{day.name}</span>
                        <span className="text-[9px] text-slate-500 font-semibold mt-0.5 truncate w-full">
                          {day.status}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: MEALS TIMELINE (SCROLLABLE CONTAINER) */}
            <div className="lg:col-span-7 xl:col-span-7 rounded-[22px] bg-white border border-slate-100 p-3.5 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col min-h-0">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2 shrink-0">
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

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-slate-900 text-xs">{meal.calories} kcal</span>
                        <div className="text-[9px] font-mono text-slate-400">
                          C:{meal.carbs || 0}g P:{meal.protein || 0}g F:{meal.fat || 0}g
                        </div>
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
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: MEAL PLAN */}
      {activeTab === "meals" && (
        <div className="flex-1 min-h-0 overflow-y-auto animate-in fade-in duration-200">
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
        <div className="flex-1 min-h-0 overflow-y-auto animate-in fade-in duration-200">
          <ExercisePlan embedded={true} initialDay={selectedExerciseDay} />
        </div>
      )}
    </div>
  );
}
