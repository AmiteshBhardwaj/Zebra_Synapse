import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { getSupabase } from "../../lib/supabase";
import { calculateBmi, getBmiCategory } from "../../lib/careRelationships";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Copy,
  Check,
  ShieldCheck,
  UserCircle2,
  Sparkles,
  Ruler,
  Scale,
  Activity,
  HeartPulse,
  Utensils,
  Leaf,
  Flame,
  Apple,
  Save,
  User,
  Shield,
  Clock,
  Info,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

type UnitSystem = "metric" | "imperial";
type SettingsTab = "identity" | "vitals" | "diet";

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
  { id: "peanuts", label: "Peanuts & Tree Nuts", badge: "Nut Free" },
  { id: "shellfish", label: "Shellfish & Crustaceans", badge: "Allergen" },
  { id: "soy", label: "Soy & Soybeans", badge: "Soy Free" },
  { id: "eggs", label: "Eggs", badge: "Egg Free" },
  { id: "sesame", label: "Sesame", badge: "Allergen" },
];

const DIETARY_CONDITIONS = [
  { id: "gerd", label: "GERD / Acid Reflux", desc: "Avoid high-acid, citrus, fried, caffeine & late dinners" },
  { id: "ibs", label: "IBS (Low FODMAP)", desc: "Gentle, soothing digestive nutrition" },
  { id: "diabetes", label: "Diabetes / Low Glycemic", desc: "Complex carbs, high fiber, steady glycemic response" },
  { id: "hypertension", label: "Hypertension / Low Sodium", desc: "DASH diet principles, strictly < 2,000mg sodium daily" },
  { id: "kidney_disease", label: "Renal / Kidney Support", desc: "Monitored potassium, phosphorus & balanced protein" },
  { id: "gout", label: "Gout / Low Purine", desc: "Limit red meat, organ meats, shellfish, alcohol" },
];

