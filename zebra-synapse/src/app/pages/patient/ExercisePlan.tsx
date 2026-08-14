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
} from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "../../../auth/AuthContext";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { useActiveReport } from "../../../hooks/useActiveReport";
import LabReportsRequiredPlaceholder from "../../components/patient/LabReportsRequiredPlaceholder";
import ReportScopeSelector from "../../components/patient/ReportScopeSelector";
import { PatientPortalPage, portalPanelClass } from "../../components/patient/PortalTheme";
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
} from "../../../lib/exercisePlan";
import { toast } from "sonner";

export default function ExercisePlan() {
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

  // Customization dialog state
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>("beginner");
  const [equipment, setEquipment] = useState<EquipmentAccess>("home_minimal");
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>("general_health");
  const [durationMin, setDurationMin] = useState<number>(30);

  // Plan generation state
  const [plan, setPlan] = useState<WeeklyExercisePlan | null>(null);
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

  // Calculate BMI
  const heightCm = profile?.height_cm;
  const weightKg = profile?.weight_kg;
  const calculatedBmi = useMemo(() => {
    if (heightCm && weightKg && heightCm > 0) {
      return Number((weightKg / Math.pow(heightCm / 100, 2)).toFixed(1));
    }
    return null;
  }, [heightCm, weightKg]);

  // Generate or load plan whenever activePanel / profile changes
  useEffect(() => {
    let cancelled = false;

    async function loadPlan() {
      if (!activePanel && panels.length === 0) return;
      setIsGenerating(true);

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

      try {
        const generated = await generateAIExercisePlan(activePanel, biomarkerTrends, profileInput);
        if (!cancelled) {
          setPlan(generated);
        }
      } catch (err) {
        console.error("Failed to generate exercise plan", err);
      } finally {
        if (!cancelled) {
          setIsGenerating(false);
        }
      }
    }

    loadPlan();

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

  if (reportsLoading || panelsLoading) {
    return (
      <PatientPortalPage>
        <p className="text-sm text-[#A1A1AA]">Loading your exercise intelligence...</p>
      </PatientPortalPage>
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
    <PatientPortalPage>
      {/* Executive Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/25 to-blue-600/15 border border-cyan-400/35 shadow-[0_12px_28px_rgba(6,182,212,0.2)]">
            <Dumbbell className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">7-Day Exercise Plan</h1>
              <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-cyan-400" /> AI Prescription
              </span>
            </div>
            <p className="text-sm sm:text-base text-[#b4c9e8] mt-1 font-medium leading-relaxed">
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
            className="h-9 border-white/15 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] hover:text-white rounded-xl text-xs gap-1.5 shadow-sm"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-400" />
            Customize Plan
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetProgress}
            className="h-9 border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 rounded-xl text-xs gap-1"
            title="Reset weekly completed checkboxes"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Week
          </Button>
        </div>
      </div>

      {/* Lab Report Scope Selector */}
      {hasPanels && (
        <div className="mb-6">
          <ReportScopeSelector
            panels={panels}
            selectedReportId={selectedReportId}
            onSelectReportId={setSelectedReportId}
            multiPanelMeta={multiPanelMeta}
            biomarkerTrends={biomarkerTrends}
          />
        </div>
      )}

      {/* 7-Day Interactive Day Selector Tabs */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Calendar className="h-4 w-4 text-cyan-400" /> 7-Day Weekly Schedule
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
                className={`p-3 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between relative overflow-hidden ${
                  isSelected
                    ? "bg-gradient-to-b from-cyan-500/20 to-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)] text-white"
                    : isDayFinished
                    ? "bg-emerald-950/20 border-emerald-500/40 text-slate-300 hover:border-emerald-500/60"
                    : "bg-[#0f1422]/80 border-slate-800 hover:border-slate-700 text-slate-400"
                }`}
              >
                {/* Status Indicator */}
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-mono font-bold tracking-wider uppercase">
                    {day.dayName.slice(0, 3)}
                  </span>
                  {isDayFinished ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : day.restDay ? (
                    <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400 font-mono">Rest</span>
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-slate-600" />
                  )}
                </div>

                <div className="mt-2.5">
                  <div className={`text-xs font-semibold line-clamp-1 ${isSelected ? "text-cyan-200" : "text-slate-200"}`}>
                    {day.focus}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-mono">
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
                  <Badge variant="outline" className="text-xs font-mono border-cyan-400/30 text-cyan-300 bg-cyan-400/10">
                    Day {currentDayWorkout.dayNumber} • {currentDayWorkout.dayName}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      currentDayWorkout.restDay
                        ? "border-purple-500/30 text-purple-300 bg-purple-500/10"
                        : "border-emerald-500/30 text-emerald-300 bg-emerald-500/10"
                    }`}
                  >
                    {currentDayWorkout.intensity}
                  </Badge>
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                    <Flame className="h-3.5 w-3.5 text-amber-400" /> ~{currentDayWorkout.estimatedCalories} kcal
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="h-3.5 w-3.5 text-cyan-400" /> {currentDayWorkout.estimatedDurationMin} mins
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white mt-2">
                  {currentDayWorkout.focus}
                </h2>
                {currentDayWorkout.targetHeartRateBpm && (
                  <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                    <HeartPulse className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                    Target Exertion Zone: <span className="font-mono text-cyan-300">{currentDayWorkout.targetHeartRateBpm}</span>
                  </p>
                )}
              </div>

              {/* Day Quick Action / Completion Toggle */}
              {currentDayWorkout.restDay ? (
                <Button
                  variant="outline"
                  onClick={() => toggleItemCompletion(`day_rest_${currentDayWorkout.dayNumber}`)}
                  className={`h-9 text-xs rounded-xl border ${
                    completedItems[`day_rest_${currentDayWorkout.dayNumber}`]
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                      : "border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
                  }`}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {completedItems[`day_rest_${currentDayWorkout.dayNumber}`] ? "Recovery Day Logged" : "Mark Recovery Complete"}
                </Button>
              ) : null}
            </div>

            {currentDayWorkout.recoveryTip && (
              <div className="mt-4 p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs text-purple-200/90 leading-relaxed flex items-start gap-2">
                <Info className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-purple-300 font-semibold">Physiological Recovery Rationale: </strong>
                  {currentDayWorkout.recoveryTip}
                </div>
              </div>
            )}
          </div>

          {/* Warmup Section */}
          {currentDayWorkout.warmup && currentDayWorkout.warmup.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <Flame className="h-3.5 w-3.5" /> Phase 1: Dynamic Warm-Up & Joint Activation (~5 mins)
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
                <h3 className="text-xs font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5" /> Phase 2: Main Conditioning & Strength Routine
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
                <h3 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5" /> Phase 3: Cool-Down, Mobility & Breathwork (~5 mins)
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
        <DialogContent className="sm:max-w-md bg-[#0c101a] border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-cyan-400" /> Customize Exercise Prescription
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Adjust your training parameters. The AI will recalculate the weekly routine while strictly adhering to your lab safety guidelines.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Fitness Level */}
            <div>
              <Label className="text-xs text-slate-300 font-medium">Fitness Experience Level</Label>
              <Select value={fitnessLevel} onValueChange={(v: FitnessLevel) => setFitnessLevel(v)}>
                <SelectTrigger className="mt-1.5 bg-slate-900 border-slate-800 text-xs">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1422] border-slate-800 text-slate-200">
                  <SelectItem value="beginner" className="text-xs">Beginner (Gentle pacing, form foundation)</SelectItem>
                  <SelectItem value="intermediate" className="text-xs">Intermediate (Progressive overload)</SelectItem>
                  <SelectItem value="advanced" className="text-xs">Advanced (Higher volume & intensity)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Equipment Access */}
            <div>
              <Label className="text-xs text-slate-300 font-medium">Available Workout Environment</Label>
              <Select value={equipment} onValueChange={(v: EquipmentAccess) => setEquipment(v)}>
                <SelectTrigger className="mt-1.5 bg-slate-900 border-slate-800 text-xs">
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1422] border-slate-800 text-slate-200">
                  <SelectItem value="home_minimal" className="text-xs">Home Fitness (Dumbbells / Resistance Bands / Bodyweight)</SelectItem>
                  <SelectItem value="bodyweight" className="text-xs">Bodyweight Only (No equipment needed)</SelectItem>
                  <SelectItem value="gym" className="text-xs">Full Gym Access (Barbells, Cables, Cardio Machines)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Primary Goal */}
            <div>
              <Label className="text-xs text-slate-300 font-medium">Primary Conditioning Goal</Label>
              <Select value={primaryGoal} onValueChange={(v: PrimaryGoal) => setPrimaryGoal(v)}>
                <SelectTrigger className="mt-1.5 bg-slate-900 border-slate-800 text-xs">
                  <SelectValue placeholder="Select goal" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1422] border-slate-800 text-slate-200">
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
              <Label className="text-xs text-slate-300 font-medium">Daily Target Workout Duration</Label>
              <Select value={durationMin.toString()} onValueChange={(v) => setDurationMin(Number(v))}>
                <SelectTrigger className="mt-1.5 bg-slate-900 border-slate-800 text-xs">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1422] border-slate-800 text-slate-200">
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
              className="border-white/10 text-slate-300 hover:bg-white/5 text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setIsCustomizeOpen(false);
                toast.success("Regenerating tailored exercise plan...");
              }}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs rounded-xl"
            >
              Apply & Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PatientPortalPage>
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
      className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start gap-3.5 group ${
        isCompleted
          ? "bg-emerald-950/20 border-emerald-500/30 opacity-75"
          : "bg-[#0f1422]/90 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90"
      }`}
    >
      <div className="mt-0.5 shrink-0">
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        ) : (
          <Circle className="h-5 w-5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className={`text-sm font-semibold tracking-tight ${
                isCompleted ? "line-through text-slate-400" : "text-white"
              }`}
            >
              {exercise.name}
            </h4>
            {exercise.intensity && (
              <span
                className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-medium ${
                  exercise.intensity === "high"
                    ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                    : exercise.intensity === "moderate"
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    : "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                }`}
              >
                {exercise.intensity.toUpperCase()}
              </span>
            )}
          </div>

          {/* Volume stats (Sets, Reps, Rest) */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 shrink-0">
            {exercise.sets && exercise.reps && (
              <span className="text-cyan-300 font-semibold">
                {exercise.sets} sets × {exercise.reps}
              </span>
            )}
            {exercise.durationMin && (
              <span className="text-emerald-300 font-semibold">
                {exercise.durationMin} mins
              </span>
            )}
            {exercise.restSec && (
              <span>• {exercise.restSec}s rest</span>
            )}
          </div>
        </div>

        {/* Target muscles & equipment */}
        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
          <span className="text-slate-300 font-medium">Target:</span> {exercise.targetMuscles}
          {exercise.equipment && (
            <>
              <span>•</span>
              <span className="text-slate-400">Equip: {exercise.equipment}</span>
            </>
          )}
        </div>

        {/* Exercise instruction cues */}
        <p className="text-xs text-slate-300/90 mt-2 leading-relaxed">
          {exercise.instructions}
        </p>

        {/* Safety Note */}
        {exercise.safetyNote && (
          <div className="mt-2 text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>{exercise.safetyNote}</span>
          </div>
        )}
      </div>
    </div>
  );
}
