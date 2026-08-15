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

  // Demographics state (Age, Gender, Blood Type)
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [bloodType, setBloodType] = useState<string>("");

  // Dietary preferences states
  const [dietaryPreference, setDietaryPreference] = useState<string>("omnivore");
  const [foodAllergies, setFoodAllergies] = useState<string[]>([]);
  const [dietaryConditions, setDietaryConditions] = useState<string[]>([]);
  const [dietaryNotes, setDietaryNotes] = useState<string>("");

  // Diet & Metabolic Goals states (persisted in localStorage + sync with Diet mini-app)
  const dietStorageKey = `zebra_diet_settings_${user?.id || "default"}`;
  const [activityLevel, setActivityLevel] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`zebra_diet_settings_${user?.id || "default"}`);
      return saved ? JSON.parse(saved).activityLevel || "moderate" : "moderate";
    } catch {
      return "moderate";
    }
  });
  const [dietGoal, setDietGoal] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`zebra_diet_settings_${user?.id || "default"}`);
      return saved ? JSON.parse(saved).goal || "maintain_longevity" : "maintain_longevity";
    } catch {
      return "maintain_longevity";
    }
  });
  const [targetWeightKg, setTargetWeightKg] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`zebra_diet_settings_${user?.id || "default"}`);
      return saved && JSON.parse(saved).targetWeightKg ? String(JSON.parse(saved).targetWeightKg) : "";
    } catch {
      return "";
    }
  });
  const [weeklyPaceKg, setWeeklyPaceKg] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`zebra_diet_settings_${user?.id || "default"}`);
      return saved ? String(JSON.parse(saved).weeklyPaceKg ?? "0") : "0";
    } catch {
      return "0";
    }
  });
  const [dailyWaterTargetMl, setDailyWaterTargetMl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`zebra_diet_settings_${user?.id || "default"}`);
      return saved ? String(JSON.parse(saved).dailyWaterTargetMl || "2500") : "2500";
    } catch {
      return "2500";
    }
  });

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

      let savedLocal: any = {};
      if (user?.id) {
        try {
          const raw = localStorage.getItem(`zebra_profile_${user.id}`);
          if (raw) savedLocal = JSON.parse(raw);
        } catch (e) {}
      }

      setAge(profile.age ? String(profile.age) : savedLocal.age ? String(savedLocal.age) : "");
      setGender(profile.gender || savedLocal.gender || "");
      setBloodType(profile.blood_type || savedLocal.blood_type || savedLocal.bloodType || "");
    }
  }, [profile, user]);

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
      const parsedAge = parseInt(age, 10);
      patch.height_cm = Number.isFinite(parsedH) && parsedH > 0 ? parsedH : null;
      patch.weight_kg = Number.isFinite(parsedW) && parsedW > 0 ? parsedW : null;
      patch.age = Number.isFinite(parsedAge) && parsedAge > 0 ? parsedAge : null;
      patch.gender = gender || null;
      patch.blood_type = bloodType || null;
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

      // Save diet & metabolic settings to localStorage
      try {
        const existing = localStorage.getItem(dietStorageKey);
        const parsed = existing ? JSON.parse(existing) : {};
        localStorage.setItem(
          dietStorageKey,
          JSON.stringify({
            ...parsed,
            activityLevel,
            goal: dietGoal,
            targetWeightKg: parseFloat(targetWeightKg) || (parsedW > 0 ? parsedW : 70),
            weeklyPaceKg: parseFloat(weeklyPaceKg) || 0,
            dailyWaterTargetMl: parseInt(dailyWaterTargetMl, 10) || 2500,
            dietaryPreference,
            foodAllergies,
            dietaryConditions,
            dietaryNotes,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-500/15 text-lime-700 shadow-sm">
            <UserCircle2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-['Manrope']">Account Settings</h1>
              <span className="rounded-full border border-lime-200 bg-lime-50 px-2.5 py-0.5 text-[10px] font-bold text-lime-800 uppercase tracking-wider">
                {profile.role}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
              {profile.role === "patient"
                ? "Manage your personal credentials, height, weight, and clinical connection ID."
                : "Manage your display name, physician credentials, and portal identity preferences."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-slate-700 font-medium shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
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
                <Sparkles className="h-4.5 w-4.5 text-lime-600" />
                <CardTitle className="text-base font-bold text-slate-900">Profile Information</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Update your display name and credentials used across the clinical portal.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                  <Label htmlFor="license" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                    <HeartPulse className="h-4.5 w-4.5 text-lime-600" />
                    <CardTitle className="text-base font-bold text-slate-900">Height & Weight Settings</CardTitle>
                  </div>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Keep your body metrics up to date for precise clinical risk tracking and personalized insights.
                  </CardDescription>
                </div>

                {/* Unit Switcher Button Group */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setUnitSystem("metric")}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      unitSystem === "metric"
                        ? "bg-white text-lime-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Metric (cm / kg)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnitSystem("imperial")}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      unitSystem === "imperial"
                        ? "bg-white text-lime-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Imperial (ft-in / lbs)
                  </button>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* Demographics Row: Age, Gender, Blood Group */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-3.5 rounded-2xl border border-slate-100 bg-slate-50/70">
                  {/* Age Field */}
                  <div className="space-y-1.5">
                    <Label htmlFor="patient_age" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Age
                    </Label>
                    <div className="relative">
                      <Input
                        id="patient_age"
                        type="number"
                        min="1"
                        max="120"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="e.g. 28"
                        className={`${portalInputClass} pr-12`}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                        yrs
                      </span>
                    </div>
                  </div>

                  {/* Gender Select */}
                  <div className="space-y-1.5">
                    <Label htmlFor="patient_gender" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Gender
                    </Label>
                    <select
                      id="patient_gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className={`${portalInputClass} bg-white cursor-pointer`}
                    >
                      <option value="">-- Select Gender --</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  {/* Blood Type Select */}
                  <div className="space-y-1.5">
                    <Label htmlFor="patient_blood" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Blood Group
                    </Label>
                    <select
                      id="patient_blood"
                      value={bloodType}
                      onChange={(e) => setBloodType(e.target.value)}
                      className={`${portalInputClass} bg-white cursor-pointer`}
                    >
                      <option value="">-- Select Blood Group --</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>

                {/* Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Height Field */}
                  <div className="space-y-1.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Ruler className="h-3.5 w-3.5 text-sky-600" />
                        Height
                      </Label>
                      <span className="text-[11px] text-slate-400">
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
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
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
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
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
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                            in
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Weight Field */}
                  <div className="space-y-1.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Scale className="h-3.5 w-3.5 text-emerald-600" />
                        Weight
                      </Label>
                      <span className="text-[11px] text-slate-400">
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
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
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
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                          lbs
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Real-time Calculated BMI Banner */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
                        <Activity className="h-5 w-5 text-lime-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Body Mass Index (BMI)
                          </p>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${bmiCategory.badgeClass}`}
                          >
                            {bmiCategory.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {liveBmi != null
                            ? `Calculated dynamically from your recorded height & weight.`
                            : "Enter both height and weight above to calculate your BMI."}
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <p className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
                        {liveBmi != null ? liveBmi : "—"}
                        <span className="text-xs font-normal text-slate-400 ml-1">kg/m²</span>
                      </p>
                      {healthyWeightRange && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Healthy target:{" "}
                          <span className="text-slate-800 font-semibold">
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
                    <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-1.5">
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>Underweight (&lt;18.5)</span>
                        <span>Normal (18.5–24.9)</span>
                        <span>Overweight (25–29.9)</span>
                        <span>Obese (≥30)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden flex">
                        <div className="h-full bg-amber-400" style={{ width: "25%" }} />
                        <div className="h-full bg-lime-500" style={{ width: "30%" }} />
                        <div className="h-full bg-orange-400" style={{ width: "25%" }} />
                        <div className="h-full bg-rose-500" style={{ width: "20%" }} />
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
                  <Utensils className="h-4.5 w-4.5 text-lime-600" />
                  <CardTitle className="text-base font-bold text-slate-900">Dietary Preferences & Health Conditions</CardTitle>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  Configure your food choices, intolerances, and gastrointestinal conditions to personalize meal plans and clinical alerts.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* 1. Primary Diet Type */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Leaf className="w-3.5 h-3.5 text-lime-600" />
                      Primary Diet Type
                    </Label>
                    <span className="text-[11px] text-slate-400 font-medium">Select 1 option</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {DIET_TYPES.map((dt) => {
                      const isSelected = dietaryPreference === dt.id;
                      return (
                        <button
                          key={dt.id}
                          type="button"
                          onClick={() => setDietaryPreference(dt.id)}
                          className={`flex flex-col text-left p-3 rounded-2xl border transition-all ${
                            isSelected
                              ? "border-lime-400 bg-lime-50 text-lime-950 font-semibold shadow-sm ring-1 ring-lime-400"
                              : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className={`text-xs font-bold ${isSelected ? "text-lime-900" : "text-slate-900"}`}>
                              {dt.label}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-lime-600 shrink-0" />}
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                            {dt.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Food Intolerances & Allergies */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                      Food Allergies & Intolerances
                    </Label>
                    <span className="text-[11px] text-slate-400 font-medium">
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
                              ? "border-amber-400 bg-amber-50 text-amber-900 shadow-sm font-semibold ring-1 ring-amber-400"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${isSelected ? "bg-amber-500" : "bg-slate-300"}`} />
                          {allergy.label}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${isSelected ? "bg-amber-100 text-amber-800 font-bold" : "bg-slate-100 text-slate-500"}`}>
                            {allergy.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Digestive & Health Conditions */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-rose-500" />
                      Digestive & Dietary Health Conditions
                    </Label>
                    <span className="text-[11px] text-slate-400 font-medium">
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
                          className={`flex flex-col text-left p-3 rounded-2xl border transition-all ${
                            isSelected
                              ? "border-rose-400 bg-rose-50 text-rose-900 font-semibold shadow-sm ring-1 ring-rose-400"
                              : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className={`text-xs font-bold ${isSelected ? "text-rose-900" : "text-slate-900"}`}>
                              {cond.label}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                            {cond.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Metabolic Goals & Activity Multiplier */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-lime-600" />
                      Metabolic Targets & Caloric Goals
                    </Label>
                    <span className="text-[11px] text-lime-700 font-semibold">Syncs with Diet Mini-App</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Primary Health Goal */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-700">Primary Metabolic Goal</Label>
                      <select
                        value={dietGoal}
                        onChange={(e) => setDietGoal(e.target.value)}
                        className={`${portalInputClass} text-xs bg-white`}
                      >
                        <option value="fat_loss">Fat Loss & Caloric Deficit (-0.5 kg/wk)</option>
                        <option value="maintain_longevity">Maintenance & Metabolic Longevity</option>
                        <option value="muscle_gain">Lean Muscle Building (+0.25 kg/wk)</option>
                        <option value="blood_sugar_balance">Blood Sugar & Insulin Regulation</option>
                        <option value="heart_cardiovascular">Cardiovascular & Lipid Optimization</option>
                      </select>
                    </div>

                    {/* Activity Level */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-700">Daily Activity Level</Label>
                      <select
                        value={activityLevel}
                        onChange={(e) => setActivityLevel(e.target.value)}
                        className={`${portalInputClass} text-xs bg-white`}
                      >
                        <option value="sedentary">Sedentary (Desk Job, 1.2x TDEE)</option>
                        <option value="light">Lightly Active (1-3 days/wk, 1.375x TDEE)</option>
                        <option value="moderate">Moderately Active (3-5 days/wk, 1.55x TDEE)</option>
                        <option value="very_active">Very Active (6-7 days/wk, 1.725x TDEE)</option>
                        <option value="extra_active">Extremely Active (Athletic, 1.9x TDEE)</option>
                      </select>
                    </div>

                    {/* Target Weight */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-700">Target Goal Weight (kg)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        placeholder="e.g. 68"
                        value={targetWeightKg}
                        onChange={(e) => setTargetWeightKg(e.target.value)}
                        className={`${portalInputClass} text-xs`}
                      />
                    </div>

                    {/* Daily Water Target */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-700">Daily Hydration Target (ml)</Label>
                      <Input
                        type="number"
                        step="250"
                        placeholder="e.g. 2500"
                        value={dailyWaterTargetMl}
                        onChange={(e) => setDailyWaterTargetMl(e.target.value)}
                        className={`${portalInputClass} text-xs`}
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Custom Dietary Notes */}
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <Label htmlFor="dietary_notes" className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Apple className="w-3.5 h-3.5 text-lime-600" />
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
                  <p className="text-[11px] text-slate-400">
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-lime-500/15 text-lime-700">
                    <Dumbbell className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">Physical Activity & Fitness Preferences</CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Customize your weekly training intensity, available equipment, and orthopedic considerations for AI exercise prescriptions.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* 1. Fitness Level */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-lime-600" />
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
                          className={`p-3 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? "bg-lime-50 border-lime-400 text-lime-950 font-semibold shadow-sm ring-1 ring-lime-400"
                              : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${isSelected ? "text-lime-900" : "text-slate-900"}`}>
                              {lvl.label}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-lime-600 shrink-0" />}
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                            {lvl.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Workout Environment */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Dumbbell className="w-3.5 h-3.5 text-emerald-600" />
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
                          className={`p-3 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold shadow-sm ring-1 ring-emerald-400"
                              : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${isSelected ? "text-emerald-900" : "text-slate-900"}`}>
                              {env.label}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                            {env.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Physical Limitations */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
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
                          className={`p-3 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? "bg-amber-50 border-amber-400 text-amber-950 font-semibold shadow-sm ring-1 ring-amber-400"
                              : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${isSelected ? "text-amber-900" : "text-slate-900"}`}>
                              {lim.label}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
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
          <Button type="submit" disabled={saving} className={`w-full h-11 rounded-2xl ${portalPrimaryButtonClass}`}>
            {saving ? "Saving Changes…" : "Save Profile Changes"}
          </Button>
        </form>

        {/* Security & Physician Connection ID Card */}
        <Card className={`${portalPanelClass} p-2`}>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <KeyRound className="h-4.5 w-4.5 text-sky-600" />
              <CardTitle className="text-base font-bold text-slate-900">Security & Connection ID</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              {profile.role === "patient"
                ? "Share this unique Profile ID with your physician to link your records."
                : "Your unique system identification code."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Your Connection Profile ID
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-mono text-slate-800">
                  {user.id}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`${portalSecondaryButtonClass} h-10 px-4 shrink-0 rounded-2xl text-xs`}
                  onClick={() => void copyId()}
                >
                  {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                  {copied ? "Copied" : "Copy ID"}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-200 bg-sky-50">
                  <ShieldCheck className="h-4.5 w-4.5 text-sky-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Portal Identity & Privacy</p>
                  <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
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
