import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { getSupabase } from "../../lib/supabase";
import { calculateBmi, getBmiCategory } from "../../lib/careRelationships";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import {
  Copy,
  Check,
  ShieldCheck,
  UserCircle2,
  KeyRound,
  Sparkles,
  Ruler,
  Scale,
  Activity,
  HeartPulse,
  Info,
  Utensils,
  Leaf,
  Flame,
  ShieldAlert,
  Apple,
  Dumbbell,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import {
  PatientPortalPage,
  portalInputClass,
  portalPanelClass,
  portalPrimaryButtonClass,
  portalSecondaryButtonClass,
} from "../components/patient/PortalTheme";

type UnitSystem = "metric" | "imperial";

const DIET_TYPES = [
  { id: "omnivore", label: "Non-Vegetarian (Omnivore)", desc: "Meat, poultry, seafood, dairy & plants" },
  { id: "vegetarian", label: "Vegetarian", desc: "Plant foods & dairy (lacto-veg), no meat/seafood" },
  { id: "vegan", label: "Vegan", desc: "100% plant-based, zero animal products or dairy" },
  { id: "eggetarian", label: "Eggetarian", desc: "Vegetarian plus eggs, no meat or seafood" },
  { id: "pescatarian", label: "Pescatarian", desc: "Vegetarian plus fish and seafood" },
  { id: "jain", label: "Jain Vegetarian", desc: "Vegetarian without root vegetables (onion, garlic, potato)" },
  { id: "keto", label: "Ketogenic / Low Carb", desc: "High healthy fats, moderate protein, very low carbs" },
  { id: "halal", label: "Halal", desc: "Conforms to Islamic dietary guidelines" },
  { id: "kosher", label: "Kosher", desc: "Conforms to Jewish dietary laws" },
];

const FOOD_ALLERGIES = [
  { id: "lactose", label: "Lactose Intolerant", badge: "Dairy Free" },
  { id: "gluten", label: "Gluten / Celiac", badge: "Gluten Free" },
  { id: "peanuts", label: "Peanuts", badge: "Nut Free" },
  { id: "tree_nuts", label: "Tree Nuts (Almonds/Walnuts)", badge: "Nut Free" },
  { id: "shellfish", label: "Shellfish & Crustaceans", badge: "Allergen" },
  { id: "soy", label: "Soy & Soybeans", badge: "Soy Free" },
  { id: "eggs", label: "Eggs", badge: "Egg Free" },
  { id: "sesame", label: "Sesame", badge: "Allergen" },
];

const DIETARY_CONDITIONS = [
  { id: "gerd", label: "GERD / Acid Reflux", desc: "Avoid high-acid, citrus, fried, caffeine & late dinners" },
  { id: "ibs", label: "IBS (Irritable Bowel)", desc: "Low-FODMAP and soothing, gentle digestive nutrition" },
  { id: "gastritis", label: "Gastritis / Peptic Ulcer", desc: "Non-irritating, low-spice, stomach-friendly meals" },
  { id: "diabetes", label: "Diabetes / Low Glycemic", desc: "Complex carbs, high fiber, steady glycemic response" },
  { id: "hypertension", label: "Hypertension / Low Sodium", desc: "DASH diet principles, strictly < 2,000mg sodium daily" },
  { id: "gout", label: "Gout / Low Purine", desc: "Limit red meat, organ meats, shellfish, alcohol" },
  { id: "kidney_disease", label: "Renal / Kidney Support", desc: "Monitored potassium, phosphorus & balanced protein" },
];

const FITNESS_LEVELS = [
  { id: "beginner", label: "Beginner", desc: "Starting out, focus on joint safety, basic mobility & form" },
  { id: "intermediate", label: "Intermediate", desc: "Consistent routine, progressive resistance & aerobic conditioning" },
  { id: "advanced", label: "Advanced", desc: "High exercise tolerance, higher volume circuits & compound training" },
];

const WORKOUT_ENVIRONMENTS = [
  { id: "home_minimal", label: "Home Fitness", desc: "Bodyweight, dumbbells, resistance bands, yoga mat" },
  { id: "bodyweight", label: "Bodyweight Only", desc: "No equipment, floor & standing movements only" },
  { id: "gym", label: "Gym & Fitness Club", desc: "Full access to machines, cables, barbells & cardio treadmills" },
];

const PHYSICAL_LIMITATIONS = [
  { id: "knee_pain", label: "Knee Joint Sensitivity", desc: "Favor low-impact movements, avoid deep plyometrics" },
  { id: "lower_back", label: "Lower Back / Spinal Strain", desc: "Avoid heavy spinal loading; prioritize core bracing" },
  { id: "shoulder", label: "Shoulder / Rotator Cuff", desc: "Limit heavy overhead pressing; prioritize neutral grip" },
  { id: "neck_strain", label: "Neck Tension", desc: "Avoid compressive cervical spine loading" },
  { id: "asthma", label: "Exercise-Induced Asthma", desc: "Extended warm-ups, steady aerobic pacing with inhaler available" },
];

export default function ProfileSettings() {
  const { user, profile, refreshProfile, updateProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");

  // Metric states (source of truth for saving)
  const [heightCm, setHeightCm] = useState<string>("");
  const [weightKg, setWeightKg] = useState<string>("");

  // Imperial states (for UI display and editing in imperial mode)
  const [heightFt, setHeightFt] = useState<string>("");
  const [heightIn, setHeightIn] = useState<string>("");
  const [weightLbs, setWeightLbs] = useState<string>("");

  // Dietary preferences states
  const [dietaryPreference, setDietaryPreference] = useState<string>("omnivore");
  const [foodAllergies, setFoodAllergies] = useState<string[]>([]);
  const [dietaryConditions, setDietaryConditions] = useState<string[]>([]);
  const [dietaryNotes, setDietaryNotes] = useState<string>("");

  // Fitness preferences states (persisted in localStorage + sync)
  const fitnessStorageKey = `zebra_fitness_prefs_${user?.id || "default"}`;
  const [fitnessLevel, setFitnessLevel] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`zebra_fitness_prefs_${user?.id || "default"}`);
      return saved ? JSON.parse(saved).fitnessLevel || "beginner" : "beginner";
    } catch {
      return "beginner";
    }
  });
  const [workoutEnv, setWorkoutEnv] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`zebra_fitness_prefs_${user?.id || "default"}`);
      return saved ? JSON.parse(saved).workoutEnv || "home_minimal" : "home_minimal";
    } catch {
      return "home_minimal";
    }
  });
  const [physicalLimitations, setPhysicalLimitations] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`zebra_fitness_prefs_${user?.id || "default"}`);
      return saved ? JSON.parse(saved).physicalLimitations || [] : [];
    } catch {
      return [];
    }
  });

  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Initialize values when profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setLicenseNumber(profile.license_number ?? "");

      if (profile.height_cm != null && profile.height_cm > 0) {
        setHeightCm(profile.height_cm.toString());
        const totalInches = profile.height_cm / 2.54;
        const ft = Math.floor(totalInches / 12);
        const inch = Math.round((totalInches % 12) * 10) / 10;
        setHeightFt(ft.toString());
        setHeightIn(inch.toString());
      } else {
        setHeightCm("");
        setHeightFt("");
        setHeightIn("");
      }

      if (profile.weight_kg != null && profile.weight_kg > 0) {
        setWeightKg(profile.weight_kg.toString());
        const lbs = Math.round(profile.weight_kg * 2.20462 * 10) / 10;
        setWeightLbs(lbs.toString());
      } else {
        setWeightKg("");
        setWeightLbs("");
      }

      setDietaryPreference(profile.dietary_preference || "omnivore");
      setFoodAllergies(profile.food_allergies || []);
      setDietaryConditions(profile.dietary_conditions || []);
      setDietaryNotes(profile.dietary_notes || "");
    }
  }, [profile]);

  const toggleAllergy = (id: string) => {
    setFoodAllergies((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleCondition = (id: string) => {
    setDietaryConditions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleLimitation = (id: string) => {
    setPhysicalLimitations((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Handle Height changes in Metric
  const handleHeightCmChange = (val: string) => {
    setHeightCm(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const totalInches = num / 2.54;
      const ft = Math.floor(totalInches / 12);
      const inch = Math.round((totalInches % 12) * 10) / 10;
      setHeightFt(ft.toString());
      setHeightIn(inch.toString());
    } else {
      setHeightFt("");
      setHeightIn("");
    }
  };

  // Handle Height changes in Imperial
  const handleHeightImperialChange = (ftVal: string, inVal: string) => {
    setHeightFt(ftVal);
    setHeightIn(inVal);
    const ft = parseFloat(ftVal) || 0;
    const inch = parseFloat(inVal) || 0;
    const totalInches = ft * 12 + inch;
    if (totalInches > 0) {
      const cm = Math.round(totalInches * 2.54 * 10) / 10;
      setHeightCm(cm.toString());
    } else {
      setHeightCm("");
    }
  };

  // Handle Weight changes in Metric
  const handleWeightKgChange = (val: string) => {
    setWeightKg(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const lbs = Math.round(num * 2.20462 * 10) / 10;
      setWeightLbs(lbs.toString());
    } else {
      setWeightLbs("");
    }
  };

  // Handle Weight changes in Imperial
  const handleWeightLbsChange = (val: string) => {
    setWeightLbs(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const kg = Math.round((num / 2.20462) * 10) / 10;
      setWeightKg(kg.toString());
    } else {
      setWeightKg("");
    }
  };

  // Computed BMI values
  const currentHeightNum = parseFloat(heightCm);
  const currentWeightNum = parseFloat(weightKg);

  const liveBmi = useMemo(() => {
    return calculateBmi(currentHeightNum, currentWeightNum);
  }, [currentHeightNum, currentWeightNum]);

  const bmiCategory = useMemo(() => {
    return getBmiCategory(liveBmi);
  }, [liveBmi]);

  // Healthy weight range for current height
  const healthyWeightRange = useMemo(() => {
    if (!currentHeightNum || currentHeightNum <= 0) return null;
    const heightM = currentHeightNum / 100;
    const minKg = Math.round(18.5 * heightM * heightM * 10) / 10;
    const maxKg = Math.round(24.9 * heightM * heightM * 10) / 10;
    const minLbs = Math.round(minKg * 2.20462 * 10) / 10;
    const maxLbs = Math.round(maxKg * 2.20462 * 10) / 10;
    return {
      metric: `${minKg} – ${maxKg} kg`,
      imperial: `${minLbs} – ${maxLbs} lbs`,
    };
  }, [currentHeightNum]);

  const copyId = async () => {
    const id = user?.id;
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      toast.success("Profile ID copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      toast.error("Not signed in");
      return;
    }
    setSaving(true);
    const patch: Record<string, string | number | null | string[]> = {
      full_name: fullName.trim() || null,
    };
    if (profile.role === "doctor") {
      patch.license_number = licenseNumber.trim() || null;
    } else if (profile.role === "patient") {
      const parsedH = parseFloat(heightCm);
      const parsedW = parseFloat(weightKg);
      patch.height_cm = Number.isFinite(parsedH) && parsedH > 0 ? parsedH : null;
      patch.weight_kg = Number.isFinite(parsedW) && parsedW > 0 ? parsedW : null;
      patch.dietary_preference = dietaryPreference || null;
      patch.food_allergies = foodAllergies;
      patch.dietary_conditions = dietaryConditions;
      patch.dietary_notes = dietaryNotes.trim() || null;

      // Save fitness preferences to localStorage
      try {
        localStorage.setItem(
          fitnessStorageKey,
          JSON.stringify({
            fitnessLevel,
            workoutEnv,
            physicalLimitations,
          })
        );
      } catch {
        // ignore
      }
    }

    const { error } = await updateProfile(patch as any);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated successfully");
  };

  if (!profile || !user) {
    return (
      <PatientPortalPage>
        <p className="text-sm text-[#A1A1AA]">Loading...</p>
      </PatientPortalPage>
    );
  }

  return (
    <PatientPortalPage>
      {/* Sleek Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff8a3d]/25 to-[#f05a28]/15 border border-[#ff8a3d]/35 shadow-[0_12px_28px_rgba(255,122,51,0.2)]">
            <UserCircle2 className="h-6 w-6 text-[#ff9c61]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Account Settings</h1>
              <span className="rounded-full border border-[#ff8a3d]/30 bg-[#ff8a3d]/12 px-2.5 py-0.5 text-[10px] font-semibold text-[#ff9c61] uppercase tracking-wider">
                {profile.role}
              </span>
            </div>
            <p className="text-sm sm:text-base text-[#b4c9e8] mt-1 font-medium leading-relaxed">
              {profile.role === "patient"
                ? "Manage your personal credentials, height, weight, and clinical connection ID."
                : "Manage your display name, physician credentials, and portal identity preferences."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-white/70">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        </div>
      </div>

      {/* Vertical Stacked Cards Layout */}
      <div className="space-y-6 max-w-4xl">
        {/* Main Settings Form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          {/* Profile Identity Card */}
          <Card className={`${portalPanelClass} p-2`}>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4.5 w-4.5 text-[#ff9c61]" />
                <CardTitle className="text-base text-white">Profile Information</CardTitle>
              </div>
              <CardDescription className="text-xs text-[#92a8c7]">
                Update your display name and credentials used across the clinical portal.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-xs font-semibold uppercase tracking-wider text-white/70">
                  Display Name
                </Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  className={portalInputClass}
                />
              </div>

              {profile.role === "doctor" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="license" className="text-xs font-semibold uppercase tracking-wider text-white/70">
                    Medical License Number
                  </Label>
                  <Input
                    id="license"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="License number"
                    className={portalInputClass}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Patient Physical Vitals & BMI Card (Shown for Patients only) */}
          {profile.role === "patient" && (
            <Card className={`${portalPanelClass} p-2`}>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <HeartPulse className="h-4.5 w-4.5 text-cyan-400" />
                    <CardTitle className="text-base text-white">Height & Weight Settings</CardTitle>
                  </div>
                  <CardDescription className="text-xs text-[#92a8c7] mt-1">
                    Keep your body metrics up to date for precise clinical risk tracking and personalized insights.
                  </CardDescription>
                </div>

                {/* Unit Switcher Button Group */}
                <div className="flex items-center gap-1 bg-[#090e17] p-1 rounded-xl border border-white/10 shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setUnitSystem("metric")}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                      unitSystem === "metric"
                        ? "bg-[#ff8a3d] text-white shadow-sm font-semibold"
                        : "text-[#92a8c7] hover:text-white"
                    }`}
                  >
                    Metric (cm / kg)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnitSystem("imperial")}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                      unitSystem === "imperial"
                        ? "bg-[#ff8a3d] text-white shadow-sm font-semibold"
                        : "text-[#92a8c7] hover:text-white"
                    }`}
                  >
                    Imperial (ft-in / lbs)
                  </button>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Height Field */}
                  <div className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
                        <Ruler className="h-3.5 w-3.5 text-cyan-400" />
                        Height
                      </Label>
                      <span className="text-[11px] text-[#92a8c7]">
                        {unitSystem === "metric" ? "Centimeters" : "Feet & Inches"}
                      </span>
                    </div>

                    {unitSystem === "metric" ? (
                      <div className="relative">
                        <Input
                          id="height_cm"
                          type="number"
                          step="0.1"
                          min="50"
                          max="260"
                          value={heightCm}
                          onChange={(e) => handleHeightCmChange(e.target.value)}
                          placeholder="e.g. 175"
                          className={`${portalInputClass} pr-12`}
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#92a8c7]">
                          cm
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <Input
                            id="height_ft"
                            type="number"
                            min="1"
                            max="8"
                            value={heightFt}
                            onChange={(e) => handleHeightImperialChange(e.target.value, heightIn)}
                            placeholder="5"
                            className={`${portalInputClass} pr-8`}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#92a8c7]">
                            ft
                          </span>
                        </div>
                        <div className="relative">
                          <Input
                            id="height_in"
                            type="number"
                            step="0.1"
                            min="0"
                            max="11.9"
                            value={heightIn}
                            onChange={(e) => handleHeightImperialChange(heightFt, e.target.value)}
                            placeholder="9"
                            className={`${portalInputClass} pr-8`}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#92a8c7]">
                            in
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Weight Field */}
                  <div className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
                        <Scale className="h-3.5 w-3.5 text-emerald-400" />
                        Weight
                      </Label>
                      <span className="text-[11px] text-[#92a8c7]">
                        {unitSystem === "metric" ? "Kilograms" : "Pounds"}
                      </span>
                    </div>

                    {unitSystem === "metric" ? (
                      <div className="relative">
                        <Input
                          id="weight_kg"
                          type="number"
                          step="0.1"
                          min="20"
                          max="300"
                          value={weightKg}
                          onChange={(e) => handleWeightKgChange(e.target.value)}
                          placeholder="e.g. 70"
                          className={`${portalInputClass} pr-12`}
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#92a8c7]">
                          kg
                        </span>
                      </div>
                    ) : (
                      <div className="relative">
                        <Input
                          id="weight_lbs"
                          type="number"
                          step="0.1"
                          min="44"
                          max="660"
                          value={weightLbs}
                          onChange={(e) => handleWeightLbsChange(e.target.value)}
                          placeholder="e.g. 154"
                          className={`${portalInputClass} pr-12`}
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#92a8c7]">
                          lbs
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Real-time Calculated BMI Banner */}
                <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.03] to-[#ff8a3d]/[0.04] p-4.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#090e17] shadow-inner">
                        <Activity className="h-5 w-5 text-[#ff9c61]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
                            Body Mass Index (BMI)
                          </p>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${bmiCategory.badgeClass}`}
                          >
                            {bmiCategory.label}
                          </span>
                        </div>
                        <p className="text-xs text-[#92a8c7] mt-0.5">
                          {liveBmi != null
                            ? `Calculated dynamically from your recorded height & weight.`
                            : "Enter both height and weight above to calculate your BMI."}
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <p className="text-2xl font-bold font-mono text-white tracking-tight">
                        {liveBmi != null ? liveBmi : "—"}
                        <span className="text-xs font-normal text-[#92a8c7] ml-1">kg/m²</span>
                      </p>
                      {healthyWeightRange && (
                        <p className="text-[11px] text-[#92a8c7] mt-0.5">
                          Healthy target:{" "}
                          <span className="text-white/90 font-medium">
                            {unitSystem === "metric"
                              ? healthyWeightRange.metric
                              : healthyWeightRange.imperial}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* BMI Spectrum Visual Bar */}
                  {liveBmi != null && (
                    <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5">
                      <div className="flex justify-between text-[10px] font-mono text-white/50">
                        <span>Underweight (&lt;18.5)</span>
                        <span>Normal (18.5–24.9)</span>
                        <span>Overweight (25–29.9)</span>
                        <span>Obese (≥30)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden flex">
                        <div className="h-full bg-amber-400/70" style={{ width: "25%" }} />
                        <div className="h-full bg-emerald-400/80" style={{ width: "30%" }} />
                        <div className="h-full bg-orange-400/80" style={{ width: "25%" }} />
                        <div className="h-full bg-rose-400/80" style={{ width: "20%" }} />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dietary Preferences & Health Profile Card (Shown for Patients only) */}
          {profile.role === "patient" && (
            <Card className={`${portalPanelClass} p-2`}>
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <Utensils className="h-4.5 w-4.5 text-emerald-400" />
                  <CardTitle className="text-base text-white">Dietary Preferences & Health Conditions</CardTitle>
                </div>
                <CardDescription className="text-xs text-[#92a8c7]">
                  Configure your food choices, intolerances, and gastrointestinal conditions to personalize meal plans and clinical alerts.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* 1. Primary Diet Type */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                      <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                      Primary Diet Type
                    </Label>
                    <span className="text-[11px] text-white/50 font-medium">Select 1 option</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {DIET_TYPES.map((dt) => {
                      const isSelected = dietaryPreference === dt.id;
                      return (
                        <button
                          key={dt.id}
                          type="button"
                          onClick={() => setDietaryPreference(dt.id)}
                          className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                            isSelected
                              ? "border-emerald-500/60 bg-emerald-500/15 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40"
                              : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className={`text-xs font-semibold ${isSelected ? "text-emerald-300" : "text-white"}`}>
                              {dt.label}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          </div>
                          <p className="mt-1 text-[11px] text-[#92a8c7] leading-relaxed line-clamp-2">
                            {dt.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Food Intolerances & Allergies */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      Food Allergies & Intolerances
                    </Label>
                    <span className="text-[11px] text-white/50 font-medium">
                      {foodAllergies.length > 0 ? `${foodAllergies.length} selected` : "Select all that apply"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {FOOD_ALLERGIES.map((allergy) => {
                      const isSelected = foodAllergies.includes(allergy.id);
                      return (
                        <button
                          key={allergy.id}
                          type="button"
                          onClick={() => toggleAllergy(allergy.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                            isSelected
                              ? "border-amber-500/60 bg-amber-500/20 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/40"
                              : "border-white/10 bg-white/[0.02] text-white/70 hover:bg-white/[0.05] hover:text-white"
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${isSelected ? "bg-amber-400" : "bg-white/20"}`} />
                          {allergy.label}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${isSelected ? "bg-amber-400/20 text-amber-300" : "bg-white/5 text-white/40"}`}>
                            {allergy.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Digestive & Health Conditions */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-rose-400" />
                      Digestive & Dietary Health Conditions
                    </Label>
                    <span className="text-[11px] text-white/50 font-medium">
                      {dietaryConditions.length > 0 ? `${dietaryConditions.length} selected` : "Select all that apply"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {DIETARY_CONDITIONS.map((cond) => {
                      const isSelected = dietaryConditions.includes(cond.id);
                      return (
                        <button
                          key={cond.id}
                          type="button"
                          onClick={() => toggleCondition(cond.id)}
                          className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                            isSelected
                              ? "border-rose-500/60 bg-rose-500/15 shadow-[0_0_15px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/40"
                              : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className={`text-xs font-semibold ${isSelected ? "text-rose-300" : "text-white"}`}>
                              {cond.label}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                          </div>
                          <p className="mt-1 text-[11px] text-[#92a8c7] leading-relaxed">
                            {cond.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Custom Dietary Notes */}
                <div className="space-y-2 pt-4 border-t border-white/10">
                  <Label htmlFor="dietary_notes" className="text-xs font-semibold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                    <Apple className="w-3.5 h-3.5 text-sky-400" />
                    Custom Dietary Notes & Food Dislikes
                  </Label>
                  <Textarea
                    id="dietary_notes"
                    value={dietaryNotes}
                    onChange={(e) => setDietaryNotes(e.target.value)}
                    placeholder="e.g. Avoid spicy dinners due to acid reflux, prefer plant-based oat milk, fasting on Mondays, low sodium salt only..."
                    rows={3}
                    className={`${portalInputClass} resize-none`}
                  />
                  <p className="text-[11px] text-[#92a8c7]">
                    These personal restrictions will guide your AI nutrition suggestions and be visible to your physician.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Physical Activity & Fitness Preferences Card (Patients Only) */}
          {profile.role === "patient" && (
            <Card className={`${portalPanelClass} p-2`}>
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                    <Dumbbell className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-white">Physical Activity & Fitness Preferences</CardTitle>
                    <CardDescription className="text-xs text-[#92a8c7]">
                      Customize your weekly training intensity, available equipment, and orthopedic considerations for AI exercise prescriptions.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* 1. Fitness Level */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    Training Experience Level
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {FITNESS_LEVELS.map((lvl) => {
                      const isSelected = fitnessLevel === lvl.id;
                      return (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => setFitnessLevel(lvl.id)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "bg-cyan-500/15 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                              : "bg-[#090e17]/80 border-white/5 hover:border-white/15 hover:bg-white/[0.02]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold ${isSelected ? "text-cyan-300" : "text-white"}`}>
                              {lvl.label}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                          </div>
                          <p className="mt-1 text-[11px] text-[#92a8c7] leading-relaxed">
                            {lvl.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Workout Environment */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                    <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
                    Workout Environment & Equipment
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {WORKOUT_ENVIRONMENTS.map((env) => {
                      const isSelected = workoutEnv === env.id;
                      return (
                        <button
                          key={env.id}
                          type="button"
                          onClick={() => setWorkoutEnv(env.id)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "bg-emerald-500/15 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                              : "bg-[#090e17]/80 border-white/5 hover:border-white/15 hover:bg-white/[0.02]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold ${isSelected ? "text-emerald-300" : "text-white"}`}>
                              {env.label}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          </div>
                          <p className="mt-1 text-[11px] text-[#92a8c7] leading-relaxed">
                            {env.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Physical Limitations */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    Joint Sensitivity & Physical Limitations
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {PHYSICAL_LIMITATIONS.map((lim) => {
                      const isSelected = physicalLimitations.includes(lim.id);
                      return (
                        <button
                          key={lim.id}
                          type="button"
                          onClick={() => toggleLimitation(lim.id)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "bg-amber-500/15 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                              : "bg-[#090e17]/80 border-white/5 hover:border-white/15 hover:bg-white/[0.02]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold ${isSelected ? "text-amber-300" : "text-white"}`}>
                              {lim.label}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          </div>
                          <p className="mt-1 text-[11px] text-[#92a8c7] leading-relaxed">
                            {lim.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Profile Changes */}
          <Button type="submit" disabled={saving} className={`w-full h-11 rounded-xl ${portalPrimaryButtonClass}`}>
            {saving ? "Saving Changes…" : "Save Profile Changes"}
          </Button>
        </form>

        {/* Security & Physician Connection ID Card */}
        <Card className={`${portalPanelClass} p-2`}>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <KeyRound className="h-4.5 w-4.5 text-sky-400" />
              <CardTitle className="text-base text-white">Security & Connection ID</CardTitle>
            </div>
            <CardDescription className="text-xs text-[#92a8c7]">
              {profile.role === "patient"
                ? "Share this unique Profile ID with your physician to link your records."
                : "Your unique system identification code."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-white/70">
                Your Connection Profile ID
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-xl border border-white/10 bg-[#090e17] px-3.5 py-2.5 text-xs font-mono text-[#E5E7EB]">
                  {user.id}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`${portalSecondaryButtonClass} h-10 px-4 shrink-0 rounded-xl text-xs`}
                  onClick={() => void copyId()}
                >
                  {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                  {copied ? "Copied" : "Copy ID"}
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#3B82F6]/25 bg-[#3B82F6]/12">
                  <ShieldCheck className="h-4.5 w-4.5 text-[#93c5fd]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Portal Identity & Privacy</p>
                  <p className="mt-0.5 text-[11px] text-[#92a8c7] leading-relaxed">
                    Your profile details are encrypted end-to-end and synced securely across patient and doctor workspaces.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PatientPortalPage>
  );
}
