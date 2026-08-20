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
import { useActiveReport } from "../../../hooks/useActiveReport";
import {
  PatientPortalPage,
  portalPanelClass,
  portalPrimaryButtonClass,
  portalSecondaryButtonClass,
} from "../../components/patient/PortalTheme";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import Diet from "./Diet";
import ExercisePlan from "./ExercisePlan";

export type DietFitnessTab = "overview" | "meals" | "exercise";

export default function PatientDietFitness() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { hasLabReports } = usePatientLabReports();
  const { panels } = usePatientLabPanels();

  const [activeTab, setActiveTab] = useState<DietFitnessTab>("overview");
  const [selectedExerciseDay, setSelectedExerciseDay] = useState<number>(1);

  // Sync active tab and exercise day from URL params (e.g. ?tab=exercise&day=3)
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

  // Unified Date State Across Overview & Meal Plan
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const formattedDateTitle = useMemo(() => {
    try {
      const [year, month, day] = selectedDate.split("-").map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const handlePrevDay = () => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const d = new Date(year, month - 1, day - 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const d = new Date(year, month - 1, day + 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  // Synchronized Food Logs State for Selected Date
  const logsStorageKey = `zebra_food_logs_${profile?.id || "default"}_${selectedDate}`;
  const [loggedMeals, setLoggedMeals] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem(logsStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    if (selectedDate === todayStr) {
      return [
        {
          id: "log_1",
          name: "Scrambled Eggs with Spinach & Whole Grain Toast",
          meal: "breakfast",
          calories: 300,
          protein: 20,
          carbs: 25,
          fat: 12,
        },
        {
          id: "log_2",
          name: "Grilled Chicken Salad with Avocado and Quinoa",
          meal: "lunch",
          calories: 450,
          protein: 36,
          carbs: 40,
          fat: 20,
        },
        {
          id: "log_3",
          name: "Greek Yogurt with Mixed Berries and Almonds",
          meal: "snack",
          calories: 200,
          protein: 12,
          carbs: 18,
          fat: 10,
        },
        {
          id: "log_4",
          name: "Grilled Chicken with Sweet Potato and Green Beans",
          meal: "dinner",
          calories: 500,
          protein: 35,
          carbs: 45,
          fat: 20,
        },
      ];
    }
    return [];
  });

  // Re-read storage whenever selectedDate or profile changes
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
      setLoggedMeals([
        {
          id: "log_1",
          name: "Scrambled Eggs with Spinach & Whole Grain Toast",
          meal: "breakfast",
          calories: 300,
          protein: 20,
          carbs: 25,
          fat: 12,
        },
        {
          id: "log_2",
          name: "Grilled Chicken Salad with Avocado and Quinoa",
          meal: "lunch",
          calories: 450,
          protein: 36,
          carbs: 40,
          fat: 20,
        },
        {
          id: "log_3",
          name: "Greek Yogurt with Mixed Berries and Almonds",
          meal: "snack",
          calories: 200,
          protein: 12,
          carbs: 18,
          fat: 10,
        },
        {
          id: "log_4",
          name: "Grilled Chicken with Sweet Potato and Green Beans",
          meal: "dinner",
          calories: 500,
          protein: 35,
          carbs: 45,
          fat: 20,
        },
      ]);
    } else {
      setLoggedMeals([]);
    }
  }, [selectedDate, logsStorageKey, todayStr]);

  const handleLoggedMealsChange = (nextMeals: any[]) => {
    setLoggedMeals(nextMeals);
    try {
      localStorage.setItem(logsStorageKey, JSON.stringify(nextMeals));
    } catch (e) {
      console.error(e);
    }
  };

  // Dynamic Totals Calculation from Logged Items
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

  // Determine current day of week (1 = Mon ... 7 = Sun)
  const currentDayOfWeekNumber = useMemo(() => {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 7 : jsDay;
  }, []);

  // 7-day workout schedule snapshot
  const daysList = [
    { dayNumber: 1, name: "Mon", title: "Cardio & Core", status: "Completed" },
    { dayNumber: 2, name: "Tue", title: "Upper Body Hypertrophy", status: "Completed" },
    { dayNumber: 3, name: "Wed", title: "Active Recovery & Mobility", status: "Rest Day" },
    { dayNumber: 4, name: "Thu", title: "Lower Body & Glutes", status: "Scheduled" },
    { dayNumber: 5, name: "Fri", title: "HIIT Conditioning", status: "Scheduled" },
    { dayNumber: 6, name: "Sat", title: "Zone 2 Steady Endurance", status: "Scheduled" },
    { dayNumber: 7, name: "Sun", title: "Full Rest & Recovery", status: "Rest Day" },
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
    <PatientPortalPage>
      {/* Executive Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-500/15 text-lime-700 shadow-sm">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-['Manrope']">
                Diet & Fitness
              </h1>
              <span className="rounded-full border border-lime-200 bg-lime-50 px-2.5 py-0.5 text-[10px] font-bold text-lime-800 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-lime-600" /> Integrated Health
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
              Clinical nutrition targets, macro logging, and 7-day personalized workout schedule
            </p>
          </div>
        </div>

        {/* Quick Action Pills */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTabChange("meals")}
            className={`h-9 rounded-2xl text-xs gap-1.5 shadow-sm ${portalSecondaryButtonClass}`}
          >
            <Plus className="h-3.5 w-3.5 text-lime-700" />
            Log Meal
          </Button>
        </div>
      </div>

      {/* Synchronized Date Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl p-3 border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevDay}
            className="h-8 rounded-xl px-2.5 text-xs gap-1 text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" /> Prev Day
          </Button>

          <div className="relative flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 hover:border-lime-400 transition-colors">
            <Calendar className="h-4 w-4 text-lime-600" />
            <span>{formattedDateTitle}</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextDay}
            className="h-8 rounded-xl px-2.5 text-xs gap-1 text-slate-700 hover:bg-slate-50"
          >
            Next Day <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {selectedDate !== todayStr && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedDate(todayStr)}
            className="h-8 rounded-xl px-3 text-xs font-bold bg-lime-100 text-lime-900 hover:bg-lime-200"
          >
            Jump to Today
          </Button>
        )}
      </div>

      {/* Segmented Horizontal Tab Bar */}
      <div className="overflow-x-auto pb-1 [scrollbar-width:none]">
        <div className="inline-flex min-w-full sm:min-w-0 items-center gap-1.5 rounded-2xl bg-slate-100 p-1.5 text-xs font-semibold text-slate-600 shadow-inner">
          <button
            type="button"
            onClick={() => handleTabChange("overview")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-150 cursor-pointer ${
              activeTab === "overview"
                ? "bg-[#84cc16] text-slate-950 shadow-md shadow-lime-500/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("meals")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-150 cursor-pointer ${
              activeTab === "meals"
                ? "bg-[#84cc16] text-slate-950 shadow-md shadow-lime-500/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Utensils className="h-4 w-4" />
            <span>Meal Plan</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("exercise")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-150 cursor-pointer ${
              activeTab === "exercise"
                ? "bg-[#84cc16] text-slate-950 shadow-md shadow-lime-500/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Dumbbell className="h-4 w-4" />
            <span>Exercise Plan</span>
          </button>
        </div>
      </div>

      {/* Tab 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Greeting Header */}
          <div className="rounded-[24px] bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 sm:p-6 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-['Manrope'] text-white">
                  Hello, {profile?.full_name || "Patient"}!
                </h2>
                <span className="flex items-center gap-1.5 rounded-full border border-lime-400/40 bg-lime-500/20 px-2.5 py-0.5 text-[11px] font-bold text-lime-300 backdrop-blur-xs">
                  <span className="h-2 w-2 rounded-full bg-lime-400 animate-pulse" />
                  Zebra Synapse Active
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                Integrated dietary targets and 7-day exercise schedule for <strong className="text-lime-300">{formattedDateTitle}</strong>.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-md border border-white/10 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-300">Daily Target</p>
                <p className="text-lg font-extrabold text-lime-400 font-mono">2,100 kcal</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-md border border-white/10 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-300">Active Workout</p>
                <p className="text-lg font-extrabold text-cyan-400 font-mono">Day {currentDayOfWeekNumber} Protocol</p>
              </div>
            </div>
          </div>

          {/* Grid Layout: Calories Intake Card & Meals Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Calories Intake Card */}
            <div className={`lg:col-span-5 ${portalPanelClass} p-5 sm:p-6 space-y-5`}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-500/15 text-lime-700">
                    <Flame className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-['Manrope']">Calories & Macros</h3>
                    <p className="text-[11px] text-slate-500">Daily energy for {formattedDateTitle}</p>
                  </div>
                </div>
                <Badge className="border-lime-200 bg-lime-50 text-lime-800 text-[10px] font-bold">
                  {totals.calories === 0 ? "No Meals Logged" : totals.calories <= targetCal ? "On Track" : "Target Exceeded"}
                </Badge>
              </div>

              {/* Circular Progress Ring & Split */}
              <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
                <div className="relative flex items-center justify-center">
                  <svg className="h-36 w-36 transform -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r="58"
                      stroke="currentColor"
                      strokeWidth="12"
                      className="text-slate-100"
                      fill="transparent"
                    />
                    <circle
                      cx="72"
                      cy="72"
                      r="58"
                      stroke="currentColor"
                      strokeWidth="12"
                      strokeDasharray={364}
                      strokeDashoffset={364 - (364 * caloriesPct) / 100}
                      strokeLinecap="round"
                      className="text-lime-500 transition-all duration-700 ease-out"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black text-slate-900 font-mono">{totals.calories}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      / 2,100 kcal
                    </span>
                  </div>
                </div>

                {/* Eaten / Burned Split */}
                <div className="space-y-3 w-full sm:w-auto">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-lime-500" />
                      <span className="text-xs font-semibold text-slate-700">Calories Eaten</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-900">{totals.calories} kcal</span>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-orange-500" />
                      <span className="text-xs font-semibold text-slate-700">Calories Burned</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-900">420 kcal</span>
                  </div>
                </div>
              </div>

              {/* Macro Bars */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Carbohydrates</span>
                    <span className="font-mono">{totals.carbs}g / {targetCarbs}g ({carbPct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${carbPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Protein</span>
                    <span className="font-mono">{totals.protein}g / {targetProtein}g ({proteinPct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${proteinPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Fats</span>
                    <span className="font-mono">{totals.fat}g / {targetFat}g ({fatPct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full transition-all duration-500" style={{ width: `${fatPct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Meals Timeline Card */}
            <div className={`lg:col-span-7 ${portalPanelClass} p-5 sm:p-6 space-y-4`}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-500/15 text-lime-700">
                    <Utensils className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-['Manrope']">Meals Timeline ({formattedDateTitle})</h3>
                    <p className="text-[11px] text-slate-500">{loggedMeals.length} items logged</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleTabChange("meals")}
                  className={`h-8 px-3 rounded-xl text-xs gap-1 ${portalPrimaryButtonClass}`}
                >
                  <Plus className="h-3.5 w-3.5" /> Add Meal
                </Button>
              </div>

              {loggedMeals.length > 0 ? (
                <div className="space-y-3">
                  {loggedMeals.map((meal, idx) => (
                    <div
                      key={meal.id || idx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 hover:bg-lime-50/40 hover:border-lime-200 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 text-lime-700 font-bold shadow-xs uppercase text-[10px]">
                          <Apple className="h-5 w-5 text-lime-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                              {meal.meal || "Meal"}
                            </span>
                            <Badge className="border-lime-200 bg-lime-50 text-lime-800 text-[9px] px-1.5 py-0 font-semibold">
                              Logged
                            </Badge>
                          </div>
                          <p className="text-xs font-semibold text-slate-700 mt-0.5">{meal.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                        <div className="text-xs font-mono font-bold text-slate-900">
                          {meal.calories} <span className="text-[10px] text-slate-400 font-sans">kcal</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 rounded-lg px-2 py-1">
                          C:{meal.carbs || 0}g P:{meal.protein || 0}g F:{meal.fat || 0}g
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50 space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mx-auto">
                    <Utensils className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">No Meals Logged for {formattedDateTitle}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Calories taken and macro targets are currently at 0.</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleTabChange("meals")}
                    className={`h-9 px-4 rounded-xl text-xs gap-1.5 ${portalPrimaryButtonClass}`}
                  >
                    <Plus className="h-4 w-4" /> Log Meal for {formattedDateTitle}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Weekly Workout Snapshot Card (new) */}
          <div className={`${portalPanelClass} p-5 sm:p-6 space-y-4`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-500/15 text-lime-700">
                  <Dumbbell className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-['Manrope']">Weekly Workout Snapshot</h3>
                  <p className="text-[11px] text-slate-500">7-Day Conditioning Schedule • Click any day to jump to full workout detail</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleTabChange("exercise")}
                className="text-xs text-lime-700 hover:text-lime-800 font-bold gap-1 self-start sm:self-auto"
              >
                View Full 7-Day Plan <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* 7-Day Horizontal Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {daysList.map((day) => {
                const isToday = day.dayNumber === currentDayOfWeekNumber;
                const isSelected = day.dayNumber === selectedExerciseDay;

                return (
                  <button
                    key={day.dayNumber}
                    type="button"
                    onClick={() => handleSelectExerciseDayFromSnapshot(day.dayNumber)}
                    className={`flex flex-col justify-between p-3.5 rounded-2xl border text-left transition-all duration-150 cursor-pointer ${
                      isToday
                        ? "border-lime-500 bg-gradient-to-b from-lime-500 to-lime-600 text-slate-950 shadow-md shadow-lime-500/25 ring-2 ring-lime-400"
                        : isSelected
                        ? "border-lime-300 bg-lime-50 text-slate-900 shadow-sm"
                        : "border-slate-100 bg-slate-50/70 hover:bg-white hover:border-slate-300 text-slate-800"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-extrabold ${isToday ? "text-slate-950" : "text-slate-900"}`}>
                          {day.name}
                        </span>
                        {isToday && (
                          <span className="text-[9px] uppercase tracking-wider font-extrabold bg-slate-950 text-lime-400 px-1.5 py-0.5 rounded-full">
                            Today
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] font-bold mt-1 line-clamp-2 ${isToday ? "text-slate-950" : "text-slate-700"}`}>
                        {day.title}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[10px] font-semibold">
                      <span className={isToday ? "text-slate-950 font-bold" : "text-slate-500"}>
                        {day.status}
                      </span>
                      <ChevronRight className={`h-3.5 w-3.5 ${isToday ? "text-slate-950" : "text-slate-400"}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: MEAL PLAN */}
      {activeTab === "meals" && (
        <div className="animate-in fade-in duration-200">
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
        <div className="animate-in fade-in duration-200">
          <ExercisePlan embedded={true} initialDay={selectedExerciseDay} />
        </div>
      )}
    </PatientPortalPage>
  );
}
