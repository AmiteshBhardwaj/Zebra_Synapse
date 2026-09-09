import React, { useState, useMemo } from "react";
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
  const [currentWeight, setCurrentWeight] = useState<number>(
    settings.currentWeightKg || 78
  );
  const [targetWeight, setTargetWeight] = useState<number>(
    settings.targetWeightKg || 70
  );
  const [heightCm, setHeightCm] = useState<number>(settings.heightCm || 175);
  const [age, setAge] = useState<number>(settings.age || 36);
  const [gender, setGender] = useState<"male" | "female">(
    settings.gender || "male"
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

  // Live Metabolic Physics Calculation
  const liveBmr = useMemo(() => {
    return calculateBMR(currentWeight, heightCm, age, gender);
  }, [currentWeight, heightCm, age, gender]);

  const liveTdee = useMemo(() => {
    return calculateTDEE(liveBmr, activityLevel);
  }, [liveBmr, activityLevel]);

  const liveCalorieTarget = useMemo(() => {
    return calculateCalorieTarget(liveTdee, goal, weeklyPace);
  }, [liveTdee, goal, weeklyPace]);

  // Live Biomarker Impacts
  const biomarkerImpacts = useMemo(() => {
    return evaluateBiomarkerDietImpacts(activePanel);
  }, [activePanel]);

  // Live Macro Modulations with Biomarker Safeguards
  const liveMacros = useMemo(() => {
    return calculateMacroTargets(
      liveCalorieTarget,
      goal,
      currentWeight,
      undefined,
      activePanel
    );
  }, [liveCalorieTarget, goal, currentWeight, activePanel]);

  // Time to reach goal
  const weightDiff = currentWeight - targetWeight;
  const estimatedWeeks = useMemo(() => {
    if (weeklyPace === 0 || Math.sign(weightDiff) !== Math.sign(-weeklyPace)) {
      return null;
    }
    const weeks = Math.abs(weightDiff) / Math.abs(weeklyPace);
    return Math.max(1, Math.round(weeks));
  }, [weightDiff, weeklyPace]);

  const handleSave = () => {
    const updated: DietUserSettings = {
      ...settings,
      currentWeightKg: currentWeight,
      targetWeightKg: targetWeight,
      heightCm,
      age,
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
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 border border-emerald-500/20 bg-slate-950 text-slate-100 shadow-2xl rounded-2xl">
        {/* Header with gradient badge */}
        <div className="relative p-6 pb-4 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-cyan-950/40 border-b border-white/10">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Metabolic Goal & Biomarker Calibration
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs font-semibold">
                  Two-Tier Synthesis
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Calibrates energy physics (Current Weight → Goal Weight) and reconciles active lab blood biomarkers into personalized nutritional and workout constraints.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Main Grid: Inputs on left, Live Dual-Driver Preview on right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: Input Parameters */}
            <div className="lg:col-span-7 space-y-5">
              <div className="space-y-4 bg-slate-900/60 p-4.5 rounded-xl border border-white/5">
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

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <Label className="text-xs text-slate-300">Current Weight (kg)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="30"
                      max="250"
                      value={currentWeight}
                      onChange={(e) => setCurrentWeight(parseFloat(e.target.value) || 70)}
                      className="mt-1 bg-slate-950 border-white/10 text-white font-medium"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300">Target Goal Weight (kg)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="30"
                      max="250"
                      value={targetWeight}
                      onChange={(e) => setTargetWeight(parseFloat(e.target.value) || 70)}
                      className="mt-1 bg-slate-950 border-emerald-500/40 text-emerald-300 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-slate-300">Height (cm)</Label>
                    <Input
                      type="number"
                      value={heightCm}
                      onChange={(e) => setHeightCm(parseInt(e.target.value, 10) || 170)}
                      className="mt-1 bg-slate-950 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300">Age</Label>
                    <Input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(parseInt(e.target.value, 10) || 30)}
                      className="mt-1 bg-slate-950 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-300">Biological Sex</Label>
                    <Select value={gender} onValueChange={(val: "male" | "female") => setGender(val)}>
                      <SelectTrigger className="mt-1 bg-slate-950 border-white/10 text-white">
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
                    <Label className="text-xs text-slate-300">Weekly Target Pace</Label>
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
                    <SelectTrigger className="bg-slate-950 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      <SelectItem value="-1.0">Aggressive Fat Loss (-1.0 kg / wk ~ 1,100 kcal deficit)</SelectItem>
                      <SelectItem value="-0.75">Moderate Fat Loss (-0.75 kg / wk ~ 825 kcal deficit)</SelectItem>
                      <SelectItem value="-0.5">Standard Sustainable (-0.5 kg / wk ~ 550 kcal deficit)</SelectItem>
                      <SelectItem value="-0.25">Gradual Recomp (-0.25 kg / wk ~ 275 kcal deficit)</SelectItem>
                      <SelectItem value="0">Maintenance & Longevity (0 kg / wk energy balance)</SelectItem>
                      <SelectItem value="0.25">Lean Hypertrophy (+0.25 kg / wk ~ 275 kcal surplus)</SelectItem>
                      <SelectItem value="0.5">Bulking (+0.5 kg / wk ~ 550 kcal surplus)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Activity & Diet Preferences */}
              <div className="space-y-4 bg-slate-900/60 p-4.5 rounded-xl border border-white/5">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Lifestyle & Diet Constraints
                </h3>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <Label className="text-xs text-slate-300">Activity Level</Label>
                    <Select
                      value={activityLevel}
                      onValueChange={(val: ActivityLevel) => setActivityLevel(val)}
                    >
                      <SelectTrigger className="mt-1 bg-slate-950 border-white/10 text-white">
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
                    <Label className="text-xs text-slate-300">Dietary Pattern</Label>
                    <Select
                      value={dietaryPref}
                      onValueChange={(val) => setDietaryPref(val)}
                    >
                      <SelectTrigger className="mt-1 bg-slate-950 border-white/10 text-white">
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
                  <Label className="text-xs text-slate-300">Primary Health Focus</Label>
                  <Select
                    value={goal}
                    onValueChange={(val: HealthGoal) => setGoal(val)}
                  >
                    <SelectTrigger className="mt-1 bg-slate-950 border-white/10 text-white">
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
            <div className="lg:col-span-5 space-y-5">
              {/* Live Target Banner */}
              <div className="bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 p-5 rounded-xl border border-emerald-500/30 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" />
                    Target Energy Calibrated
                  </span>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-none text-[11px]">
                    Mifflin-St Jeor
                  </Badge>
                </div>

                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-extrabold text-white tracking-tight">
                    {liveCalorieTarget.toLocaleString()}
                  </span>
                  <span className="text-sm font-medium text-slate-300">kcal / day</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-white/10 text-slate-300">
                  <div>
                    <span className="text-slate-400">BMR:</span> {liveBmr} kcal
                  </div>
                  <div>
                    <span className="text-slate-400">TDEE:</span> {liveTdee} kcal
                  </div>
                  {estimatedWeeks && (
                    <div className="col-span-2 text-emerald-300 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      Estimated {estimatedWeeks} weeks to reach {targetWeight} kg
                    </div>
                  )}
                </div>

                {/* Macro Split Preview */}
                <div className="mt-4 pt-3 border-t border-white/10">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Target Macros</span>
                    <span className="text-slate-300 font-medium">
                      P: {liveMacros.grams.protein}g | C: {liveMacros.grams.carbs}g | F: {liveMacros.grams.fat}g
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${liveMacros.split.proteinPct}%` }}
                      className="bg-emerald-400"
                      title={`Protein: ${liveMacros.split.proteinPct}%`}
                    />
                    <div
                      style={{ width: `${liveMacros.split.carbsPct}%` }}
                      className="bg-amber-400"
                      title={`Carbs: ${liveMacros.split.carbsPct}%`}
                    />
                    <div
                      style={{ width: `${liveMacros.split.fatPct}%` }}
                      className="bg-sky-400"
                      title={`Fat: ${liveMacros.split.fatPct}%`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span className="text-emerald-400">● Protein {liveMacros.split.proteinPct}%</span>
                    <span className="text-amber-400">● Carbs {liveMacros.split.carbsPct}%</span>
                    <span className="text-sky-400">● Fat {liveMacros.split.fatPct}%</span>
                  </div>
                </div>
              </div>

              {/* Active Lab Biomarkers Synergy Card */}
              <div className="bg-slate-900/80 p-4.5 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                    Biomarker Guardrails ({biomarkerImpacts.length} Active)
                  </h4>
                  <span className="text-[11px] text-slate-400">From Latest Lab Panel</span>
                </div>

                {biomarkerImpacts.length === 0 ? (
                  <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    All evaluated metabolic & lipid markers within optimal ranges. Standard goal parameters applied.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {biomarkerImpacts.map((imp) => (
                      <div
                        key={imp.id}
                        className="p-2.5 rounded-lg bg-slate-950 border border-white/5 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white">
                            {imp.biomarkerName}:{" "}
                            <span className="text-rose-300">
                              {imp.value} {imp.unit}
                            </span>
                          </span>
                          <Badge className="bg-rose-500/15 text-rose-300 border-rose-500/30 text-[10px]">
                            {imp.badgeLabel}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight">
                          {imp.nutritionalAction}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {liveMacros.biomarkerModulations.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/20 text-[11px] text-amber-300 space-y-0.5">
                    <strong className="block text-[11px] text-amber-200 font-semibold">
                      Automated Macro Safeguards:
                    </strong>
                    {liveMacros.biomarkerModulations.map((mod, idx) => (
                      <div key={idx} className="flex items-start gap-1">
                        <span>•</span>
                        <span>{mod}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 bg-slate-900/60 border-t border-white/10 flex items-center justify-between gap-3">
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
