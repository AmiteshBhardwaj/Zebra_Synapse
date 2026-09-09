import React, { useState } from "react";
import {
  Sparkles,
  Scale,
  Flame,
  ShieldCheck,
  HeartPulse,
  ChevronRight,
  SlidersHorizontal,
  Info,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import type { DietUserSettings, BiomarkerDietImpact } from "../../../lib/dietEngine";
import type { LabPanelRow } from "../../../lib/labPanels";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

interface ClinicalRationaleCardProps {
  settings: DietUserSettings;
  activePanel: LabPanelRow | null;
  biomarkerImpacts: BiomarkerDietImpact[];
  onOpenCalibration: () => void;
}

export default function ClinicalRationaleCard({
  settings,
  activePanel,
  biomarkerImpacts,
  onOpenCalibration,
}: ClinicalRationaleCardProps) {
  const [selectedImpact, setSelectedImpact] = useState<BiomarkerDietImpact | null>(null);

  const currentW = settings.currentWeightKg || 78;
  const targetW = settings.targetWeightKg || 70;
  const pace = settings.weeklyPaceKg !== undefined ? settings.weeklyPaceKg : -0.5;
  const targetCal = settings.customCalorieTarget || 2100;

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-slate-950 p-5 shadow-xl">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-2.5 py-0.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Adaptive Clinical Synthesis
              </Badge>
              <span className="text-xs text-slate-400 font-medium">
                Goal Weight + Active Lab Synergy
              </span>
            </div>

            <p className="text-sm text-slate-200 leading-relaxed max-w-3xl">
              Calibrated for{" "}
              <span className="font-semibold text-white">
                {currentW} kg → {targetW} kg
              </span>{" "}
              {pace !== 0 && (
                <span className="text-emerald-300">
                  ({pace > 0 ? `+${pace}` : pace} kg/wk pace)
                </span>
              )}{" "}
              at{" "}
              <span className="font-semibold text-emerald-400">
                {targetCal.toLocaleString()} kcal/day
              </span>
              .{" "}
              {biomarkerImpacts.length > 0 ? (
                <span>
                  Partitioned with{" "}
                  <strong className="text-white">
                    {biomarkerImpacts.length} active blood biomarker guardrails
                  </strong>{" "}
                  protecting cardiovascular, glycemic, and metabolic parameters.
                </span>
              ) : (
                <span>
                  All baseline metabolic biomarkers are within optimal parameters.
                </span>
              )}
            </p>

            {/* Interactive Biomarker Badges */}
            {biomarkerImpacts.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-slate-400 font-medium">Active Guardrails:</span>
                {biomarkerImpacts.map((imp) => (
                  <button
                    key={imp.id}
                    onClick={() => setSelectedImpact(imp)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-850 hover:bg-slate-800 border border-white/10 text-slate-200 transition-colors cursor-pointer group"
                  >
                    <HeartPulse className="w-3 h-3 text-rose-400 group-hover:scale-110 transition-transform" />
                    <span>{imp.badgeLabel}</span>
                    <Info className="w-3 h-3 text-slate-400 ml-0.5 opacity-60 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Calibrate Button */}
          <div className="flex items-center gap-3 shrink-0">
            <Button
              onClick={onOpenCalibration}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md hover:shadow-emerald-500/10 flex items-center gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Calibrate Goals & Biomarkers
            </Button>
          </div>
        </div>
      </div>

      {/* Explanatory Modal for Clicked Badge */}
      <Dialog
        open={Boolean(selectedImpact)}
        onOpenChange={(open) => !open && setSelectedImpact(null)}
      >
        <DialogContent className="max-w-md bg-slate-950 border border-emerald-500/30 text-slate-100 p-6 rounded-2xl shadow-2xl">
          {selectedImpact && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-white">
                    {selectedImpact.badgeLabel}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                    {selectedImpact.biomarkerName} • {selectedImpact.value} {selectedImpact.unit}
                  </DialogDescription>
                </div>
              </div>

              <div className="space-y-3 text-xs bg-slate-900 p-4 rounded-xl border border-white/5">
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">
                    Clinical Finding:
                  </span>
                  <p className="text-slate-200">{selectedImpact.clinicalRationale}</p>
                </div>
                <div>
                  <span className="text-emerald-400 font-semibold block mb-1">
                    Dietary Adjustment Applied:
                  </span>
                  <p className="text-slate-200">{selectedImpact.nutritionalAction}</p>
                </div>
                {selectedImpact.exerciseAction && (
                  <div>
                    <span className="text-cyan-400 font-semibold block mb-1">
                      Workout Adaptation:
                    </span>
                    <p className="text-slate-200">{selectedImpact.exerciseAction}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => setSelectedImpact(null)}
                  variant="outline"
                  className="border-white/10 text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