export default function ProfileSettings() {
  const { user, profile, refreshProfile, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("identity");

  const [fullName, setFullName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");

  // Metric states (source of truth for saving)
  const [heightCm, setHeightCm] = useState<string>("");
  const [weightKg, setWeightKg] = useState<string>("");

  // Imperial states
  const [heightFt, setHeightFt] = useState<string>("");
  const [heightIn, setHeightIn] = useState<string>("");
  const [weightLbs, setWeightLbs] = useState<string>("");

  // Demographics state
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [bloodType, setBloodType] = useState<string>("");

  // Dietary preferences states
  const [dietaryPreference, setDietaryPreference] = useState<string>("omnivore");
  const [foodAllergies, setFoodAllergies] = useState<string[]>([]);
  const [dietaryConditions, setDietaryConditions] = useState<string[]>([]);
  const [dietaryNotes, setDietaryNotes] = useState<string>("");

  // Diet & Metabolic Goals states
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

  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setLicenseNumber(profile.license_number ?? "");

      let savedLocal: any = {};
      if (user?.id) {
        try {
          const raw = localStorage.getItem(`zebra_profile_${user.id}`);
          if (raw) savedLocal = JSON.parse(raw);
        } catch (e) {}
      }

      const effectiveH = profile.height_cm ?? savedLocal.height_cm;
      if (effectiveH != null && effectiveH > 0) {
        setHeightCm(effectiveH.toString());
        const totalInches = effectiveH / 2.54;
        const ft = Math.floor(totalInches / 12);
        const inch = Math.round((totalInches % 12) * 10) / 10;
        setHeightFt(ft.toString());
        setHeightIn(inch.toString());
      } else {
        setHeightCm("");
        setHeightFt("");
        setHeightIn("");
      }

      const effectiveW = profile.weight_kg ?? savedLocal.weight_kg;
      if (effectiveW != null && effectiveW > 0) {
        setWeightKg(effectiveW.toString());
        const lbs = Math.round(effectiveW * 2.20462 * 10) / 10;
        setWeightLbs(lbs.toString());
      } else {
        setWeightKg("");
        setWeightLbs("");
      }

      setDietaryPreference(profile.dietary_preference || savedLocal.dietary_preference || "omnivore");
      setFoodAllergies(profile.food_allergies || savedLocal.food_allergies || []);
      setDietaryConditions(profile.dietary_conditions || savedLocal.dietary_conditions || []);
      setDietaryNotes(profile.dietary_notes || savedLocal.dietary_notes || "");

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

  const currentHeightNum = parseFloat(heightCm);
  const currentWeightNum = parseFloat(weightKg);

  const liveBmi = useMemo(() => {
    return calculateBmi(currentHeightNum, currentWeightNum);
  }, [currentHeightNum, currentWeightNum]);

  const bmiCategory = useMemo(() => {
    return getBmiCategory(liveBmi);
  }, [liveBmi]);

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
      toast.success("Clinical ID copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

      try {
        const rawExisting = localStorage.getItem(`zebra_profile_${user.id}`);
        const parsedExisting = rawExisting ? JSON.parse(rawExisting) : {};
        localStorage.setItem(
          `zebra_profile_${user.id}`,
          JSON.stringify({
            ...profile,
            ...parsedExisting,
            ...patch,
          })
        );
      } catch (e) {
        console.warn("[settings] local profile backup error:", e);
      }

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
    await refreshProfile();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("All settings saved successfully!");
  };

  if (!profile || !user) {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-[#f6f8f5]">
        <p className="text-sm text-[#A1A1AA]">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-3 sm:p-4 lg:p-5 max-w-[1600px] mx-auto overflow-hidden bg-[#f6f8f5]">
      {/* 1. TOP HEADER BAR */}
      <header className="flex shrink-0 flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-200/80 mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 text-[#0099ff] shadow-sm">
            <UserCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-['Manrope']">
                Account Settings
              </h1>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-[#0284c7] uppercase tracking-wider">
                {profile.role}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-1">
              {profile.role === "patient"
                ? "Manage personal identity, physical vitals, BMI tracking, and nutrition preferences."
                : "Manage clinical credentials, display name, and portal preferences."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => void handleSave()}
            disabled={saving}
            className="h-9 sm:h-10 px-5 rounded-xl sm:rounded-2xl bg-[#00a8ff] hover:bg-[#0095e6] text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-[0_4px_14px_rgba(0,168,255,0.25)] hover:shadow-[0_6px_20px_rgba(0,168,255,0.35)] transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? (
              <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>{saving ? "Saving..." : "Save Settings"}</span>
          </Button>
        </div>
      </header>

      {/* 2. TOP SEGMENTED NAVIGATION TABS (MATCHING APPOINTMENTS BLUE) */}
      <div className="mb-3.5 shrink-0">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/60 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab("identity")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "identity"
                ? "bg-[#00a8ff] text-white shadow-sm shadow-[#00a8ff]/25"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Profile & Identity</span>
          </button>

          {profile.role === "patient" && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab("vitals")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "vitals"
                    ? "bg-[#00a8ff] text-white shadow-sm shadow-[#00a8ff]/25"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                }`}
              >
                <HeartPulse className="h-3.5 w-3.5" />
                <span>Body Metrics & Vitals</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("diet")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "diet"
                    ? "bg-[#00a8ff] text-white shadow-sm shadow-[#00a8ff]/25"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                }`}
              >
                <Utensils className="h-3.5 w-3.5" />
                <span>Diet & Health Preferences</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 3. ACTIVE TAB CONTENT AREA */}
      <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
        {/* TAB 1: PROFILE & IDENTITY */}
        {activeTab === "identity" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left Column: Form Details */}
            <div className="lg:col-span-7 rounded-[26px] bg-white border border-slate-100 p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sparkles className="h-4.5 w-4.5 text-[#0099ff]" />
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-['Manrope']">Personal Identification</h2>
                  <p className="text-xs text-slate-500">Your registered credentials used across Zebra Synapse.</p>
                </div>
              </div>

              <div className="space-y-3.5 max-w-lg">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name" className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Full Legal / Display Name
                  </Label>
                  <Input
                    id="full_name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="h-11 rounded-2xl border-slate-200 text-xs sm:text-sm bg-slate-50/50 focus-visible:ring-[#00a8ff]"
                  />
                </div>

                {profile.role === "doctor" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="license" className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Physician License Number
                    </Label>
                    <Input
                      id="license"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="e.g. MD-948201-CAL"
                      className="h-11 rounded-2xl border-slate-200 text-xs sm:text-sm bg-slate-50/50 focus-visible:ring-[#00a8ff]"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Clinical Linkage & Teleconsultation ID
                  </Label>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-200/80 p-3 text-xs">
                    <div className="truncate pr-2">
                      <p className="text-[10px] font-mono uppercase text-slate-400 font-bold">Secure ID</p>
                      <p className="font-mono text-slate-900 text-xs sm:text-sm font-semibold truncate">{user?.id}</p>
                    </div>
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={copyId}
                      className="h-8 px-3 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold shrink-0"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                      <span>{copied ? "Copied" : "Copy ID"}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Security & Role Summary */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              <div className="rounded-[26px] bg-white border border-slate-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <ShieldCheck className="h-4.5 w-4.5 text-[#0099ff]" />
                  <h3 className="text-sm font-bold text-slate-900 font-['Manrope']">Account & Security Status</h3>
                </div>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-bold text-slate-700">Account Type</span>
                    <span className="capitalize font-bold text-[#0284c7] bg-sky-100 px-2 py-0.5 rounded-md">
                      {profile.role}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-bold text-slate-700">Data Encryption</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <Check className="h-3 w-3" /> AES-256 GCM
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BODY METRICS & VITALS */}
        {activeTab === "vitals" && profile.role === "patient" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left Column: Demographics & Inputs */}
            <div className="lg:col-span-7 rounded-[26px] bg-white border border-slate-100 p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <HeartPulse className="h-4.5 w-4.5 text-[#0099ff]" />
                  <div>
                    <h2 className="text-base font-bold text-slate-900 font-['Manrope']">Demographics & Physical Metrics</h2>
                    <p className="text-xs text-slate-500">Essential measurements for personalized lab insights.</p>
                  </div>
                </div>

                {/* Unit Switcher */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setUnitSystem("metric")}
                    className={`px-2.5 py-1 font-bold rounded-lg transition-all ${
                      unitSystem === "metric" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                    }`}
                  >
                    Metric (cm/kg)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnitSystem("imperial")}
                    className={`px-2.5 py-1 font-bold rounded-lg transition-all ${
                      unitSystem === "imperial" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                    }`}
                  >
                    Imperial (ft/lbs)
                  </button>
                </div>
              </div>

              {/* Demographics row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Age</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="1"
                      max="120"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="28"
                      className="h-10 rounded-xl border-slate-200 text-xs sm:text-sm bg-slate-50/50 pr-10 focus-visible:ring-[#00a8ff]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">yrs</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Gender</Label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50/50 px-2.5 text-slate-800 focus:ring-[#00a8ff]"
                  >
                    <option value="">Select Gender</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Blood Group</Label>
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50/50 px-2.5 text-slate-800 focus:ring-[#00a8ff]"
                  >
                    <option value="">Select Blood Group</option>
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

              {/* Height & Weight Inputs */}
              <div className="grid grid-cols-2 gap-3.5 pt-1">
                <div className="rounded-2xl border border-slate-100 bg-[#f8fafc] p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Ruler className="h-4 w-4 text-[#0099ff]" /> Height
                    </span>
                    <span className="text-slate-400">{unitSystem === "metric" ? "Centimeters" : "Feet & Inches"}</span>
                  </div>

                  {unitSystem === "metric" ? (
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        value={heightCm}
                        onChange={(e) => handleHeightCmChange(e.target.value)}
                        placeholder="175"
                        className="h-10 rounded-xl border-slate-200 text-xs sm:text-sm bg-white pr-10 focus-visible:ring-[#00a8ff]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">cm</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        value={heightFt}
                        onChange={(e) => handleHeightImperialChange(e.target.value, heightIn)}
                        placeholder="5 ft"
                        className="h-10 rounded-xl border-slate-200 text-xs sm:text-sm bg-white focus-visible:ring-[#00a8ff]"
                      />
                      <Input
                        type="number"
                        value={heightIn}
                        onChange={(e) => handleHeightImperialChange(heightFt, e.target.value)}
                        placeholder="9 in"
                        className="h-10 rounded-xl border-slate-200 text-xs sm:text-sm bg-white focus-visible:ring-[#00a8ff]"
                      />
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100 bg-[#f8fafc] p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Scale className="h-4 w-4 text-[#00a8ff]" /> Weight
                    </span>
                    <span className="text-slate-400">{unitSystem === "metric" ? "Kilograms" : "Pounds"}</span>
                  </div>

                  {unitSystem === "metric" ? (
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        value={weightKg}
                        onChange={(e) => handleWeightKgChange(e.target.value)}
                        placeholder="70"
                        className="h-10 rounded-xl border-slate-200 text-xs sm:text-sm bg-white pr-10 focus-visible:ring-[#00a8ff]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">kg</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        value={weightLbs}
                        onChange={(e) => handleWeightLbsChange(e.target.value)}
                        placeholder="154"
                        className="h-10 rounded-xl border-slate-200 text-xs sm:text-sm bg-white pr-10 focus-visible:ring-[#00a8ff]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">lbs</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Dynamic BMI Calculation & Targets */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              <div className="rounded-[26px] bg-white border border-slate-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4.5 w-4.5 text-[#0099ff]" />
                    <h3 className="text-sm font-bold text-slate-900 font-['Manrope']">Body Mass Index (BMI)</h3>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${bmiCategory.badgeClass}`}>
                    {bmiCategory.label}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#f8fafc] border border-slate-100">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Current BMI Score</p>
                    <p className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
                      {liveBmi != null ? liveBmi : "—"}{" "}
                      <span className="text-xs font-normal text-slate-400 font-sans">kg/m²</span>
                    </p>
                  </div>
                  {healthyWeightRange && (
                    <div className="text-right text-xs">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Healthy Weight Range</p>
                      <p className="font-bold text-slate-800 text-xs sm:text-sm">
                        {unitSystem === "metric" ? healthyWeightRange.metric : healthyWeightRange.imperial}
                      </p>
                    </div>
                  )}
                </div>

                {/* BMI Gauge Visual Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Underweight (&lt;18.5)</span>
                    <span>Normal (18.5–24.9)</span>
                    <span>Overweight (25–29.9)</span>
                    <span>Obese (≥30)</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden flex">
                    <div className="h-full bg-amber-400" style={{ width: "25%" }} />
                    <div className="h-full bg-sky-500" style={{ width: "30%" }} />
                    <div className="h-full bg-orange-400" style={{ width: "25%" }} />
                    <div className="h-full bg-rose-500" style={{ width: "20%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DIET & HEALTH PREFERENCES */}
        {activeTab === "diet" && profile.role === "patient" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left Column: Primary Diet Style & Allergies */}
            <div className="lg:col-span-7 rounded-[26px] bg-white border border-slate-100 p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Utensils className="h-4.5 w-4.5 text-[#0099ff]" />
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-['Manrope']">Dietary Structure & Allergies</h2>
                  <p className="text-xs text-slate-500">Used by AI meal planning to construct safe nutrition protocols.</p>
                </div>
              </div>

              {/* 1. Primary Diet Style */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Leaf className="h-3.5 w-3.5 text-[#0099ff]" /> Primary Diet Style
                  </Label>
                  <span className="text-[10px] text-slate-400 font-medium">Select 1 option</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DIET_TYPES.map((dt) => {
                    const isSelected = dietaryPreference === dt.id;
                    return (
                      <button
                        key={dt.id}
                        type="button"
                        onClick={() => setDietaryPreference(dt.id)}
                        className={`h-10 px-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-1.5 transition-all cursor-pointer active:scale-[0.98] ${
                          isSelected
                            ? "bg-gradient-to-r from-[#0099ff] to-[#3b82f6] hover:from-[#0088e6] hover:to-[#2563eb] text-white font-bold shadow-[0_3px_10px_rgba(0,153,255,0.25)] hover:shadow-[0_4px_14px_rgba(0,153,255,0.35)]"
                            : "border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 shadow-xs"
                        }`}
                      >
                        <span className="truncate">{dt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Food Allergies & Intolerances */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Food Allergies & Intolerances
                </Label>
                <div className="flex flex-wrap gap-2">
                  {FOOD_ALLERGIES.map((fa) => {
                    const isSelected = foodAllergies.includes(fa.id);
                    return (
                      <button
                        key={fa.id}
                        type="button"
                        onClick={() => toggleAllergy(fa.id)}
                        className={`h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] ${
                          isSelected
                            ? "border border-rose-200 bg-rose-50/70 text-rose-700 hover:bg-rose-100 font-bold shadow-none"
                            : "border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 shadow-xs"
                        }`}
                      >
                        {isSelected && <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />}
                        <span>{fa.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: GI & Metabolic Considerations & Notes */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              <div className="rounded-[26px] bg-white border border-slate-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-3.5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <Apple className="h-4.5 w-4.5 text-[#0099ff]" />
                  <h3 className="text-sm font-bold text-slate-900 font-['Manrope']">GI & Clinical Considerations</h3>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Clinical Dietary Focus
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {DIETARY_CONDITIONS.map((dc) => {
                      const isSelected = dietaryConditions.includes(dc.id);
                      return (
                        <button
                          key={dc.id}
                          type="button"
                          onClick={() => toggleCondition(dc.id)}
                          className={`h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] ${
                            isSelected
                              ? "bg-gradient-to-r from-[#0099ff] to-[#3b82f6] hover:from-[#0088e6] hover:to-[#2563eb] text-white font-bold shadow-[0_3px_10px_rgba(0,153,255,0.25)] hover:shadow-[0_4px_14px_rgba(0,153,255,0.35)]"
                              : "border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 shadow-xs"
                          }`}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5 text-white shrink-0" />}
                          <span>{dc.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Additional Dietary & Prep Notes
                  </Label>
                  <Input
                    value={dietaryNotes}
                    onChange={(e) => setDietaryNotes(e.target.value)}
                    placeholder="e.g. Prefer dinner before 8 PM, high protein..."
                    className="h-10 rounded-xl border-slate-200 text-xs bg-slate-50/50 focus-visible:ring-[#00a8ff]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
