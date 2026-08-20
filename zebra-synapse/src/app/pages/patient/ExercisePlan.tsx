import { useState, useEffect, useMemo } from "react";
import {
  Dumbbell,
  Flame,
  HeartPulse,
  Activity,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  Info,
  ShieldCheck,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  Zap,
  Calendar,
  Layers,
  Settings,
  Check,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "../../../auth/AuthContext";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { useActiveReport } from "../../../hooks/useActiveReport";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
import ReportScopeSelector from "../../components/patient/ReportScopeSelector";
import { PatientPortalPage, portalPanelClass, portalSecondaryButtonClass } from "../../components/patient/PortalTheme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Label } from "../../components/ui/label";
import { formatLabDate } from "../../../lib/labPanels";
import {
  type WeeklyExercisePlan,
  type FitnessLevel,
  type EquipmentAccess,
  type PrimaryGoal,
  type DayWorkout,
  type ExerciseProfileInput,
  generateAIExercisePlan,
  generateDeterministicExercisePlan,
} from "../../../lib/exercisePlan";
import { toast } from "sonner";

export interface ExercisePlanProps {
  embedded?: boolean;
  initialDay?: number;
}

export default function ExercisePlan({ embedded = false, initialDay }: ExercisePlanProps = {}) {
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

  // Selected day tab (1 to 7)
  const [selectedDay, setSelectedDay] = useState<number>(initialDay || 1);

  useEffect(() => {
    if (initialDay && initialDay >= 1 && initialDay <= 7) {
      setSelectedDay(initialDay);
    }
  }, [initialDay]);

  // Customization dialog state
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>("beginner");
  const [equipment, setEquipment] = useState<EquipmentAccess>("home_minimal");
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>("general_health");
  const [durationMin, setDurationMin] = useState<number>(30);

  // Calculate BMI
  const heightCm = profile?.height_cm;
  const weightKg = profile?.weight_kg;

  // Instant plan calculation (0ms wait time)
  const [plan, setPlan] = useState<WeeklyExercisePlan | null>(() => {
    try {
      const cacheKey = `zebra_ex_plan_${activePanel?.id || "default"}_${fitnessLevel}_${equipment}_${primaryGoal}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return generateDeterministicExercisePlan(activePanel, biomarkerTrends, {
      fitnessLevel,
      equipment,
      goal: primaryGoal,
      targetDurationMin: durationMin,
      heightCm,
      weightKg,
      age: 38,
    });
  });

  const [isGenerating, setIsGenerating] = useState(false);

  // Active selected day (1 to 7)
  const [selectedDayNum, setSelectedDayNum] = useState<number>(1);

  // Completed items tracking (persisted to localStorage)
  const storageKey = `zebra_exercise_completed_${profile?.id || "default"}`;
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const calculatedBmi = useMemo(() => {
    if (heightCm && weightKg && heightCm > 0) {
      return Number((weightKg / Math.pow(heightCm / 100, 2)).toFixed(1));
    }
    return null;
  }, [heightCm, weightKg]);

  // Instant local load + non-blocking background AI enhancement
  useEffect(() => {
    let cancelled = false;

    const profileInput: ExerciseProfileInput = {
      fitnessLevel,
      equipment,
      goal: primaryGoal,
      targetDurationMin: durationMin,
      heightCm: heightCm ?? null,
      weightKg: weightKg ?? null,
      dietaryConditions: profile?.dietary_conditions,
      age: 38,
      systolicBp: activePanel?.biomarkers?.["systolic_bp"] ?? activePanel?.biomarkers?.["systolic"] ?? null,
      diastolicBp: activePanel?.biomarkers?.["diastolic_bp"] ?? activePanel?.biomarkers?.["diastolic"] ?? null,
      heartRate: (profile as any)?.heart_rate ?? null,
    } as any;

    const cacheKey = `zebra_ex_plan_${activePanel?.id || "default"}_${fitnessLevel}_${equipment}_${primaryGoal}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        setPlan(JSON.parse(cached));
      } catch {
        setPlan(generateDeterministicExercisePlan(activePanel, biomarkerTrends, profileInput));
      }
    } else {
      setPlan(generateDeterministicExercisePlan(activePanel, biomarkerTrends, profileInput));
    }

    // Non-blocking async background enhancement
    void generateAIExercisePlan(activePanel, biomarkerTrends, profileInput)
      .then((generated) => {
        if (!cancelled && generated) {
          setPlan(generated);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(generated));
          } catch {
            // ignore
          }
        }
      })
      .catch((err) => {
        console.warn("Background AI exercise plan enhancement skipped:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [activePanel, panels.length, fitnessLevel, equipment, primaryGoal, durationMin, heightCm, weightKg]);

  // Persist completed items
  const toggleItemCompletion = (id: string) => {
    setCompletedItems((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleResetProgress = () => {
    setCompletedItems({});
    try {
      localStorage.removeItem(storageKey);
      toast.success("Workout progress reset for the week");
    } catch {
      // ignore
    }
  };

  const currentDayWorkout: DayWorkout | undefined = useMemo(() => {
    return plan?.days.find((d) => d.dayNumber === selectedDayNum) || plan?.days[0];
  }, [plan, selectedDayNum]);

  // Compute completed count and weekly percentage
  const weeklyStats = useMemo(() => {
    if (!plan) return { totalExercises: 0, completedCount: 0, percent: 0, completedDays: 0 };
    let totalEx = 0;
    let completedEx = 0;
    let completedDays = 0;

    plan.days.forEach((day) => {
      const dayExerciseIds = [
        ...day.warmup.map((e) => e.id),
        ...day.mainWorkout.map((e) => e.id),
        ...day.cooldown.map((e) => e.id),
      ];
      if (day.restDay) {
        // Rest day counts if checked or marked
        if (completedItems[`day_rest_${day.dayNumber}`]) {
          completedDays += 1;
        }
      } else if (dayExerciseIds.length > 0) {
        totalEx += dayExerciseIds.length;
        const dayDone = dayExerciseIds.filter((id) => completedItems[id]).length;
        completedEx += dayDone;
        if (dayDone === dayExerciseIds.length) {
          completedDays += 1;
        }
      }
    });

    const percent = totalEx > 0 ? Math.round((completedEx / totalEx) * 100) : 0;
    return { totalExercises: totalEx, completedCount: completedEx, percent, completedDays };
  }, [plan, completedItems]);

  const PageWrapper = embedded ? "div" : PatientPortalPage;

  if ((reportsLoading || panelsLoading) && !plan) {
    return (
      <PageWrapper className={embedded ? "p-4" : undefined}>
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw className="h-5 w-5 animate-spin text-lime-500" />
          <span className="text-sm font-medium">Loading your exercise intelligence...</span>
        </div>
      </PageWrapper>
    );
  }

  if (!hasLabReports) {
    return (
      <LabReportsRequiredPlaceholder
        title="7-Day AI Exercise Plan"
        description="Evidence-based weekly workouts tailored to your lab biomarkers and BMI"
      />
    );
  }

  return (
    <PageWrapper className={embedded ? "space-y-6" : undefined}>
      {/* Executive Header Bar */}
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-500/15 text-lime-700 shadow-sm">
              <Dumbbell className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-['Manrope']">7-Day Exercise Plan</h1>
                <span className="rounded-full border border-lime-200 bg-lime-50 px-2.5 py-0.5 text-[10px] font-bold text-lime-800 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-lime-600" /> AI Prescription
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
                {isAllReports
                  ? `Evidence-based physical conditioning tailored to your longitudinal lab profile (${panels.length} reports) and biometric vitals.`
                  : `Conditioning protocol calibrated for report dated ${activePanel ? formatLabDate(activePanel.recorded_at) : "selected panel"}.`}
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCustomizeOpen(true)}
              className={`h-9 rounded-2xl text-xs gap-1.5 shadow-sm ${portalSecondaryButtonClass}`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-lime-700" />
              Customize Plan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetProgress}
              className="h-9 border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-2xl text-xs gap-1 shadow-sm"
              title="Reset weekly completed checkboxes"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Week
            </Button>
          </div>
        </div>
      )}

      {/* Lab Report Scope Selector */}
      {hasPanels && panels.length > 1 && (
        <ReportScopeSelector
          panels={panels}
          selectedReportId={selectedReportId}
          onSelectReportId={setSelectedReportId}
          multiPanelMeta={multiPanelMeta}
          biomarkerTrends={biomarkerTrends}
        />
      )}

      {/* 7-Day Interactive Day Selector Tabs */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Calendar className="h-4 w-4 text-lime-600" /> 7-Day Weekly Schedule
          </h2>
          <span className="text-xs text-slate-400">
            Click a day to view daily workout circuits
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {plan?.days.map((day) => {
            const isSelected = day.dayNumber === selectedDayNum;
            const dayExIds = [
              ...day.warmup.map((e) => e.id),
              ...day.mainWorkout.map((e) => e.id),
              ...day.cooldown.map((e) => e.id),
            ];
            const isDayFinished = day.restDay
              ? Boolean(completedItems[`day_rest_${day.dayNumber}`])
              : dayExIds.length > 0 && dayExIds.every((id) => completedItems[id]);

            return (
              <button
                key={day.dayNumber}
                onClick={() => setSelectedDayNum(day.dayNumber)}
                className={`p-3 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between relative overflow-hidden cursor-pointer shadow-sm ${
                  isSelected
                    ? "bg-lime-500 border-lime-400 text-slate-950 font-bold"
                    : isDayFinished
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                }`}
              >
                {/* Status Indicator */}
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-mono font-bold tracking-wider uppercase">
                    {day.dayName.slice(0, 3)}
                  </span>
                  {isDayFinished ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : day.restDay ? (
                    <span className="text-[9px] px-1 rounded bg-slate-100 text-slate-500 font-mono">Rest</span>
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-slate-300" />
                  )}
                </div>

                <div className="mt-2.5">
                  <div className={`text-xs font-bold line-clamp-1 ${isSelected ? "text-slate-950" : "text-slate-800"}`}>
                    {day.focus}
                  </div>
                  <div className={`flex items-center gap-1.5 mt-1 text-[10px] font-mono ${isSelected ? "text-slate-800" : "text-slate-400"}`}>
                    <Clock className="h-2.5 w-2.5" />
                    <span>{day.estimatedDurationMin} min</span>
                    <span>•</span>
                    <span>{day.estimatedCalories} kcal</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Workout Routine */}
      {currentDayWorkout && (
        <div className="space-y-6">
          {/* Day Detail Header */}
          <div className={`${portalPanelClass} p-5 relative overflow-hidden`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs font-bold border-lime-200 text-lime-800 bg-lime-50">
                    Day {currentDayWorkout.dayNumber} • {currentDayWorkout.dayName}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs font-bold ${
                      currentDayWorkout.restDay
                        ? "border-purple-200 text-purple-800 bg-purple-50"
                        : "border-emerald-200 text-emerald-800 bg-emerald-50"
                    }`}
                  >
                    {currentDayWorkout.intensity}
                  </Badge>
                  <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                    <Flame className="h-3.5 w-3.5 text-amber-500" /> ~{currentDayWorkout.estimatedCalories} kcal
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                    <Clock className="h-3.5 w-3.5 text-lime-600" /> {currentDayWorkout.estimatedDurationMin} mins
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-2 font-['Manrope']">
                  {currentDayWorkout.focus}
                </h2>
                {currentDayWorkout.targetHeartRateBpm && (
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <HeartPulse className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                    Target Exertion Zone: <span className="font-mono font-bold text-slate-800">{currentDayWorkout.targetHeartRateBpm}</span>
                  </p>
                )}
              </div>

              {/* Day Quick Action / Completion Toggle */}
              {currentDayWorkout.restDay ? (
                <Button
                  variant="outline"
                  onClick={() => toggleItemCompletion(`day_rest_${currentDayWorkout.dayNumber}`)}
                  className={`h-9 text-xs rounded-2xl border ${
                    completedItems[`day_rest_${currentDayWorkout.dayNumber}`]
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 font-bold"
                      : "border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100"
                  }`}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {completedItems[`day_rest_${currentDayWorkout.dayNumber}`] ? "Recovery Day Logged" : "Mark Recovery Complete"}
                </Button>
              ) : null}
            </div>

            {currentDayWorkout.recoveryTip && (
              <div className="mt-4 p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-900 leading-relaxed flex items-start gap-2">
                <Info className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-purple-950 font-bold">Physiological Recovery Rationale: </strong>
                  {currentDayWorkout.recoveryTip}
                </div>
              </div>
            )}
          </div>

          {/* Warmup Section */}
          {currentDayWorkout.warmup && currentDayWorkout.warmup.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2">
                  <Flame className="h-3.5 w-3.5 text-amber-500" /> Phase 1: Dynamic Warm-Up & Joint Activation (~5 mins)
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {currentDayWorkout.warmup.map((ex) => (
                  <ExerciseRow
                    key={ex.id}
                    exercise={ex}
                    isCompleted={Boolean(completedItems[ex.id])}
                    onToggle={() => toggleItemCompletion(ex.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Main Workout Circuit Section */}
          {currentDayWorkout.mainWorkout && currentDayWorkout.mainWorkout.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-lime-900 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-lime-600" /> Phase 2: Main Conditioning & Strength Routine
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {currentDayWorkout.mainWorkout.map((ex) => (
                  <ExerciseRow
                    key={ex.id}
                    exercise={ex}
                    isCompleted={Boolean(completedItems[ex.id])}
                    onToggle={() => toggleItemCompletion(ex.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Cooldown Section */}
          {currentDayWorkout.cooldown && currentDayWorkout.cooldown.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-emerald-600" /> Phase 3: Cool-Down, Mobility & Breathwork (~5 mins)
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {currentDayWorkout.cooldown.map((ex) => (
                  <ExerciseRow
                    key={ex.id}
                    exercise={ex}
                    isCompleted={Boolean(completedItems[ex.id])}
                    onToggle={() => toggleItemCompletion(ex.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Customize & Regenerate Modal */}
      <Dialog open={isCustomizeOpen} onOpenChange={setIsCustomizeOpen}>
        <DialogContent className="sm:max-w-md bg-white border-slate-100 text-slate-800 rounded-[24px] shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-lime-600" /> Customize Exercise Prescription
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Adjust your training parameters. The AI will recalculate the weekly routine while strictly adhering to your lab safety guidelines.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Fitness Level */}
            <div>
              <Label className="text-xs text-slate-700 font-semibold uppercase tracking-wider">Fitness Experience Level</Label>
              <Select value={fitnessLevel} onValueChange={(v: FitnessLevel) => setFitnessLevel(v)}>
                <SelectTrigger className="mt-1.5 bg-slate-50 border-slate-200 text-xs rounded-xl">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-800">
                  <SelectItem value="beginner" className="text-xs">Beginner (Gentle pacing, form foundation)</SelectItem>
                  <SelectItem value="intermediate" className="text-xs">Intermediate (Progressive overload)</SelectItem>
                  <SelectItem value="advanced" className="text-xs">Advanced (Higher volume & intensity)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Equipment Access */}
            <div>
              <Label className="text-xs text-slate-700 font-semibold uppercase tracking-wider">Available Workout Environment</Label>
              <Select value={equipment} onValueChange={(v: EquipmentAccess) => setEquipment(v)}>
                <SelectTrigger className="mt-1.5 bg-slate-50 border-slate-200 text-xs rounded-xl">
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-800">
                  <SelectItem value="home_minimal" className="text-xs">Home Fitness (Dumbbells / Resistance Bands / Bodyweight)</SelectItem>
                  <SelectItem value="bodyweight" className="text-xs">Bodyweight Only (No equipment needed)</SelectItem>
                  <SelectItem value="gym" className="text-xs">Full Gym Access (Barbells, Cables, Cardio Machines)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Primary Goal */}
            <div>
              <Label className="text-xs text-slate-700 font-semibold uppercase tracking-wider">Primary Conditioning Goal</Label>
              <Select value={primaryGoal} onValueChange={(v: PrimaryGoal) => setPrimaryGoal(v)}>
                <SelectTrigger className="mt-1.5 bg-slate-50 border-slate-200 text-xs rounded-xl">
                  <SelectValue placeholder="Select goal" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-800">
                  <SelectItem value="general_health" className="text-xs">Cardiometabolic & General Health</SelectItem>
                  <SelectItem value="weight_loss" className="text-xs">Fat Oxidation & Weight Management</SelectItem>
                  <SelectItem value="cardio_endurance" className="text-xs">Cardiovascular Stamina & Endurance</SelectItem>
                  <SelectItem value="muscle_strength" className="text-xs">Muscle Tone & Functional Strength</SelectItem>
                  <SelectItem value="mobility_longevity" className="text-xs">Joint Mobility & Active Longevity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Session Duration */}
            <div>
              <Label className="text-xs text-slate-700 font-semibold uppercase tracking-wider">Daily Target Workout Duration</Label>
              <Select value={durationMin.toString()} onValueChange={(v) => setDurationMin(Number(v))}>
                <SelectTrigger className="mt-1.5 bg-slate-50 border-slate-200 text-xs rounded-xl">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-800">
                  <SelectItem value="15" className="text-xs">15 Minutes (Express)</SelectItem>
                  <SelectItem value="30" className="text-xs">30 Minutes (Recommended)</SelectItem>
                  <SelectItem value="45" className="text-xs">45 Minutes (Standard)</SelectItem>
                  <SelectItem value="60" className="text-xs">60 Minutes (Comprehensive)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCustomizeOpen(false)}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setIsCustomizeOpen(false);
                toast.success("Regenerating tailored exercise plan...");
              }}
              className="bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold text-xs rounded-2xl"
            >
              Apply & Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}

// Individual exercise row item
function ExerciseRow({
  exercise,
  isCompleted,
  onToggle,
}: {
  exercise: any;
  isCompleted: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start gap-3.5 group shadow-sm ${
        isCompleted
          ? "bg-emerald-50/60 border-emerald-200 opacity-80"
          : "bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/80 text-slate-800"
      }`}
    >
      <div className="mt-0.5 shrink-0">
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        ) : (
          <Circle className="h-5 w-5 text-slate-300 group-hover:text-lime-600 transition-colors" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className={`text-sm font-bold tracking-tight ${
                isCompleted ? "line-through text-slate-400" : "text-slate-900"
              }`}
            >
              {exercise.name}
            </h4>
            {exercise.intensity && (
              <span
                className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                  exercise.intensity === "high"
                    ? "bg-rose-50 text-rose-800 border border-rose-200"
                    : exercise.intensity === "moderate"
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "bg-lime-50 text-lime-800 border border-lime-200"
                }`}
              >
                {exercise.intensity.toUpperCase()}
              </span>
            )}
          </div>

          {/* Volume stats (Sets, Reps, Rest) */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 shrink-0">
            {exercise.sets && exercise.reps && (
              <span className="text-lime-800 font-bold">
                {exercise.sets} sets × {exercise.reps}
              </span>
            )}
            {exercise.durationMin && (
              <span className="text-emerald-800 font-bold">
                {exercise.durationMin} mins
              </span>
            )}
            {exercise.restSec && (
              <span>• {exercise.restSec}s rest</span>
            )}
          </div>
        </div>

        {/* Target muscles & equipment */}
        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
          <span className="text-slate-700 font-semibold">Target:</span> {exercise.targetMuscles}
          {exercise.equipment && (
            <>
              <span>•</span>
              <span className="text-slate-500">Equip: {exercise.equipment}</span>
            </>
          )}
        </div>

        {/* Exercise instruction cues */}
        <p className="text-xs text-slate-600 mt-2 leading-relaxed font-normal">
          {exercise.instructions}
        </p>

        {/* Safety Note */}
        {exercise.safetyNote && (
          <div className="mt-2 text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>{exercise.safetyNote}</span>
          </div>
        )}
      </div>
    </div>
  );
}
