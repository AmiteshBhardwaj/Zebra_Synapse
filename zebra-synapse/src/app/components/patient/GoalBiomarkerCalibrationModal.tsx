import React, { useState, useMemo, useEffect } from "react";
import {
  Scale,
  Flame,
  Activity,
  HeartPulse,
  Sparkles,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Calendar,
  Check,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  type HealthGoal,
  type ActivityLevel,
  type DietUserSettings,
  HEALTH_GOALS,
  ACTIVITY_MULTIPLIERS,
  calculateBMR,
  calculateTDEE,
  calculateCalorieTarget,
  calculateMacroTargets,
  evaluateBiomarkerDietImpacts,
} from "../../../lib/dietEngine";
import type { LabPanelRow } from "../../../lib/labPanels";

interface GoalBiomarkerCalibrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: DietUserSettings;
  activePanel: LabPanelRow | null;
  onSave: (newSettings: DietUserSettings) => void;
}

export default function GoalBiomarkerCalibrationModal({
  open,
  onOpenChange,
  settings,
  activePanel,
  onSave,
}: GoalBiomarkerCalibrationModalProps) {
  const [currentWeight, setCurrentWeight] = useState<number | string>(
    settings.currentWeightKg || 66
  );
  const [targetWeight, setTargetWeight] = useState<number | string>(
    settings.targetWeightKg || settings.currentWeightKg || 66
  );
  const [heightCm, setHeightCm] = useState<number | string>(settings.heightCm || 178);
  const [age, setAge] = useState<number | string>(settings.age || 20);
  const [gender, setGender] = useState<"male" | "female">(
    (settings.gender?.toLowerCase() === "female" ? "female" : "male")
  );
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    settings.activityLevel || "moderate"
  );
  const [goal, setGoal] = useState<HealthGoal>(settings.goal || "fat_loss");
  const [weeklyPace, setWeeklyPace] = useState<number>(
    settings.weeklyPaceKg !== undefined ? settings.weeklyPaceKg : -0.5
  );
  const [dietaryPref, setDietaryPref] = useState<string>(
    settings.dietaryPreference || "vegetarian"
  );

  // Sync internal state whenever the modal opens or input settings change
  useEffect(() => {
    if (open) {
      let cur = settings.currentWeightKg || 66;
      let tgt = settings.targetWeightKg || settings.currentWeightKg || 66;

      if (settings.currentWeightKg != null && settings.currentWeightKg > 0) {
        setCurrentWeight(settings.currentWeightKg);
        cur = settings.currentWeightKg;
      }
      if (settings.targetWeightKg != null && settings.targetWeightKg > 0) {
        setTargetWeight(settings.targetWeightKg);
        tgt = settings.targetWeightKg;
      } else if (settings.currentWeightKg != null && settings.currentWeightKg > 0) {
        setTargetWeight(settings.currentWeightKg);
        tgt = settings.currentWeightKg;
      }
      if (settings.heightCm != null && settings.heightCm > 0) {
        setHeightCm(settings.heightCm);
      }
      if (settings.age != null && settings.age > 0) {
        setAge(settings.age);
      }
      if (settings.gender) {
        setGender((settings.gender.toLowerCase() === "female" ? "female" : "male") as "male" | "female");
      }
      if (settings.activityLevel) {
        setActivityLevel(settings.activityLevel);
      }

      const diff = tgt - cur;
      let pace = settings.weeklyPaceKg !== undefined ? settings.weeklyPaceKg : (diff > 0.1 ? 0.25 : diff < -0.1 ? -0.5 : 0);
      let g = settings.goal || (diff > 0.1 ? "muscle_gain" : diff < -0.1 ? "fat_loss" : "maintain_longevity");

      // Auto-correct pace direction if discordant with goal weight
      if (diff > 0.1 && pace <= 0) {
        pace = diff >= 6 ? 0.5 : 0.25;
        if (g === "fat_loss" || g === "maintain_longevity") g = "muscle_gain";
      } else if (diff < -0.1 && pace >= 0) {
        pace = Math.abs(diff) >= 6 ? -0.5 : -0.25;
        if (g === "muscle_gain" || g === "maintain_longevity") g = "fat_loss";
      } else if (Math.abs(diff) <= 0.1) {
        pace = 0;
        g = "maintain_longevity";
      }

      setWeeklyPace(pace);
      setGoal(g);

      if (settings.dietaryPreference) {
        setDietaryPref(settings.dietaryPreference);
      }
    }
  }, [open, settings]);

  // Safe numerical parsers for active physics calculations while typing
  const numCurrentWeight = Number(currentWeight) > 0 ? Number(currentWeight) : (settings.currentWeightKg || 66);
  const numTargetWeight = Number(targetWeight) > 0 ? Number(targetWeight) : numCurrentWeight;
  const numHeight = Number(heightCm) > 0 ? Number(heightCm) : (settings.heightCm || 178);
  const numAge = Number(age) > 0 ? Number(age) : (settings.age || 20);

  // Live Metabolic Physics Calculation
  const liveBmr = useMemo(() => {
    return calculateBMR(numCurrentWeight, numHeight, numAge, gender);
  }, [numCurrentWeight, numHeight, numAge, gender]);

  const liveTdee = useMemo(() => {
    return calculateTDEE(liveBmr, activityLevel);
  }, [liveBmr, activityLevel]);

  // Goal weight physics comparison
  const goalBmr = useMemo(() => {
    return calculateBMR(numTargetWeight, numHeight, numAge, gender);
  }, [numTargetWeight, numHeight, numAge, gender]);

  const goalTdee = useMemo(() => {
    return calculateTDEE(goalBmr, activityLevel);
  }, [goalBmr, activityLevel]);

  const liveCalorieTarget = useMemo(() => {
    return calculateCalorieTarget(liveTdee, goal, weeklyPace, numCurrentWeight, numTargetWeight);
  }, [liveTdee, goal, weeklyPace, numCurrentWeight, numTargetWeight]);

  // Live Biomarker Impacts
  const biomarkerImpacts = useMemo(() => {
    return evaluateBiomarkerDietImpacts(activePanel);
  }, [activePanel]);

  // Live Macro Modulations with Biomarker Safeguards
  const liveMacros = useMemo(() => {
    return calculateMacroTargets(
      liveCalorieTarget,
      goal,
      numCurrentWeight,
      undefined,
      activePanel
    );
  }, [liveCalorieTarget, goal, numCurrentWeight, activePanel]);

  // Time to reach goal
  const weightDelta = numTargetWeight - numCurrentWeight; // positive = gain, negative = loss
  const weightDiff = numCurrentWeight - numTargetWeight;
  const estimatedWeeks = useMemo(() => {
    if (weeklyPace === 0 || Math.abs(weightDelta) < 0.1) {
      return null;
    }
    const weeks = Math.abs(weightDelta) / Math.abs(weeklyPace);
    return Math.max(1, Math.round(weeks));
  }, [weightDelta, weeklyPace]);

  // Handlers for interactive weight inputs that automatically update pace & goal
  const handleCurrentWeightChange = (val: string) => {
    setCurrentWeight(val);
    const parsedCurrent = parseFloat(val);
    if (!isNaN(parsedCurrent) && parsedCurrent > 0) {
      const diff = numTargetWeight - parsedCurrent;
      if (diff > 0.1) {
        if (weeklyPace <= 0) setWeeklyPace(diff >= 6 ? 0.5 : 0.25);
        if (goal === "fat_loss" || goal === "maintain_longevity") setGoal("muscle_gain");
      } else if (diff < -0.1) {
        if (weeklyPace >= 0) setWeeklyPace(Math.abs(diff) >= 6 ? -0.5 : -0.25);
        if (goal === "muscle_gain" || goal === "maintain_longevity") setGoal("fat_loss");
      } else {
        setWeeklyPace(0);
        setGoal("maintain_longevity");
      }
    }
  };

  const handleTargetWeightChange = (val: string) => {
    setTargetWeight(val);
    const parsedTarget = parseFloat(val);
    if (!isNaN(parsedTarget) && parsedTarget > 0) {
      const diff = parsedTarget - numCurrentWeight;
      if (diff > 0.1) {
        if (weeklyPace <= 0) setWeeklyPace(diff >= 6 ? 0.5 : 0.25);
        if (goal === "fat_loss" || goal === "maintain_longevity") setGoal("muscle_gain");
      } else if (diff < -0.1) {
        if (weeklyPace >= 0) setWeeklyPace(Math.abs(diff) >= 6 ? -0.5 : -0.25);
        if (goal === "muscle_gain" || goal === "maintain_longevity") setGoal("fat_loss");
      } else {
        setWeeklyPace(0);
        setGoal("maintain_longevity");
      }
    }
  };

  const handleSave = () => {
    const updated: DietUserSettings = {
      ...settings,
      currentWeightKg: numCurrentWeight,
      targetWeightKg: numTargetWeight,
      heightCm: numHeight,
      age: numAge,
      gender,
      activityLevel,
      goal,
      weeklyPaceKg: weeklyPace,
      dietaryPreference: dietaryPref,
      customCalorieTarget: liveCalorieTarget,
    };
    onSave(updated);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl sm:max-w-4xl md:max-w-5xl lg:max-w-5xl max-h-[90vh] flex flex-col gap-0 p-0 border border-emerald-500/20 bg-slate-950 text-slate-100 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header with gradient badge (Pinned at top) */}
        <div className="relative px-6 py-3.5 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-cyan-950/40 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Scale className="w-4.5 h-4.5" />
            </div>
            <div className="pr-8">
              <DialogTitle className="text-lg font-bold tracking-tight text-white flex items-center gap-2 flex-wrap">
                Metabolic Goal & Biomarker Calibration
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[11px] font-semibold px-2 py-0.5">
                  Two-Tier Synthesis
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                Calibrates energy physics (Current Weight → Goal Weight) and reconciles active lab blood biomarkers into personalized nutritional and workout constraints.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 [scrollbar-width:thin] [scrollbar-color:rgba(51,65,85,0.4)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-700/40 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          {/* Main Grid: Inputs on left, Live Dual-Driver Preview on right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4.5 items-start">
            {/* LEFT COLUMN: Input Parameters */}
            <div className="lg:col-span-7 space-y-4">
              <div className="space-y-3.5 bg-slate-900/60 p-4 rounded-xl border border-white/5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    Physical Baseline & Goal Weight
                  </h3>
                  {weightDiff !== 0 && (
                    <span className="text-xs text-slate-400">
                      Delta:{" "}
                      <strong className={weightDiff > 0 ? "text-emerald-400" : "text-amber-400"}>
                        {weightDiff > 0 ? `-${weightDiff.toFixed(1)} kg` : `+${Math.abs(weightDiff).toFixed(1)} kg`}
                      </strong>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <Label className="text-xs text-slate-300 font-medium">Current Weight (kg)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="30"
                      max="250"
                      value={currentWeight}
                      onChange={(e) => handleCurrentWeightChange(e.target.value)}
                      onBlur={() => {
                        if (currentWeight === "" || Number(currentWeight) <= 0) {
                          handleCurrentWeightChange(String(settings.currentWeightKg || 66));
                        }
                      }}
                      className="mt-1 bg-slate-950 border-white/10 text-white font-medium h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300 font-medium flex items-center justify-between">
                      <span>Target Goal Weight (kg)</span>
                      {weightDelta !== 0 && (
                        <span className={weightDelta > 0 ? "text-emerald-400 text-[11px]" : "text-cyan-400 text-[11px]"}>
                          {weightDelta > 0 ? `+${weightDelta.toFixed(1)} kg Gain` : `${weightDelta.toFixed(1)} kg Loss`}
                        </span>
                      )}
                    </Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="30"
                      max="250"
                      value={targetWeight}
                      onChange={(e) => handleTargetWeightChange(e.target.value)}
                      onBlur={() => {
                        if (targetWeight === "" || Number(targetWeight) <= 0) {
                          handleTargetWeightChange(String(numCurrentWeight));
                        }
                      }}
                      className="mt-1 bg-slate-950 border-emerald-500/40 text-emerald-300 font-semibold h-9 focus-visible:ring-emerald-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-slate-300 font-medium whitespace-nowrap">Height (cm)</Label>
                    <Input
                      type="number"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      onBlur={() => {
                        if (heightCm === "" || Number(heightCm) <= 0) {
                          setHeightCm(settings.heightCm || 178);
                        }
                      }}
                      className="mt-1 bg-slate-950 border-white/10 text-white h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300 font-medium whitespace-nowrap">Age</Label>
                    <Input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      onBlur={() => {
                        if (age === "" || Number(age) <= 0) {
                          setAge(settings.age || 20);
                        }
                      }}
                      className="mt-1 bg-slate-950 border-white/10 text-white h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300 font-medium whitespace-nowrap">Biological Sex</Label>
                    <Select value={gender} onValueChange={(val: "male" | "female") => setGender(val)}>
                      <SelectTrigger className="mt-1 bg-slate-950 border-white/10 text-white min-w-0 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 text-white">
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs text-slate-300 font-medium">Weekly Target Pace</Label>
                    <span className="text-xs text-emerald-400 font-semibold">
                      {weeklyPace === 0
                        ? "Weight Maintenance (0 kg/wk)"
                        : weeklyPace > 0
                        ? `+${weeklyPace} kg / week (Surplus)`
                        : `${weeklyPace} kg / week (Deficit)`}
                    </span>
                  </div>
                  <Select
                    value={String(weeklyPace)}
                    onValueChange={(val) => setWeeklyPace(parseFloat(val))}
                  >
                    <SelectTrigger className="bg-slate-950 border-white/10 text-white min-w-0 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      {weightDelta > 0.1 ? (
                        <>
                          <SelectItem value="0.25">Lean Hypertrophy (+0.25 kg / wk ~ +275 kcal surplus)</SelectItem>
                          <SelectItem value="0.5">Bulking (+0.5 kg / wk ~ +550 kcal surplus)</SelectItem>
                          <SelectItem value="0.75">Aggressive Mass (+0.75 kg / wk ~ +825 kcal surplus)</SelectItem>
                          <SelectItem value="0">Maintenance & Longevity (0 kg / wk energy balance)</SelectItem>
                          <SelectItem value="-0.25">Gradual Recomp (-0.25 kg / wk ~ 275 kcal deficit)</SelectItem>
                          <SelectItem value="-0.5">Standard Sustainable (-0.5 kg / wk ~ 550 kcal deficit)</SelectItem>
                        </>
                      ) : weightDelta < -0.1 ? (
                        <>
                          <SelectItem value="-0.25">Gradual Recomp (-0.25 kg / wk ~ 275 kcal deficit)</SelectItem>
                          <SelectItem value="-0.5">Standard Sustainable (-0.5 kg / wk ~ 550 kcal deficit)</SelectItem>
                          <SelectItem value="-0.75">Moderate Fat Loss (-0.75 kg / wk ~ 825 kcal deficit)</SelectItem>
                          <SelectItem value="-1.0">Aggressive Fat Loss (-1.0 kg / wk ~ 1,100 kcal deficit)</SelectItem>
                          <SelectItem value="0">Maintenance & Longevity (0 kg / wk energy balance)</SelectItem>
                          <SelectItem value="0.25">Lean Hypertrophy (+0.25 kg / wk ~ 275 kcal surplus)</SelectItem>
                          <SelectItem value="0.5">Bulking (+0.5 kg / wk ~ 550 kcal surplus)</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="0">Maintenance & Longevity (0 kg / wk energy balance)</SelectItem>
                          <SelectItem value="-0.25">Gradual Recomp (-0.25 kg / wk ~ 275 kcal deficit)</SelectItem>
                          <SelectItem value="-0.5">Standard Sustainable (-0.5 kg / wk ~ 550 kcal deficit)</SelectItem>
                          <SelectItem value="0.25">Lean Hypertrophy (+0.25 kg / wk ~ 275 kcal surplus)</SelectItem>
                          <SelectItem value="0.5">Bulking (+0.5 kg / wk ~ 550 kcal surplus)</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>

                  {/* Dynamic Quick Pace Preset Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[11px] text-slate-400 font-medium mr-0.5">Pace:</span>
                    {weightDelta > 0.1 ? (
                      <>
                        {[
                          { pace: 0.25, label: "+0.25 kg/wk (Lean)" },
                          { pace: 0.5, label: "+0.50 kg/wk (Bulk)" },
                          { pace: 0.75, label: "+0.75 kg/wk (Aggressive)" },
                        ].map((item) => (
                          <button
                            key={item.pace}
                            type="button"
                            onClick={() => setWeeklyPace(item.pace)}
                            className={`text-[11px] px-2.5 py-0.5 rounded-md border transition-all ${
                              weeklyPace === item.pace
                                ? "bg-emerald-500/25 text-emerald-300 border-emerald-500/40 font-semibold"
                                : "bg-slate-950 text-slate-400 border-white/10 hover:bg-slate-900 hover:text-slate-200"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </>
                    ) : weightDelta < -0.1 ? (
                      <>
                        {[
                          { pace: -0.25, label: "-0.25 kg/wk (Gradual)" },
                          { pace: -0.5, label: "-0.50 kg/wk (Sustainable)" },
                          { pace: -0.75, label: "-0.75 kg/wk (Moderate)" },
                          { pace: -1.0, label: "-1.00 kg/wk (Aggressive)" },
                        ].map((item) => (
                          <button
                            key={item.pace}
                            type="button"
                            onClick={() => setWeeklyPace(item.pace)}
                            className={`text-[11px] px-2.5 py-0.5 rounded-md border transition-all ${
                              weeklyPace === item.pace
                                ? "bg-cyan-500/25 text-cyan-300 border-cyan-500/40 font-semibold"
                                : "bg-slate-950 text-slate-400 border-white/10 hover:bg-slate-900 hover:text-slate-200"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setWeeklyPace(0)}
                        className="text-[11px] px-2.5 py-0.5 rounded-md border bg-emerald-500/25 text-emerald-300 border-emerald-500/40 font-semibold"
                      >
                        Maintenance (0 kg/wk)
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Activity & Diet Preferences */}
              <div className="space-y-3.5 bg-slate-900/60 p-4 rounded-xl border border-white/5">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Lifestyle & Diet Constraints
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <Label className="text-xs text-slate-300 font-medium">Activity Level</Label>
                    <Select
                      value={activityLevel}
                      onValueChange={(val: ActivityLevel) => setActivityLevel(val)}
                    >
                      <SelectTrigger className="mt-1 bg-slate-950 border-white/10 text-white min-w-0 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 text-white">
                        {Object.entries(ACTIVITY_MULTIPLIERS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v.label} ({v.factor}x)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300 font-medium">Dietary Pattern</Label>
                    <Select
                      value={dietaryPref}
                      onValueChange={(val) => setDietaryPref(val)}
                    >
                      <SelectTrigger className="mt-1 bg-slate-950 border-white/10 text-white min-w-0 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 text-white">
                        <SelectItem value="vegetarian">Vegetarian</SelectItem>
                        <SelectItem value="omnivore">Omnivore</SelectItem>
                        <SelectItem value="vegan">Vegan</SelectItem>
                        <SelectItem value="jain">Jain (No Root Veg)</SelectItem>
                        <SelectItem value="eggetarian">Eggetarian</SelectItem>
                        <SelectItem value="pescatarian">Pescatarian</SelectItem>
                        <SelectItem value="keto">Keto / Low-Carb</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-slate-300 font-medium">Primary Health Focus</Label>
                  <Select
                    value={goal}
                    onValueChange={(val: HealthGoal) => setGoal(val)}
                  >
                    <SelectTrigger className="mt-1 bg-slate-950 border-white/10 text-white min-w-0 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      {Object.entries(HEALTH_GOALS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Live Physics & Biomarker Integration Preview */}
            <div className="lg:col-span-5 space-y-4">
              {/* Live Target Banner */}
              <div className="bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 p-4 rounded-xl border border-emerald-500/30 relative overflow-hidden">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5 shrink-0">
                    <Flame className="w-3.5 h-3.5" />
                    Target Energy Calibrated
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {liveCalorieTarget > liveTdee ? (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-semibold px-2 py-0.5">
                        +{liveCalorieTarget - liveTdee} kcal Surplus
                      </Badge>
                    ) : liveCalorieTarget < liveTdee ? (
                      <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px] font-semibold px-2 py-0.5">
                        -{liveTdee - liveCalorieTarget} kcal Deficit
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] font-semibold px-2 py-0.5">
                        Energy Balance
                      </Badge>
                    )}
                    <Badge className="bg-slate-800/80 text-slate-300 border-white/10 text-[10px] shrink-0 font-medium">
                      Mifflin-St Jeor
                    </Badge>
                  </div>
                </div>

                <div className="flex items-baseline gap-2 mb-1.5">
                  <span className="text-3xl font-extrabold text-white tracking-tight">
                    {liveCalorieTarget.toLocaleString()}
                  </span>
                  <span className="text-sm font-medium text-slate-300">kcal / day</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-xs pt-2.5 border-t border-white/10 text-slate-300">
                  <div>
                    <span className="text-slate-400">Current BMR:</span> {liveBmr} kcal
                  </div>
                  <div>
                    <span className="text-slate-400">Current TDEE:</span> {liveTdee} kcal
                  </div>
                  {Math.abs(weightDelta) >= 0.1 && (
                    <div className="col-span-2 text-slate-300 text-xs flex items-center justify-between bg-slate-950/60 px-2 py-1 rounded border border-white/5 mt-0.5">
                      <span className="text-slate-400">Goal Maintenance at {numTargetWeight} kg:</span>
                      <span className="font-semibold text-emerald-300">{goalTdee.toLocaleString()} kcal/day</span>
                    </div>
                  )}
                  {estimatedWeeks && (
                    <div className="col-span-2 text-emerald-300 flex items-center gap-1.5 mt-0.5 font-medium text-xs">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Estimated {estimatedWeeks} weeks to reach {numTargetWeight} kg ({weeklyPace > 0 ? `+${weeklyPace}` : weeklyPace} kg/wk)
                      </span>
                    </div>
                  )}
                </div>

                {/* Macro Split Preview */}
                <div className="mt-3 pt-2.5 border-t border-white/10">
                  <div className="flex justify-between items-center text-xs mb-1.5 gap-2">
                    <span className="text-slate-400 shrink-0">Target Macros</span>
                    <span className="text-slate-300 font-medium truncate">
                      P: {liveMacros.grams.protein}g | C: {liveMacros.grams.carbs}g | F: {liveMacros.grams.fat}g
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${liveMacros.split.proteinPct}%` }}
                      className="bg-emerald-400 transition-all duration-300"
                      title={`Protein: ${liveMacros.split.proteinPct}%`}
                    />
                    <div
                      style={{ width: `${liveMacros.split.carbsPct}%` }}
                      className="bg-amber-400 transition-all duration-300"
                      title={`Carbs: ${liveMacros.split.carbsPct}%`}
                    />
                    <div
                      style={{ width: `${liveMacros.split.fatPct}%` }}
                      className="bg-sky-400 transition-all duration-300"
                      title={`Fat: ${liveMacros.split.fatPct}%`}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1 flex-wrap gap-1">
                    <span className="text-emerald-400 font-medium">● Protein {liveMacros.split.proteinPct}%</span>
                    <span className="text-amber-400 font-medium">● Carbs {liveMacros.split.carbsPct}%</span>
                    <span className="text-sky-400 font-medium">● Fat {liveMacros.split.fatPct}%</span>
                  </div>
                </div>
              </div>

              {/* Active Lab Biomarkers Synergy Card */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                    Biomarker Guardrails ({biomarkerImpacts.length} Active)
                  </h4>
                  <span className="text-[11px] text-slate-400 shrink-0">From Latest Lab Panel</span>
                </div>

                {biomarkerImpacts.length === 0 ? (
                  <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      All evaluated metabolic & lipid markers within optimal ranges. Standard goal parameters applied.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {biomarkerImpacts.map((imp) => (
                      <div
                        key={imp.id}
                        className="p-2.5 rounded-lg bg-slate-950 border border-white/5 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-white">
                            {imp.biomarkerName}:{" "}
                            <span className="text-rose-300">
                              {imp.value} {imp.unit}
                            </span>
                          </span>
                          <Badge className="bg-rose-500/15 text-rose-300 border-rose-500/30 text-[10px] shrink-0">
                            {imp.badgeLabel}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {imp.nutritionalAction}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {liveMacros.biomarkerModulations.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/20 text-[11px] text-amber-300 space-y-1">
                    <strong className="block text-[11px] text-amber-200 font-semibold">
                      Automated Macro Safeguards:
                    </strong>
                    {liveMacros.biomarkerModulations.map((mod, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-400">•</span>
                        <span>{mod}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer (Pinned at bottom, always visible) */}
        <DialogFooter className="px-6 py-3.5 bg-slate-900/90 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-6 shadow-lg shadow-emerald-500/20"
          >
            <Check className="w-4 h-4 mr-1.5" />
            Apply & Recalculate Protocol
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
