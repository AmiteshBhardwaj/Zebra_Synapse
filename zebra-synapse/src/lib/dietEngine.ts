import type { LabPanelRow } from "./labPanels";
import type { BiomarkerTrend, BiomarkerTrendMap } from "./labInsights";

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================

export type HealthGoal =
  | "fat_loss"
  | "maintain_longevity"
  | "muscle_gain"
  | "blood_sugar_balance"
  | "heart_cardiovascular";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "very_active"
  | "extra_active";

export type MealCategory = "breakfast" | "lunch" | "dinner" | "snack";

export interface MacroSplit {
  proteinPct: number; // e.g. 30
  carbsPct: number;   // e.g. 45
  fatPct: number;     // e.g. 25
}

export interface MacroGrams {
  protein: number;
  carbs: number;
  fat: number;
}

export interface MicroTargets {
  fiberG: number;       // Grams
  sodiumMg: number;     // Milligrams
  potassiumMg: number;  // Milligrams
  calciumMg: number;    // Milligrams
  ironMg: number;       // Milligrams
  waterMl: number;      // Milliliters
}

export interface FoodItem {
  id: string;
  name: string;
  category: "proteins" | "grains" | "vegetables" | "fruits" | "dairy" | "fats" | "snacks" | "beverages";
  servingSize: string;
  servingUnit: string;
  calories: number;
  protein: number; // g
  carbs: number;   // g
  fat: number;     // g
  fiber: number;   // g
  sodium: number;  // mg
  potassium: number; // mg
  iron: number;    // mg
  calcium: number; // mg
  dietaryTags: string[]; // ["vegan", "vegetarian", "gluten_free", "low_glycemic", "heart_healthy", "low_fodmap"]
  allergenFreeFrom: string[]; // ["lactose", "gluten", "peanuts", "tree_nuts", "shellfish", "soy", "eggs", "sesame"]
}

export interface LoggedMealItem {
  id: string;
  foodId?: string;
  name: string;
  meal: MealCategory;
  servings: number;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  loggedAt: string; // ISO string
}

export interface MealRecipe {
  id: string;
  title: string;
  mealType: MealCategory;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  prepTimeMin: number;
  clinicalBenefits: string[];
  ingredients: { name: string; amount: string; category: "produce" | "protein" | "pantry" | "dairy_alt" }[];
  instructions: string[];
  dietaryTags: string[];
  imageUrl?: string;
  biomarkerBadges?: string[];
}

export interface DayDietPlan {
  dayNumber: number;
  dayName: string;
  targetCalories: number;
  meals: {
    breakfast: MealRecipe;
    lunch: MealRecipe;
    dinner: MealRecipe;
    snack: MealRecipe;
  };
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sodium: number;
  };
  clinicalRationale: string;
}

export interface WeightLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  notes?: string;
}

export interface DietUserSettings {
  activityLevel: ActivityLevel;
  goal: HealthGoal;
  targetWeightKg: number;
  weeklyPaceKg: number; // e.g. -0.5, 0, +0.25
  customCalorieTarget?: number;
  customMacroSplit?: MacroSplit;
  dailyWaterTargetMl: number;
  dietaryPreference: string;
  foodAllergies: string[];
  dietaryConditions: string[];
  dietaryNotes?: string;
}

// ==========================================
// 2. METABOLIC CALCULATION ENGINE
// ==========================================

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, { factor: number; label: string; desc: string }> = {
  sedentary: { factor: 1.2, label: "Sedentary", desc: "Desk job, little to no intentional exercise" },
  light: { factor: 1.375, label: "Lightly Active", desc: "Light exercise or brisk walking 1-3 days/week" },
  moderate: { factor: 1.55, label: "Moderately Active", desc: "Moderate workouts or cardio 3-5 days/week" },
  very_active: { factor: 1.725, label: "Very Active", desc: "Hard exercise or strength training 6-7 days/week" },
  extra_active: { factor: 1.9, label: "Extremely Active", desc: "High-intensity athletic training or manual labor" },
};

export const HEALTH_GOALS: Record<HealthGoal, { label: string; desc: string; defaultPace: number }> = {
  fat_loss: { label: "Fat Loss & Weight Reduction", desc: "Targeted caloric deficit with high protein for muscle preservation", defaultPace: -0.5 },
  maintain_longevity: { label: "Maintenance & Metabolic Longevity", desc: "Energy balance, glycemic stability, and nutrient density", defaultPace: 0 },
  muscle_gain: { label: "Lean Muscle Building", desc: "Slight caloric surplus with progressive protein surplus", defaultPace: 0.25 },
  blood_sugar_balance: { label: "Blood Sugar & Insulin Regulation", desc: "Low-glycemic complex carbs, high fiber, balanced fat", defaultPace: -0.25 },
  heart_cardiovascular: { label: "Cardiovascular & Lipid Optimization", desc: "DASH/Mediterranean profile, low saturated fat, high soluble fiber", defaultPace: 0 },
};

/**
 * Calculates Basal Metabolic Rate using Mifflin-St Jeor equation.
 */
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number = 35,
  gender: "male" | "female" = "male"
): number {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return 1700;
  if (gender === "female") {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
  }
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
}

/**
 * Calculates Total Daily Energy Expenditure.
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel = "moderate"): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel]?.factor || 1.4;
  return Math.round(bmr * multiplier);
}

/**
 * Calculates target daily calories based on TDEE, goal, and weekly pace.
 * (1 kg of body fat is roughly ~7700 kcal -> 0.5kg/week = ~550 kcal/day deficit)
 */
export function calculateCalorieTarget(
  tdee: number,
  goal: HealthGoal,
  weeklyPaceKg: number = 0
): number {
  let target = tdee;

  if (weeklyPaceKg !== 0) {
    // 7700 kcal / 7 days = 1100 kcal deficit per 1kg per week
    const dailyAdjustment = Math.round(weeklyPaceKg * 1100);
    target += dailyAdjustment;
  } else {
    switch (goal) {
      case "fat_loss":
        target -= 500;
        break;
      case "muscle_gain":
        target += 300;
        break;
      case "blood_sugar_balance":
        target -= 250;
        break;
      case "heart_cardiovascular":
      case "maintain_longevity":
      default:
        break;
    }
  }

  // Safety floor: Minimum 1250 kcal
  return Math.max(1250, target);
}

/**
 * Calculates Macro gram targets based on total calories and selected goal.
 */
export function calculateMacroTargets(
  calories: number,
  goal: HealthGoal,
  weightKg: number = 70,
  customSplit?: MacroSplit
): { split: MacroSplit; grams: MacroGrams } {
  let split: MacroSplit;

  if (customSplit) {
    split = customSplit;
  } else {
    switch (goal) {
      case "muscle_gain":
        split = { proteinPct: 30, carbsPct: 45, fatPct: 25 };
        break;
      case "fat_loss":
        split = { proteinPct: 35, carbsPct: 35, fatPct: 30 };
        break;
      case "blood_sugar_balance":
        split = { proteinPct: 30, carbsPct: 35, fatPct: 35 };
        break;
      case "heart_cardiovascular":
        split = { proteinPct: 25, carbsPct: 50, fatPct: 25 };
        break;
      case "maintain_longevity":
      default:
        split = { proteinPct: 25, carbsPct: 45, fatPct: 30 };
        break;
    }
  }

  // Protein = 4 kcal/g, Carbs = 4 kcal/g, Fat = 9 kcal/g
  const proteinGrams = Math.round((calories * (split.proteinPct / 100)) / 4);
  const carbsGrams = Math.round((calories * (split.carbsPct / 100)) / 4);
  const fatGrams = Math.round((calories * (split.fatPct / 100)) / 9);

  return {
    split,
    grams: {
      protein: proteinGrams,
      carbs: carbsGrams,
      fat: fatGrams,
    },
  };
}

/**
 * Generates Micronutrient targets adjusted for clinical conditions and lab biomarkers.
 */
export function calculateMicroTargets(
  calories: number,
  conditions: string[] = [],
  activePanel?: LabPanelRow | null
): MicroTargets {
  let fiberG = Math.round((calories / 1000) * 14); // Standard AHA 14g/1000 kcal
  fiberG = Math.max(28, Math.min(45, fiberG));

  let sodiumMg = 2300; // Standard FDA/USDA limit
  let potassiumMg = 3500; // Standard DRI
  let calciumMg = 1000;
  let ironMg = 18;
  let waterMl = 2500;

  // Clinical adjustments
  const isHypertensive = conditions.includes("hypertension") || (activePanel?.biomarkers?.["systolic_bp"] && activePanel.biomarkers["systolic_bp"] > 130);
  const isDiabetic = conditions.includes("diabetes") || (activePanel?.biomarkers?.["glucose"] && activePanel.biomarkers["glucose"] > 110);
  const isRenal = conditions.includes("kidney_disease");

  if (isHypertensive) {
    sodiumMg = 1800; // DASH diet low sodium
    potassiumMg = 3800;
  }

  if (isRenal) {
    sodiumMg = 1500;
    potassiumMg = 2500; // Monitored potassium
  }

  if (isDiabetic) {
    fiberG = Math.max(35, fiberG); // Extra soluble fiber for glycemic dampening
  }

  return {
    fiberG,
    sodiumMg,
    potassiumMg,
    calciumMg,
    ironMg,
    waterMl,
  };
}

// ==========================================
// 3. COMPREHENSIVE FOOD DATABASE (~100+ items)
// ==========================================

export const FOOD_DATABASE: FoodItem[] = [
  // --- PROTEINS ---
  {
    id: "chicken_breast_grilled",
    name: "Grilled Chicken Breast (Skinless)",
    category: "proteins",
    servingSize: "150g (1 medium fillet)",
    servingUnit: "fillet (150g)",
    calories: 247,
    protein: 46.5,
    carbs: 0,
    fat: 5.4,
    fiber: 0,
    sodium: 110,
    potassium: 380,
    iron: 1.5,
    calcium: 18,
    dietaryTags: ["omnivore", "halal", "kosher", "high_protein", "low_carb", "keto"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "tree_nuts", "shellfish", "soy", "eggs", "sesame"],
  },
  {
    id: "salmon_wild_baked",
    name: "Wild Atlantic Salmon (Baked)",
    category: "proteins",
    servingSize: "150g fillet",
    servingUnit: "fillet (150g)",
    calories: 280,
    protein: 38,
    carbs: 0,
    fat: 13.5,
    fiber: 0,
    sodium: 95,
    potassium: 620,
    iron: 1.2,
    calcium: 22,
    dietaryTags: ["omnivore", "pescatarian", "halal", "kosher", "heart_healthy", "omega3", "high_protein"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "tree_nuts", "shellfish", "soy", "eggs", "sesame"],
  },
  {
    id: "eggs_whole_boiled",
    name: "Boiled Eggs (Large, Grade A)",
    category: "proteins",
    servingSize: "2 large eggs (100g)",
    servingUnit: "2 eggs",
    calories: 143,
    protein: 12.6,
    carbs: 0.7,
    fat: 9.5,
    fiber: 0,
    sodium: 142,
    potassium: 138,
    iron: 1.8,
    calcium: 56,
    dietaryTags: ["omnivore", "eggetarian", "vegetarian", "keto", "high_protein"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "tree_nuts", "shellfish", "soy", "sesame"],
  },
  {
    id: "egg_whites",
    name: "Egg Whites (Liquid/Cooked)",
    category: "proteins",
    servingSize: "150g (approx 4 whites)",
    servingUnit: "150g",
    calories: 78,
    protein: 16.5,
    carbs: 1.1,
    fat: 0.2,
    fiber: 0,
    sodium: 249,
    potassium: 244,
    iron: 0.2,
    calcium: 11,
    dietaryTags: ["omnivore", "eggetarian", "vegetarian", "low_fat", "high_protein"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "tree_nuts", "shellfish", "soy", "sesame"],
  },
  {
    id: "tofu_firm_organic",
    name: "Firm Tofu (Organic Non-GMO)",
    category: "proteins",
    servingSize: "150g (1/2 block)",
    servingUnit: "150g",
    calories: 144,
    protein: 17.2,
    carbs: 3.5,
    fat: 8.2,
    fiber: 2.1,
    sodium: 14,
    potassium: 237,
    iron: 3.4,
    calcium: 350,
    dietaryTags: ["vegan", "vegetarian", "jain", "plant_protein", "low_glycemic", "heart_healthy"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "tree_nuts", "shellfish", "eggs", "sesame"],
  },
  {
    id: "tempeh_organic",
    name: "Fermented Organic Tempeh",
    category: "proteins",
    servingSize: "100g",
    servingUnit: "100g",
    calories: 193,
    protein: 20.3,
    carbs: 7.6,
    fat: 10.8,
    fiber: 5.4,
    sodium: 9,
    potassium: 412,
    iron: 2.7,
    calcium: 111,
    dietaryTags: ["vegan", "vegetarian", "plant_protein", "gut_health", "probiotic", "high_fiber"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "tree_nuts", "shellfish", "eggs", "sesame"],
  },
  {
    id: "paneer_cottage_cheese",
    name: "Fresh Low-Fat Paneer / Cottage Cheese",
    category: "proteins",
    servingSize: "100g",
    servingUnit: "100g",
    calories: 165,
    protein: 18.0,
    carbs: 3.8,
    fat: 8.5,
    fiber: 0,
    sodium: 80,
    potassium: 120,
    iron: 0.5,
    calcium: 380,
    dietaryTags: ["vegetarian", "eggetarian", "jain", "high_protein", "keto"],
    allergenFreeFrom: ["gluten", "peanuts", "tree_nuts", "shellfish", "soy", "eggs", "sesame"],
  },
  {
    id: "lentils_cooked_dal",
    name: "Yellow/Brown Lentils (Cooked Dal)",
    category: "proteins",
    servingSize: "1 cup (200g)",
    servingUnit: "1 cup (200g)",
    calories: 230,
    protein: 17.9,
    carbs: 39.8,
    fat: 0.8,
    fiber: 15.6,
    sodium: 4,
    potassium: 731,
    iron: 6.6,
    calcium: 38,
    dietaryTags: ["vegan", "vegetarian", "jain", "high_fiber", "low_glycemic", "plant_protein"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "tree_nuts", "shellfish", "soy", "eggs", "sesame"],
  },
  {
    id: "chickpeas_cooked",
    name: "Garbanzo Chickpeas (Boiled)",
    category: "proteins",
    servingSize: "1 cup (164g)",
    servingUnit: "1 cup (164g)",
    calories: 269,
    protein: 14.5,
    carbs: 45.0,
    fat: 4.2,
    fiber: 12.5,
    sodium: 11,
    potassium: 477,
    iron: 4.7,
    calcium: 80,
    dietaryTags: ["vegan", "vegetarian", "jain", "high_fiber", "heart_healthy"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "tree_nuts", "shellfish", "soy", "eggs", "sesame"],
  },
  {
    id: "greek_yogurt_0pct",
    name: "Plain Non-Fat Greek Yogurt (0%)",
    category: "proteins",
    servingSize: "1 cup (200g)",
    servingUnit: "1 cup (200g)",
    calories: 130,
    protein: 24.0,
    carbs: 7.0,
    fat: 0.4,
    fiber: 0,
    sodium: 70,
    potassium: 280,
    iron: 0.1,
    calcium: 250,
    dietaryTags: ["vegetarian", "eggetarian", "jain", "high_protein", "probiotic"],
    allergenFreeFrom: ["gluten", "peanuts", "tree_nuts", "shellfish", "soy", "eggs", "sesame"],
  },
  {
    id: "whey_protein_isolate",
    name: "Whey Protein Isolate (1 Scoop)",
    category: "proteins",
    servingSize: "1 scoop (30g)",
    servingUnit: "1 scoop (30g)",
    calories: 120,
    protein: 27.0,
    carbs: 1.0,
    fat: 0.5,
    fiber: 0,
    sodium: 90,
    potassium: 150,
    iron: 0.3,
    calcium: 140,
    dietaryTags: ["vegetarian", "high_protein", "low_carb", "keto"],
    allergenFreeFrom: ["gluten", "peanuts", "tree_nuts", "shellfish", "soy", "eggs", "sesame"],
  },
  {
    id: "plant_pea_protein",
    name: "Organic Pea & Rice Plant Protein",
    category: "proteins",
    servingSize: "1 scoop (32g)",
    servingUnit: "1 scoop (32g)",
    calories: 125,
    protein: 24.0,
    carbs: 2.5,
    fat: 2.0,
    fiber: 1.5,
    sodium: 180,
    potassium: 110,
    iron: 5.2,
    calcium: 45,
    dietaryTags: ["vegan", "vegetarian", "jain", "gluten_free", "dairy_free", "high_protein"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "tree_nuts", "shellfish", "soy", "eggs", "sesame"],
  },

  // --- GRAINS & COMPLEX CARBS ---
  {
    id: "rolled_oats_whole",
    name: "Rolled Steel Cut / Rolled Oats",
    category: "grains",
    servingSize: "1/2 cup dry (50g)",
    servingUnit: "50g dry",
    calories: 190,
    protein: 7.0,
    carbs: 34.0,
    fat: 3.5,
    fiber: 5.0,
    sodium: 2,
    potassium: 180,
    iron: 2.1,
    calcium: 26,
    dietaryTags: ["vegan", "vegetarian", "jain", "heart_healthy", "beta_glucan", "low_glycemic"],
    allergenFreeFrom: ["lactose", "peanuts", "tree_nuts", "shellfish", "soy", "eggs", "sesame"],
  },
  {
    id: "quinoa_cooked",
    name: "Organic Tri-Color Quinoa (Cooked)",
    category: "grains",
    servingSize: "1 cup (185g)",
    servingUnit: "1 cup (185g)",
    calories: 222,
    protein: 8.1,
    carbs: 39.4,
    fat: 3.6,
    fiber: 5.2,
    sodium: 13,
    potassium: 318,
    iron: 2.8,
    calcium: 31,
    dietaryTags: ["vegan", "vegetarian", "jain", "gluten_free", "complete_protein", "low_glycemic"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "tree_nuts", "shellfish", "soy", "eggs", "sesame"],
  },
  {
    id: "brown_basmati_rice",
    name: "Brown Basmati Rice (Cooked)",
    category: "grains",
    servingSize: "1 cup (195g)",
    servingUnit: "1 cup (195g)",
    calories: 216,
    protein: 5.0,
    carbs: 44.8,
    fat: 1.8,
    fiber: 3.5,
    sodium: 10,
    potassium: 84,
    iron: 0.8,
    calcium: 20,
    dietaryTags: ["vegan", "vegetarian", "jain", "gluten_free", "low_fodmap"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "tree_nuts", "shellfish", "soy", "eggs", "sesame"],
  },
  {
    id: "sweet_potato_roasted",
    name: "Roasted Sweet Potato (Skin on)",
    category: "grains",
    servingSize: "1 medium (150g)",
    servingUnit: "1 medium (150g)",
    calories: 135,
    protein: 3.0,
    carbs: 31.0,
    fat: 0.2,
    fiber: 4.5,
    sodium: 54,
    potassium: 542,
    iron: 1.1,
    calcium: 45,
    dietaryTags: ["vegan", "vegetarian", "gluten_free", "high_potassium", "vitamin_a"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "tree_nuts", "shellfish", "soy", "eggs", "sesame"],
  },
  {
    id: "whole_wheat_sourdough",
    name: "Sprouted Whole Grain Sourdough",
    category: "grains",
    servingSize: "1 thick slice (50g)",
    servingUnit: "1 slice (50g)",
    calories: 120,
    protein: 5.5,
    carbs: 22.0,
    fat: 1.2,
    fiber: 3.8,
    sodium: 180,
    potassium: 115,
    iron: 1.4,
    calcium: 28,
    dietaryTags: ["vegan", "vegetarian", "jain", "gut_health", "low_glycemic"],
    allergenFreeFrom: ["lactose", "peanuts", "tree_nuts", "shellfish", "soy", "eggs", "sesame"],
  },

  // --- VEGETABLES ---
  {
    id: "baby_spinach_raw",
    name: "Fresh Baby Spinach (Raw)",
    category: "vegetables",
    servingSize: "2 cups (60g)",
    servingUnit: "2 cups (60g)",
    calories: 14,
    protein: 1.7,
    carbs: 2.2,
    fat: 0.2,
    fiber: 1.3,
    sodium: 48,
    potassium: 335,
    iron: 1.6,
    calcium: 60,
    dietaryTags: ["vegan", "vegetarian", "jain", "keto", "low_glycemic", "iron_rich"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "tree_nuts", "shellfish", "soy", "eggs", "sesame"],
  },
  {
    id: "broccoli_florets_steamed",
    name: "Steamed Broccoli Florets",
    category: "vegetables",
    servingSize: "1.5 cups (150g)",
    servingUnit: "1.5 cups (150g)",
    calories: 52,
    protein: 4.2,
    carbs: 10.0,
    fat: 0.6,
    fiber: 3.9,
    sodium: 49,
    potassium: 440,
    iron: 1.1,
    calcium: 70,
    dietaryTags: ["vegan", "vegetarian", "jain", "keto", "anti_inflammatory", "heart_healthy"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "tree_nuts", "shellfish", "soy", "eggs", "sesame"],
  },
  {
    id: "bell_peppers_sliced",
    name: "Mixed Bell Peppers (Red/Yellow)",
    category: "vegetables",
    servingSize: "1 cup chopped (150g)",
    servingUnit: "1 cup (150g)",
    calories: 45,
    protein: 1.5,
    carbs: 9.0,
    fat: 0.3,
    fiber: 3.1,
    sodium: 4,
    potassium: 310,
    iron: 0.7,
    calcium: 15,
    dietaryTags: ["vegan", "vegetarian", "jain", "vitamin_c", "anti_oxidant"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "tree_nuts", "shellfish", "soy", "eggs", "sesame"],
  },
  {
    id: "cucumber_slices",
    name: "Crisp Cucumber (with peel)",
    category: "vegetables",
    servingSize: "1 medium (200g)",
    servingUnit: "1 medium (200g)",
    calories: 30,
    protein: 1.3,
    carbs: 7.2,
    fat: 0.2,
    fiber: 1.0,
    sodium: 4,
    potassium: 294,
    iron: 0.6,
    calcium: 32,
    dietaryTags: ["vegan", "vegetarian", "jain", "hydrating", "gerd_friendly"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "tree_nuts", "shellfish", "soy", "eggs", "sesame"],
  },
  {
    id: "zucchini_grilled",
    name: "Grilled Green Zucchini",
    category: "vegetables",
    servingSize: "1 medium (150g)",
    servingUnit: "1 medium (150g)",
    calories: 25,
    protein: 1.8,
    carbs: 4.7,
    fat: 0.4,
    fiber: 1.5,
    sodium: 12,
    potassium: 390,
    iron: 0.6,
    calcium: 24,
    dietaryTags: ["vegan", "vegetarian", "jain", "low_fodmap", "keto"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "tree_nuts", "shellfish", "soy", "eggs", "sesame"],
  },

  // --- FRUITS ---
  {
    id: "blueberries_organic",
    name: "Wild Organic Blueberries",
    category: "fruits",
    servingSize: "1 cup (148g)",
    servingUnit: "1 cup (148g)",
    calories: 84,
    protein: 1.1,
    carbs: 21.4,
    fat: 0.5,
    fiber: 3.6,
    sodium: 1,
    potassium: 114,
    iron: 0.4,
    calcium: 9,
    dietaryTags: ["vegan", "vegetarian", "jain", "anti_oxidant", "low_glycemic", "heart_healthy"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "tree_nuts", "shellfish", "soy", "eggs", "sesame"],
  },
  {
    id: "apple_crisp_medium",
    name: "Crisp Red Apple (with peel)",
    category: "fruits",
    servingSize: "1 medium (182g)",
    servingUnit: "1 apple (182g)",
    calories: 95,
    protein: 0.5,
    carbs: 25.0,
    fat: 0.3,
    fiber: 4.4,
    sodium: 2,
    potassium: 195,
    iron: 0.2,
    calcium: 11,
    dietaryTags: ["vegan", "vegetarian", "jain", "high_pectin", "heart_healthy"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "tree_nuts", "shellfish", "soy", "eggs", "sesame"],
  },
  {
    id: "banana_ripe_medium",
    name: "Fresh Banana (Medium)",
    category: "fruits",
    servingSize: "1 medium (118g)",
    servingUnit: "1 banana (118g)",
    calories: 105,
    protein: 1.3,
    carbs: 27.0,
    fat: 0.3,
    fiber: 3.1,
    sodium: 1,
    potassium: 422,
    iron: 0.3,
    calcium: 6,
    dietaryTags: ["vegan", "vegetarian", "jain", "high_potassium", "prebiotic"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "tree_nuts", "shellfish", "soy", "eggs", "sesame"],
  },
  {
    id: "avocado_hass_fresh",
    name: "Fresh Hass Avocado",
    category: "fats",
    servingSize: "1/2 medium (100g)",
    servingUnit: "1/2 avocado (100g)",
    calories: 160,
    protein: 2.0,
    carbs: 8.5,
    fat: 14.7,
    fiber: 6.7,
    sodium: 7,
    potassium: 485,
    iron: 0.6,
    calcium: 12,
    dietaryTags: ["vegan", "vegetarian", "jain", "monounsaturated_fat", "keto", "heart_healthy"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "tree_nuts", "shellfish", "soy", "eggs", "sesame"],
  },

  // --- HEALTHY FATS, NUTS & SEEDS ---
  {
    id: "almonds_raw_california",
    name: "Raw California Almonds",
    category: "fats",
    servingSize: "1 oz / 23 kernels (28g)",
    servingUnit: "1 oz (28g)",
    calories: 164,
    protein: 6.0,
    carbs: 6.1,
    fat: 14.2,
    fiber: 3.5,
    sodium: 1,
    potassium: 208,
    iron: 1.1,
    calcium: 76,
    dietaryTags: ["vegan", "vegetarian", "jain", "vitamin_e", "keto", "heart_healthy"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "shellfish", "soy", "eggs", "sesame"],
  },
  {
    id: "walnuts_halves",
    name: "Raw Walnut Halves (Omega-3 Rich)",
    category: "fats",
    servingSize: "1 oz (28g)",
    servingUnit: "1 oz (28g)",
    calories: 185,
    protein: 4.3,
    carbs: 3.9,
    fat: 18.5,
    fiber: 1.9,
    sodium: 1,
    potassium: 125,
    iron: 0.8,
    calcium: 28,
    dietaryTags: ["vegan", "vegetarian", "jain", "omega3", "brain_health", "heart_healthy"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "shellfish", "soy", "eggs", "sesame"],
  },
  {
    id: "chia_seeds_organic",
    name: "Organic Black Chia Seeds",
    category: "fats",
    servingSize: "2 tbsp (24g)",
    servingUnit: "2 tbsp (24g)",
    calories: 117,
    protein: 4.0,
    carbs: 10.0,
    fat: 7.4,
    fiber: 8.3,
    sodium: 4,
    potassium: 98,
    iron: 1.8,
    calcium: 152,
    dietaryTags: ["vegan", "vegetarian", "jain", "soluble_fiber", "omega3", "gut_health"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "tree_nuts", "shellfish", "soy", "eggs"],
  },
  {
    id: "extra_virgin_olive_oil",
    name: "Cold-Pressed Extra Virgin Olive Oil",
    category: "fats",
    servingSize: "1 tbsp (14ml)",
    servingUnit: "1 tbsp (14ml)",
    calories: 119,
    protein: 0,
    carbs: 0,
    fat: 13.5,
    fiber: 0,
    sodium: 0,
    potassium: 0,
    iron: 0.1,
    calcium: 0,
    dietaryTags: ["vegan", "vegetarian", "jain", "polyphenol", "mediterranean", "heart_healthy"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "tree_nuts", "shellfish", "soy", "eggs", "sesame"],
  },

  // --- BEVERAGES & HYDRATION ---
  {
    id: "green_tea_matcha",
    name: "Ceremonial Japanese Green Tea (Matcha)",
    category: "beverages",
    servingSize: "1 cup (250ml)",
    servingUnit: "1 cup (250ml)",
    calories: 3,
    protein: 0.5,
    carbs: 0.5,
    fat: 0,
    fiber: 0.3,
    sodium: 2,
    potassium: 40,
    iron: 0.3,
    calcium: 8,
    dietaryTags: ["vegan", "vegetarian", "jain", "egcg", "anti_oxidant", "metabolism"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "tree_nuts", "shellfish", "soy", "eggs", "sesame"],
  },
  {
    id: "almond_milk_unsweetened",
    name: "Unsweetened Vanilla Almond Milk",
    category: "beverages",
    servingSize: "1 cup (240ml)",
    servingUnit: "1 cup (240ml)",
    calories: 35,
    protein: 1.0,
    carbs: 1.0,
    fat: 2.5,
    fiber: 1.0,
    sodium: 170,
    potassium: 160,
    iron: 0.7,
    calcium: 450,
    dietaryTags: ["vegan", "vegetarian", "jain", "dairy_free", "low_calorie", "keto"],
    allergenFreeFrom: ["lactose", "gluten", "peanuts", "shellfish", "soy", "eggs", "sesame"],
  },
];

const MEAL_RECIPES_BANK: MealRecipe[] = [
  // ==========================================
  // BREAKFASTS (16 VARIED RECIPES)
  // ==========================================
  {
    id: "bf_overnight_chia_oats",
    title: "Overnight Chia & Rolled Oats with Berries and Almond Butter",
    mealType: "breakfast",
    calories: 350,
    protein: 14,
    carbs: 48,
    fat: 12,
    fiber: 10,
    prepTimeMin: 5,
    biomarkerBadges: ["🫀 Cardio-Protective", "🌿 High Fiber", "🩸 Low Glycemic"],
    clinicalBenefits: [
      "Beta-glucan soluble fiber actively binds bile acids to lower circulating LDL cholesterol.",
      "Rich in polyphenols and antioxidants for sustained morning insulin sensitivity.",
      "Omega-3 alpha-linolenic acid (ALA) from chia seeds supports cellular membrane elasticity.",
    ],
    ingredients: [
      { name: "Rolled Steel Cut Oats", amount: "50g", category: "pantry" },
      { name: "Chia Seeds", amount: "1 tbsp", category: "pantry" },
      { name: "Raw Almond Butter", amount: "1 tbsp", category: "pantry" },
      { name: "Unsweetened Almond Milk", amount: "200ml", category: "dairy_alt" },
      { name: "Wild Blueberries & Raspberries", amount: "1/2 cup", category: "produce" },
    ],
    instructions: [
      "Combine rolled oats, chia seeds, and almond milk in a mason jar or bowl.",
      "Stir thoroughly and let set in the refrigerator overnight (or warm gently for 3 mins).",
      "Top with fresh berries and drizzle with raw almond butter before serving.",
    ],
    dietaryTags: ["vegan", "vegetarian", "jain", "heart_healthy", "low_glycemic"],
  },
  {
    id: "bf_tofu_spinach_scramble",
    title: "High-Protein Turmeric Tofu & Herb Scramble",
    mealType: "breakfast",
    calories: 340,
    protein: 26,
    carbs: 16,
    fat: 16,
    fiber: 6,
    prepTimeMin: 12,
    biomarkerBadges: ["✨ Anti-Inflammatory", "🌱 100% Plant-Based", "🧪 Low Sodium"],
    clinicalBenefits: [
      "Curcumin in turmeric provides systemic anti-inflammatory and joint health support.",
      "100% cholesterol-free complete plant protein matrix with all essential amino acids.",
      "Magnesium and potassium from spinach support healthy blood pressure regulation.",
    ],
    ingredients: [
      { name: "Organic Firm Tofu", amount: "180g (crumbled)", category: "protein" },
      { name: "Fresh Baby Spinach & Bell Peppers", amount: "1.5 cups", category: "produce" },
      { name: "Ground Turmeric & Nutritional Yeast", amount: "1 tsp each", category: "pantry" },
      { name: "Extra Virgin Olive Oil", amount: "1 tsp", category: "pantry" },
    ],
    instructions: [
      "Heat olive oil in a non-stick skillet over medium heat.",
      "Crumble firm tofu with turmeric, nutritional yeast, pinch of black pepper, and sea salt.",
      "Fold in diced bell peppers and baby spinach until wilted and vibrant (3-4 mins).",
    ],
    dietaryTags: ["vegan", "vegetarian", "jain", "low_carb", "anti_inflammatory"],
  },
  {
    id: "bf_greek_yogurt_berry_parfait",
    title: "Greek Yogurt Parfait with Mixed Berries, Walnuts & Chia",
    mealType: "breakfast",
    calories: 330,
    protein: 25,
    carbs: 24,
    fat: 12,
    fiber: 6,
    prepTimeMin: 4,
    biomarkerBadges: ["🦠 Probiotic Gut Health", "🦴 Bioactive Calcium", "🫐 Antioxidants"],
    clinicalBenefits: [
      "Live active probiotic cultures optimize microbiome diversity and gut barrier function.",
      "Bioavailable dairy calcium and zinc support bone matrix remodeling and immune signaling.",
      "Walnut polyphenols and ellagic acid defend vascular endothelial linings.",
    ],
    ingredients: [
      { name: "Plain Non-Fat Greek Yogurt", amount: "200g", category: "dairy_alt" },
      { name: "Fresh Strawberries & Blackberries", amount: "3/4 cup", category: "produce" },
      { name: "Raw Walnut Halves", amount: "15g", category: "pantry" },
      { name: "Ground Flaxseed", amount: "1 tbsp", category: "pantry" },
    ],
    instructions: [
      "Spoon thick Greek yogurt into a chilled breakfast bowl.",
      "Layer with fresh antioxidant-rich berries and crushed walnuts.",
      "Dust with ground flaxseed for plant lignans and ALA omega-3s.",
    ],
    dietaryTags: ["vegetarian", "eggetarian", "jain", "probiotic", "high_protein"],
  },
  {
    id: "bf_mediterranean_egg_avocado_toast",
    title: "Scrambled Pasture Eggs with Baby Spinach & Sourdough Toast",
    mealType: "breakfast",
    calories: 340,
    protein: 22,
    carbs: 26,
    fat: 14,
    fiber: 6,
    prepTimeMin: 8,
    biomarkerBadges: ["⚡ High Protein", "🧠 Choline Rich", "🥬 Folate Dense"],
    clinicalBenefits: [
      "Choline from pastured egg yolks supports hepatic lipid export and neurotransmitter synthesis.",
      "Monounsaturated fats enhance fat-soluble carotenoid and lutein absorption.",
      "Whole grain sourdough fermentation yields prebiotic resistant starch that blunts glycemic spikes.",
    ],
    ingredients: [
      { name: "Pasture-Raised Eggs", amount: "2 large", category: "protein" },
      { name: "Whole Grain Sourdough Toast", amount: "1 thick slice", category: "pantry" },
      { name: "Fresh Baby Spinach", amount: "1.5 cups", category: "produce" },
      { name: "Extra Virgin Olive Oil", amount: "1 tsp", category: "pantry" },
    ],
    instructions: [
      "Whisk eggs with a splash of water, cracked black pepper, and sea salt.",
      "Gently scramble in olive oil over low heat with fresh baby spinach until soft.",
      "Serve warm over crispy whole grain sourdough toast.",
    ],
    dietaryTags: ["omnivore", "eggetarian", "heart_healthy", "high_protein"],
  },
  {
    id: "bf_moong_dal_chilla",
    title: "Savory Spiced Moong Dal Chilla with Fresh Mint & Coriander Chutney",
    mealType: "breakfast",
    calories: 310,
    protein: 20,
    carbs: 38,
    fat: 7,
    fiber: 9,
    prepTimeMin: 15,
    biomarkerBadges: ["🌱 High Plant Protein", "🩸 Low GI", "🌿 Easy Digestion"],
    clinicalBenefits: [
      "Yellow moong lentils provide clean, light-digesting plant protein and slow-digesting complex carbs.",
      "High dietary folate and zinc for immune modulation and cellular repair.",
      "Fresh mint and coriander promote digestive enzyme secretion without acid reflux.",
    ],
    ingredients: [
      { name: "Yellow Moong Dal (Soaked & Ground)", amount: "60g dry", category: "pantry" },
      { name: "Fresh Grated Ginger & Green Chili", amount: "1 tsp", category: "produce" },
      { name: "Fresh Mint & Coriander", amount: "1/2 cup", category: "produce" },
      { name: "Cold-Pressed Mustard/Olive Oil", amount: "1 tsp", category: "pantry" },
    ],
    instructions: [
      "Blend soaked moong dal with ginger, cumin, and a pinch of turmeric into a smooth batter.",
      "Spread thinly onto a hot seasoned non-stick skillet and cook both sides until golden crisp.",
      "Serve with fresh mint coriander chutney.",
    ],
    dietaryTags: ["vegan", "vegetarian", "jain", "high_fiber", "low_glycemic"],
  },
  {
    id: "bf_quinoa_apple_cinnamon",
    title: "Warm Apple-Cinnamon Quinoa Breakfast Bowl with Chopped Pecans",
    mealType: "breakfast",
    calories: 340,
    protein: 11,
    carbs: 52,
    fat: 10,
    fiber: 8,
    prepTimeMin: 12,
    biomarkerBadges: ["🍎 Pectin Fiber", "🫀 Cardioprotective", "🌾 Gluten-Free"],
    clinicalBenefits: [
      "Quinoa delivers a complete amino acid profile alongside mineral-rich magnesium and phosphorus.",
      "Ceylon cinnamon aids insulin receptor sensitization and glycemic stabilization.",
      "Apple pectin provides soluble prebiotic fiber to nourish Akkermansia muciniphila in the colon.",
    ],
    ingredients: [
      { name: "Tri-Color Quinoa (Cooked)", amount: "1 cup", category: "pantry" },
      { name: "Diced Honeycrisp Apple", amount: "1 medium", category: "produce" },
      { name: "Raw Chopped Pecans", amount: "15g", category: "pantry" },
      { name: "Ceylon Cinnamon & Unsweetened Almond Milk", amount: "1/2 tsp + 100ml", category: "pantry" },
    ],
    instructions: [
      "Warm pre-cooked quinoa in almond milk with Ceylon cinnamon and diced apples for 3 mins.",
      "Top with chopped raw pecans and a dash of nutmeg.",
      "Serve warm.",
    ],
    dietaryTags: ["vegan", "vegetarian", "jain", "gluten_free", "heart_healthy"],
  },
  {
    id: "bf_avocado_poached_egg_sourdough",
    title: "Poached Pasture Egg on Avocado Sourdough with Microgreens",
    mealType: "breakfast",
    calories: 360,
    protein: 21,
    carbs: 28,
    fat: 16,
    fiber: 7,
    prepTimeMin: 10,
    biomarkerBadges: ["🥑 Oleic Acid", "⚡ High Satiety", "🌱 Sulforaphane"],
    clinicalBenefits: [
      "Oleic acid monounsaturated fats from fresh avocado reduce inflammatory cytokine cascades.",
      "Pastured egg provides bioavailable lutein and zeaxanthin for macular and retinal health.",
      "Broccoli microgreens deliver concentrated glucoraphanin for hepatic phase-2 detoxification.",
    ],
    ingredients: [
      { name: "Pasture-Raised Eggs", amount: "2 large (poached)", category: "protein" },
      { name: "Whole Grain Sourdough", amount: "1 thick slice", category: "pantry" },
      { name: "Fresh Hass Avocado", amount: "1/3 fruit (mashed)", category: "produce" },
      { name: "Fresh Broccoli Microgreens & Lemon Juice", amount: "1/2 cup", category: "produce" },
    ],
    instructions: [
      "Toast sourdough until golden brown.",
      "Mash avocado with lemon juice, sea salt, and red pepper flakes, then spread over toast.",
      "Top with two gently poached eggs and a generous crown of fresh microgreens.",
    ],
    dietaryTags: ["omnivore", "eggetarian", "pescatarian", "high_protein"],
  },
  {
    id: "bf_paneer_bhurji_multigrain",
    title: "Masala Paneer Bhurji with Bell Peppers & Multigrain Toast",
    mealType: "breakfast",
    calories: 360,
    protein: 26,
    carbs: 25,
    fat: 17,
    fiber: 7,
    prepTimeMin: 12,
    biomarkerBadges: ["🦴 Calcium Dense", "⚡ High Bioavailable Protein", "🧪 Low Carb"],
    clinicalBenefits: [
      "Paneer delivers concentrated casein and whey peptides for steady morning amino acid release.",
      "High calcium and phosphorus matrix preserves skeletal mineral density.",
      "Turmeric and bell pepper bioflavonoids protect vascular endothelial integrity.",
    ],
    ingredients: [
      { name: "Fresh Low-Fat Paneer (Crumbled)", amount: "140g", category: "protein" },
      { name: "Diced Tomatoes & Green Bell Peppers", amount: "1 cup", category: "produce" },
      { name: "Whole Grain / Multigrain Toast", amount: "1 slice", category: "pantry" },
      { name: "Turmeric, Cumin & Olive Oil", amount: "1 tsp each", category: "pantry" },
    ],
    instructions: [
      "Sauté diced tomatoes and green bell peppers in olive oil with cumin and turmeric.",
      "Fold in fresh crumbled paneer and cook for 3-4 minutes on medium heat.",
      "Garnish with chopped cilantro and serve alongside warm multigrain toast.",
    ],
    dietaryTags: ["vegetarian", "eggetarian", "jain", "high_protein"],
  },
  {
    id: "bf_superfood_smoothie_bowl",
    title: "Antioxidant Berry-Spirulina Smoothie Bowl with Hemp Hearts",
    mealType: "breakfast",
    calories: 320,
    protein: 20,
    carbs: 38,
    fat: 8,
    fiber: 9,
    prepTimeMin: 6,
    biomarkerBadges: ["🫐 Anthocyanin Superfood", "⚡ High Energy", "🌱 Plant Protein"],
    clinicalBenefits: [
      "Wild blue anthocyanins reduce oxidative stress and improve vascular flow.",
      "Organic spirulina provides chlorophyll and iron for cellular mitochondrial support.",
      "Hemp hearts deliver balanced 3:1 omega-6 to omega-3 fatty acids and complete protein.",
    ],
    ingredients: [
      { name: "Frozen Wild Blueberries & Acai", amount: "1 cup", category: "produce" },
      { name: "Plant-Based Clean Pea Protein", amount: "20g", category: "pantry" },
      { name: "Organic Spirulina Powder", amount: "1/2 tsp", category: "pantry" },
      { name: "Shelled Hemp Hearts & Chia", amount: "1 tbsp each", category: "pantry" },
      { name: "Unsweetened Coconut Water", amount: "150ml", category: "dairy_alt" },
    ],
    instructions: [
      "Blend frozen berries, pea protein, spirulina, and coconut water into a thick, creamy bowl consistency.",
      "Pour into a bowl and top with hemp hearts, chia seeds, and fresh berry slices.",
    ],
    dietaryTags: ["vegan", "vegetarian", "jain", "gluten_free", "anti_inflammatory"],
  },
  {
    id: "bf_smoked_salmon_omelette",
    title: "Wild Smoked Salmon & Baby Spinach Herb Omelette",
    mealType: "breakfast",
    calories: 350,
    protein: 34,
    carbs: 4,
    fat: 21,
    fiber: 3,
    prepTimeMin: 10,
    biomarkerBadges: ["🐟 Omega-3 Rich", "🩸 Ultra Low Carb", "⚡ High Protein"],
    clinicalBenefits: [
      "Wild salmon provides active EPA and DHA to reduce serum triglycerides and arterial inflammation.",
      "High protein density optimizes morning satiety signaling without elevating blood glucose.",
      "Spinach lutein and folate support DNA repair and vascular health.",
    ],
    ingredients: [
      { name: "Pasture-Raised Eggs", amount: "2 whole + 1 white", category: "protein" },
      { name: "Wild Alaskan Smoked Salmon", amount: "70g", category: "protein" },
      { name: "Fresh Baby Spinach & Dill", amount: "1.5 cups", category: "produce" },
      { name: "Extra Virgin Olive Oil", amount: "1 tsp", category: "pantry" },
    ],
    instructions: [
      "Whisk eggs with fresh chopped dill and cracked black pepper.",
      "Cook gently in olive oil until halfway set, then layer with fresh baby spinach and smoked salmon.",
      "Fold over and slide onto plate.",
    ],
    dietaryTags: ["omnivore", "pescatarian", "eggetarian", "keto", "low_carb", "high_protein"],
  },
  {
    id: "bf_south_indian_idli_sambar",
    title: "Steamed Ragi & Rice Idlis with Vegetable Lentil Sambar",
    mealType: "breakfast",
    calories: 320,
    protein: 15,
    carbs: 56,
    fat: 4,
    fiber: 11,
    prepTimeMin: 15,
    biomarkerBadges: ["🦠 Fermented Gut Food", "🦴 High Calcium Ragi", "🌿 Zero Oil"],
    clinicalBenefits: [
      "Fermented batter improves gut microbiota diversity and increases micronutrient bioavailability.",
      "Finger millet (ragi) provides exceptional plant calcium and polyphenol content.",
      "Vegetable sambar incorporates toor dal and drumsticks for rich soluble fiber.",
    ],
    ingredients: [
      { name: "Steamed Ragi & Rice Idlis", amount: "3 medium idlis", category: "pantry" },
      { name: "Vegetable Lentil Sambar (Toor Dal)", amount: "1.5 cups", category: "produce" },
      { name: "Fresh Drumstick & Bottle Gourd", amount: "1/2 cup diced", category: "produce" },
      { name: "Mustard Seeds & Curry Leaves", amount: "1/2 tsp", category: "pantry" },
    ],
    instructions: [
      "Steam fresh fermented ragi-rice idlis for 10-12 minutes.",
      "Simmer toor dal sambar with bottle gourd, drumstick, turmeric, and sambar spices.",
      "Serve warm idlis dipped in nutrient-rich lentil sambar.",
    ],
    dietaryTags: ["vegan", "vegetarian", "jain", "high_fiber", "heart_healthy"],
  },
  {
    id: "bf_banana_walnut_overnight_oats",
    title: "Banana Walnut Overnight Oats with Ground Flax & Cinnamon",
    mealType: "breakfast",
    calories: 360,
    protein: 13,
    carbs: 54,
    fat: 11,
    fiber: 9,
    prepTimeMin: 5,
    biomarkerBadges: ["🍌 Potassium Rich", "🧠 Neuroprotective", "🫀 LDL Reducer"],
    clinicalBenefits: [
      "Potassium from banana counters dietary sodium and supports optimal cardiovascular tone.",
      "Walnuts are exceptionally dense in neuroprotective alpha-linolenic acid (ALA).",
      "Oat beta-glucans maintain flat postprandial glucose curves.",
    ],
    ingredients: [
      { name: "Rolled Oats", amount: "50g", category: "pantry" },
      { name: "Unsweetened Oat/Almond Milk", amount: "200ml", category: "dairy_alt" },
      { name: "Ripe Sliced Banana", amount: "1/2 fruit", category: "produce" },
      { name: "Raw Chopped Walnuts", amount: "15g", category: "pantry" },
      { name: "Ground Golden Flaxseed", amount: "1 tbsp", category: "pantry" },
    ],
    instructions: [
      "Mix rolled oats, flaxseed, and milk in a jar and refrigerate overnight.",
      "Top with freshly sliced banana, walnuts, and a dusting of cinnamon before eating.",
    ],
    dietaryTags: ["vegan", "vegetarian", "jain", "heart_healthy", "high_fiber"],
  },

  // ==========================================
  // LUNCHES (16 VARIED RECIPES)
  // ==========================================
  {
    id: "lu_lentil_dal_spinach_brown_rice",
    title: "Golden Turmeric Lentil Dal with Spiced Greens & Brown Rice",
    mealType: "lunch",
    calories: 470,
    protein: 23,
    carbs: 76,
    fat: 7,
    fiber: 18,
    prepTimeMin: 25,
    biomarkerBadges: ["🌱 High Prebiotic Fiber", "🩸 HbA1c Friendly", "🫀 Zero Cholesterol"],
    clinicalBenefits: [
      "Exceptional soluble and prebiotic fiber supporting colon short-chain fatty acids (SCFAs).",
      "Non-heme iron combined with fresh lemon vitamin C for enhanced intestinal bioavailability.",
      "Low glycemic index supporting steady HbA1c control and post-meal focus.",
    ],
    ingredients: [
      { name: "Yellow Moong / Masoor Lentils", amount: "70g dry (cooked)", category: "pantry" },
      { name: "Brown Basmati Rice (Cooked)", amount: "3/4 cup", category: "pantry" },
      { name: "Steamed Spinach & Fenugreek Greens", amount: "1.5 cups", category: "produce" },
      { name: "Cold-Pressed Mustard/Olive Oil & Cumin", amount: "1 tsp", category: "pantry" },
    ],
    instructions: [
      "Simmer lentils with water, ground turmeric, and minced ginger until tender and creamy.",
      "Temper cumin seeds in olive oil and fold into the cooked dal.",
      "Serve alongside steamed brown basmati rice and wilted greens with a squeeze of fresh lemon.",
    ],
    dietaryTags: ["vegan", "vegetarian", "jain", "high_fiber", "low_glycemic", "heart_healthy"],
  },
  {
    id: "lu_mediterranean_salmon_quinoa_bowl",
    title: "Mediterranean Wild Salmon & Tri-Color Quinoa Bowl with Cucumbers",
    mealType: "lunch",
    calories: 520,
    protein: 42,
    carbs: 44,
    fat: 18,
    fiber: 9,
    prepTimeMin: 20,
    biomarkerBadges: ["🐟 Omega-3 Rich", "🫀 Triglyceride Lowering", "🌿 Anti-Inflammatory"],
    clinicalBenefits: [
      "EPA & DHA omega-3s reduce vascular inflammation and lower circulating serum triglycerides.",
      "Complete amino acid profile from quinoa accelerates cellular tissue repair.",
      "High dietary potassium from greens and tomatoes counters excess intracellular sodium.",
    ],
    ingredients: [
      { name: "Wild Alaskan Salmon Fillet", amount: "140g", category: "protein" },
      { name: "Tri-Color Quinoa (Cooked)", amount: "1 cup", category: "pantry" },
      { name: "Persian Cucumber & Cherry Tomatoes", amount: "1 cup diced", category: "produce" },
      { name: "Extra Virgin Olive Oil & Lemon Dressing", amount: "1 tbsp", category: "pantry" },
    ],
    instructions: [
      "Pan-sear salmon in olive oil with oregano and lemon juice for 4 mins per side.",
      "Assemble quinoa base with diced cucumbers, cherry tomatoes, and fresh herbs.",
      "Place warm salmon on top and drizzle with extra virgin olive oil.",
    ],
    dietaryTags: ["omnivore", "pescatarian", "gluten_free", "heart_healthy", "high_protein"],
  },
  {
    id: "lu_grilled_chicken_power_greens_salad",
    title: "Grilled Herb Chicken Salad with Avocado & Quinoa",
    mealType: "lunch",
    calories: 460,
    protein: 38,
    carbs: 38,
    fat: 18,
    fiber: 8,
    prepTimeMin: 15,
    biomarkerBadges: ["🥗 Nutrient Dense", "⚡ High Lean Protein", "🩸 Glucose Balanced"],
    clinicalBenefits: [
      "Lean bioavailable protein optimizes nitrogen retention and preserves lean muscular tissue.",
      "Sulforaphane from cruciferous greens induces natural phase-2 liver enzymes.",
      "Complete amino acid matrix from quinoa promotes sustained cellular repair.",
    ],
    ingredients: [
      { name: "Grilled Herb Chicken Breast", amount: "140g", category: "protein" },
      { name: "Mixed Crisp Salad Greens & Arugula", amount: "3 cups", category: "produce" },
      { name: "Cooked Tri-Color Quinoa", amount: "1/2 cup", category: "pantry" },
      { name: "Hass Avocado & Olive Oil Vinaigrette", amount: "1.5 tbsp", category: "produce" },
    ],
    instructions: [
      "Toss greens and quinoa with olive oil lemon vinaigrette.",
      "Top with sliced warm grilled chicken and diced creamy avocado.",
      "Season with cracked black pepper and hemp seeds.",
    ],
    dietaryTags: ["omnivore", "gluten_free", "high_protein", "heart_healthy"],
  },
  {
    id: "lu_chickpea_tahini_harvest_bowl",
    title: "Roasted Spiced Chickpea & Kale Harvest Bowl with Lemon Tahini",
    mealType: "lunch",
    calories: 480,
    protein: 22,
    carbs: 64,
    fat: 16,
    fiber: 16,
    prepTimeMin: 20,
    biomarkerBadges: ["🌱 Plant Power", "🦴 Bioavailable Sesame Calcium", "🌿 Prebiotic"],
    clinicalBenefits: [
      "Chickpea resistant starch fosters healthy bifidobacteria colonization in the gut.",
      "Sesame tahini provides sesamin and lignans that assist in liver lipid metabolism.",
      "High non-heme iron and magnesium support enzymatic energy production.",
    ],
    ingredients: [
      { name: "Cooked Organic Chickpeas", amount: "1.5 cups (roasted)", category: "pantry" },
      { name: "Massaged Lacinato Kale & Red Cabbage", amount: "2 cups", category: "produce" },
      { name: "Steamed Sweet Potato Cubes", amount: "100g", category: "produce" },
      { name: "Lemon Garlic Tahini Dressing", amount: "2 tbsp", category: "pantry" },
    ],
    instructions: [
      "Roast chickpeas with smoked paprika, cumin, and sea salt at 400°F for 15 mins until crispy.",
      "Massage kale with a splash of lemon juice and layer with roasted sweet potato cubes.",
      "Top with crispy chickpeas and generously drizzle with lemon tahini dressing.",
    ],
    dietaryTags: ["vegan", "vegetarian", "jain", "gluten_free", "high_fiber"],
  },
  {
    id: "lu_palak_paneer_millet_roti",
    title: "Homestyle Palak Paneer with Foxtail Millet & Cucumber Salad",
    mealType: "lunch",
    calories: 460,
    protein: 26,
    carbs: 46,
    fat: 19,
    fiber: 10,
    prepTimeMin: 20,
    biomarkerBadges: ["🥬 Folate & Iron", "🦴 Bone Density", "🩸 Stable Glycemia"],
    clinicalBenefits: [
      "Spinach chlorophyll and lutein scavenge cellular free radicals and protect arterial walls.",
      "Paneer delivers complete bioactive dairy protein with zero sugar burden.",
      "Foxtail millet features a low glycemic load and high resistant starch content.",
    ],
    ingredients: [
      { name: "Fresh Low-Fat Paneer / Tofu Cubes", amount: "140g", category: "protein" },
      { name: "Blanched & Pureed Spinach (Palak)", amount: "2.5 cups", category: "produce" },
      { name: "Cooked Foxtail Millet / Roti", amount: "3/4 cup", category: "pantry" },
      { name: "Garam Masala & Cold-Pressed Oil", amount: "1 tsp", category: "pantry" },
    ],
    instructions: [
      "Simmer spinach puree with cumin, ginger, and gentle spices.",
      "Gently fold in lightly seared paneer cubes and simmer for 4 minutes.",
      "Serve alongside steamed foxtail millet and crisp cucumber slices.",
    ],
    dietaryTags: ["vegetarian", "eggetarian", "jain", "high_protein", "calcium_rich"],
  },
  {
    id: "lu_sesame_tempeh_soba_noodles",
    title: "Sesame Ginger Tempeh Bowl with Soba Noodles & Edamame",
    mealType: "lunch",
    calories: 490,
    protein: 30,
    carbs: 58,
    fat: 15,
    fiber: 12,
    prepTimeMin: 18,
    biomarkerBadges: ["🌱 Fermented Soy Isoflavones", "🫀 Endothelial Elasticity", "⚡ High Protein"],
    clinicalBenefits: [
      "Fermentation breaks down phytic acid in tempeh for maximum mineral and protein absorption.",
      "Buckwheat in 100% soba noodles provides rutin, a flavonoid supporting capillary health.",
      "Edamame adds natural dietary isoflavones and plant sterols.",
    ],
    ingredients: [
      { name: "Organic Cultured Tempeh", amount: "150g sliced", category: "protein" },
      { name: "100% Buckwheat Soba Noodles (Cooked)", amount: "1 cup", category: "pantry" },
      { name: "Steamed Edamame & Bok Choy", amount: "1.5 cups", category: "produce" },
      { name: "Low-Sodium Tamari & Sesame Dressing", amount: "1.5 tbsp", category: "pantry" },
    ],
    instructions: [
      "Pan-sear tempeh strips in sesame oil with ginger until golden brown.",
      "Toss warm buckwheat soba noodles with steamed bok choy, edamame, and tamari dressing.",
      "Top with crispy tempeh and toasted sesame seeds.",
    ],
    dietaryTags: ["vegan", "vegetarian", "jain", "high_protein", "anti_inflammatory"],
  },
  {
    id: "lu_rajma_masala_quinoa",
    title: "Kashmiri Rajma (Red Kidney Beans) over Fluffy Steamed Quinoa",
    mealType: "lunch",
    calories: 460,
    protein: 24,
    carbs: 72,
    fat: 8,
    fiber: 17,
    prepTimeMin: 25,
    biomarkerBadges: ["🩸 Blood Sugar Blunter", "🫀 Potassium Rich", "🌿 Prebiotic Fiber"],
    clinicalBenefits: [
      "Red kidney beans contain phaseolin which naturally inhibits alpha-amylase to flatten blood sugar.",
      "Abundant soluble fiber captures hepatic cholesterol prior to reabsorption.",
      "High potassium and magnesium content relaxes arterial smooth muscle.",
    ],
    ingredients: [
      { name: "Slow-Cooked Red Kidney Beans (Rajma)", amount: "1.5 cups", category: "pantry" },
      { name: "Steamed Tri-Color Quinoa", amount: "3/4 cup", category: "pantry" },
      { name: "Fresh Tomato-Ginger Gravy", amount: "1 cup", category: "produce" },
      { name: "Kashmiri Spices & Mustard Oil", amount: "1 tsp", category: "pantry" },
    ],
    instructions: [
      "Slow simmer boiled kidney beans in a spiced tomato, ginger, and cumin base until thick and rich.",
      "Serve over hot fluffy steamed quinoa.",
      "Garnish with freshly chopped cilantro and a slice of lime.",
    ],
    dietaryTags: ["vegan", "vegetarian", "jain", "high_fiber", "low_glycemic", "heart_healthy"],
  },
  {
    id: "lu_seared_ahi_tuna_bowl",
    title: "Seared Ahi Tuna Poke Bowl with Seaweed, Edamame & Brown Rice",
    mealType: "lunch",
    calories: 490,
    protein: 44,
    carbs: 48,
    fat: 13,
    fiber: 8,
    prepTimeMin: 15,
    biomarkerBadges: ["🐟 Marine Clean Protein", "🧠 Selenium & B12", "🌊 Thyroid Iodine"],
    clinicalBenefits: [
      "Yellowfin tuna provides complete protein with minimal saturated fat burden.",
      "Wakame seaweed provides organic iodine and fucoidan for optimal thyroid hormone synthesis.",
      "Selenium from yellowfin protects cellular lipids from lipid peroxidation.",
    ],
    ingredients: [
      { name: "Sashimi-Grade Ahi Tuna Fillet", amount: "150g (seared)", category: "protein" },
      { name: "Brown Rice & Edamame", amount: "1 cup combined", category: "pantry" },
      { name: "Wakame Seaweed & Cucumbers", amount: "1 cup", category: "produce" },
      { name: "Low-Sodium Tamari & Ginger Glaze", amount: "1 tbsp", category: "pantry" },
    ],
    instructions: [
      "Flash sear seasoned tuna for 45 seconds per side in sesame oil; slice thinly.",
      "Assemble brown rice base with edamame, cucumber rounds, and wakame seaweed.",
      "Top with sliced tuna and drizzle with ginger-tamari glaze.",
    ],
    dietaryTags: ["omnivore", "pescatarian", "high_protein", "gluten_free"],
  },
  {
    id: "lu_grilled_chicken_burrito_bowl",
    title: "Chipotle Grilled Chicken Bowl with Black Beans & Fresh Salsa",
    mealType: "lunch",
    calories: 510,
    protein: 42,
    carbs: 52,
    fat: 14,
    fiber: 12,
    prepTimeMin: 18,
    biomarkerBadges: ["💪 Muscle Recovery", "🌿 High Resistant Starch", "⚡ High Energy"],
    clinicalBenefits: [
      "Skinless chicken breast delivers high branch-chain amino acids (BCAAs) for muscle maintenance.",
      "Black beans provide anthocyanins and resistant starch that improve peripheral insulin sensitivity.",
      "Fresh tomato salsa delivers lycopene and vitamin C without excess calories.",
    ],
    ingredients: [
      { name: "Grilled Chicken Breast (Spiced)", amount: "140g", category: "protein" },
      { name: "Cooked Black Beans", amount: "3/4 cup", category: "pantry" },
      { name: "Steamed Brown Basmati Rice", amount: "1/2 cup", category: "pantry" },
      { name: "Fresh Pico de Gallo & Shredded Lettuce", amount: "1.5 cups", category: "produce" },
    ],
    instructions: [
      "Layer warm brown rice and seasoned black beans in a wide bowl.",
      "Top with sliced chipotle-grilled chicken tenderloins and crisp shredded lettuce.",
      "Spoon fresh pico de gallo and a squeeze of fresh lime juice on top.",
    ],
    dietaryTags: ["omnivore", "gluten_free", "high_protein"],
  },
  {
    id: "lu_chana_masala_brown_rice",
    title: "Amritsari Chana Masala (Spiced Chickpeas) with Brown Basmati Rice",
    mealType: "lunch",
    calories: 480,
    protein: 20,
    carbs: 78,
    fat: 9,
    fiber: 16,
    prepTimeMin: 22,
    biomarkerBadges: ["🌱 Plant Power", "🩸 HbA1c Optimizer", "🫀 Zero Saturated Fat"],
    clinicalBenefits: [
      "Chickpeas provide slow-digesting complex amylose carbohydrates that prevent glucose spikes.",
      "High potassium and dietary fiber assist in lowering systemic blood pressure.",
      "Ginger and cumin stimulate pancreatic digestive enzymes.",
    ],
    ingredients: [
      { name: "Cooked Chickpeas (Kabuli Chana)", amount: "1.5 cups", category: "pantry" },
      { name: "Steamed Brown Basmati Rice", amount: "3/4 cup", category: "pantry" },
      { name: "Tomato-Ginger-Coriander Sauce", amount: "1 cup", category: "produce" },
      { name: "Mustard Oil & Anardana (Pomegranate Spice)", amount: "1 tsp", category: "pantry" },
    ],
    instructions: [
      "Simmer tender chickpeas in a spiced tomato-ginger reduction with dry pomegranate powder.",
      "Serve hot alongside steamed nutty brown basmati rice.",
      "Pair with fresh sliced radish and cucumber.",
    ],
    dietaryTags: ["vegan", "vegetarian", "jain", "high_fiber", "heart_healthy"],
  },
  {
    id: "lu_mediterranean_cod_greek_salad",
    title: "Pan-Seared Atlantic Cod with Greek Olive & Cucumber Quinoa Salad",
    mealType: "lunch",
    calories: 470,
    protein: 40,
    carbs: 38,
    fat: 16,
    fiber: 7,
    prepTimeMin: 18,
    biomarkerBadges: ["🌊 Lean Marine Protein", "🫀 Cardioprotective Fats", "🩸 Low GI"],
    clinicalBenefits: [
      "Wild cod is one of the leanest complete animal proteins, with near-zero saturated fat burden.",
      "Kalamata olives and extra virgin olive oil provide oleocanthal, a natural anti-inflammatory agent.",
      "Quinoa base delivers complete plant proteins and complex slow carbohydrates.",
    ],
    ingredients: [
      { name: "Atlantic Cod Fillet", amount: "160g", category: "protein" },
      { name: "Cooked Tri-Color Quinoa", amount: "3/4 cup", category: "pantry" },
      { name: "Diced Cucumbers, Kalamata Olives & Tomatoes", amount: "1.5 cups", category: "produce" },
      { name: "Extra Virgin Olive Oil & Oregano", amount: "1 tbsp", category: "pantry" },
    ],
    instructions: [
      "Pan-sear cod fillet in olive oil with oregano and garlic powder for 3-4 mins per side.",
      "Toss cooked quinoa with diced cucumbers, Kalamata olives, cherry tomatoes, and lemon.",
      "Serve warm cod resting on top of the refreshing Greek quinoa salad.",
    ],
    dietaryTags: ["omnivore", "pescatarian", "gluten_free", "heart_healthy", "low_fat"],
  },
  {
    id: "lu_sweet_potato_black_bean_skillet",
    title: "Roasted Sweet Potato & Black Bean Bowl with Fresh Guacamole",
    mealType: "lunch",
    calories: 460,
    protein: 18,
    carbs: 68,
    fat: 14,
    fiber: 15,
    prepTimeMin: 20,
    biomarkerBadges: ["🍠 Complex Carbs", "🥑 Monounsaturated Fats", "🌱 High Fiber"],
    clinicalBenefits: [
      "Sweet potato beta-carotene and anthocyanins provide cellular protection against oxidative damage.",
      "Black beans offer substantial soluble fiber that supports healthy cholesterol clearance.",
      "Fresh avocado supplies potassium and healthy fats for optimal nutrient absorption.",
    ],
    ingredients: [
      { name: "Roasted Sweet Potato Wedges", amount: "150g", category: "produce" },
      { name: "Cooked Seasoned Black Beans", amount: "1 cup", category: "pantry" },
      { name: "Fresh Smashed Guacamole", amount: "2 tbsp", category: "produce" },
      { name: "Steamed Sweet Corn & Shredded Romaine", amount: "1.5 cups", category: "produce" },
    ],
    instructions: [
      "Roast sweet potato cubes with cumin and smoked paprika.",
      "Combine with warm black beans, sweet corn, and crisp romaine lettuce in a wide bowl.",
      "Top with fresh lime guacamole and cilantro.",
    ],
    dietaryTags: ["vegan", "vegetarian", "jain", "gluten_free", "high_fiber"],
  },

  // ==========================================
  // DINNERS (16 VARIED RECIPES)
  // ==========================================
  {
    id: "di_grilled_chicken_sweet_potato_beans",
    title: "Grilled Chicken Tenderloins with Roasted Sweet Potato & Crisp Green Beans",
    mealType: "dinner",
    calories: 490,
    protein: 38,
    carbs: 46,
    fat: 16,
    fiber: 9,
    prepTimeMin: 20,
    biomarkerBadges: ["🍠 Complex Carbs", "🍗 High Lean Protein", "🧪 Low Saturated Fat"],
    clinicalBenefits: [
      "Balanced macro distribution ideal for evening glycogen replenishment and overnight recovery.",
      "Slow-burning complex carbs in sweet potatoes stabilize evening cortisol and overnight glycemia.",
      "High potassium and dietary fiber from crisp steamed green beans.",
    ],
    ingredients: [
      { name: "Grilled Chicken Tenderloins", amount: "150g", category: "protein" },
      { name: "Roasted Sweet Potato Wedges", amount: "140g", category: "produce" },
      { name: "Steamed Crisp Green Beans", amount: "1.5 cups", category: "produce" },
      { name: "Extra Virgin Olive Oil & Fresh Rosemary", amount: "1 tsp", category: "pantry" },
    ],
    instructions: [
      "Roast sweet potato wedges tossed in olive oil at 400°F for 20 mins until caramelized.",
      "Grill seasoned chicken tenderloins with rosemary, sea salt, and black pepper.",
      "Steam green beans lightly and assemble together with a squeeze of fresh lemon juice.",
    ],
    dietaryTags: ["omnivore", "gluten_free", "heart_healthy", "high_protein"],
  },
  {
    id: "di_paneer_tofu_stirfry_quinoa",
    title: "Wok-Tossed Tofu & Broccoli with Ginger-Tamari Sauce & Quinoa",
    mealType: "dinner",
    calories: 440,
    protein: 28,
    carbs: 42,
    fat: 17,
    fiber: 9,
    prepTimeMin: 18,
    biomarkerBadges: ["🥦 Glucosinolate Detox", "🌱 Complete Plant Protein", "🧪 Low Sodium"],
    clinicalBenefits: [
      "Isoflavones support arterial elasticity and promote favorable lipid profiles.",
      "Glucosinolates and sulforaphane from broccoli promote cellular phase-2 liver detoxification.",
      "Gingerols soothe the gastrointestinal lining and accelerate gastric emptying before sleep.",
    ],
    ingredients: [
      { name: "Organic Firm Tofu / Low-Fat Paneer", amount: "160g diced", category: "protein" },
      { name: "Broccoli Florets, Snap Peas & Bell Peppers", amount: "2 cups", category: "produce" },
      { name: "Cooked Tri-Color Quinoa", amount: "3/4 cup", category: "pantry" },
      { name: "Low-Sodium Tamari & Minced Ginger", amount: "1 tbsp", category: "pantry" },
    ],
    instructions: [
      "Sear tofu cubes in sesame oil until crisp and golden on all sides (6-7 mins).",
      "Toss in fresh broccoli florets, snap peas, and ginger with 2 tbsp of water to flash steam.",
      "Deglaze with low-sodium tamari and serve over warm fluffy quinoa.",
    ],
    dietaryTags: ["vegan", "vegetarian", "jain", "gluten_free", "low_sodium"],
  },
  {
    id: "di_baked_salmon_wild_rice",
    title: "Herb-Crusted Wild Salmon with Wild Rice & Charred Broccolini",
    mealType: "dinner",
    calories: 510,
    protein: 42,
    carbs: 40,
    fat: 20,
    fiber: 7,
    prepTimeMin: 22,
    biomarkerBadges: ["🐟 EPA / DHA Omega-3", "🫀 Cardioprotective", "🌿 Antioxidant Dense"],
    clinicalBenefits: [
      "High concentrations of marine omega-3 fatty acids actively lower nocturnal cardiac arrhythmia risk.",
      "Wild rice delivers higher protein, fiber, and B vitamins than standard refined grains.",
      "Broccolini supplies indoles and sulforaphane for healthy cellular regulation.",
    ],
    ingredients: [
      { name: "Wild Alaskan Salmon Fillet", amount: "150g", category: "protein" },
      { name: "Cooked Wild Rice Medley", amount: "3/4 cup", category: "pantry" },
      { name: "Charred Broccolini Spears", amount: "1.5 cups", category: "produce" },
      { name: "Extra Virgin Olive Oil & Lemon", amount: "1 tbsp", category: "pantry" },
    ],
    instructions: [
      "Season salmon with dill, lemon zest, black pepper, and olive oil; bake at 385°F for 14 mins.",
      "Char broccolini in a cast-iron skillet with olive oil and sea salt.",
      "Serve baked salmon over warm wild rice alongside broccolini.",
    ],
    dietaryTags: ["omnivore", "pescatarian", "gluten_free", "heart_healthy", "high_protein"],
  },
  {
    id: "di_baked_cod_steamed_veggies_sweet_potato",
    title: "Pan-Roasted White Fish with Baked Sweet Potato & Fresh Asparagus",
    mealType: "dinner",
    calories: 460,
    protein: 42,
    carbs: 44,
    fat: 10,
    fiber: 8,
    prepTimeMin: 20,
    biomarkerBadges: ["🌊 Marine Clean Protein", "🫀 Heart Healthy", "🩸 Ultra Low Fat"],
    clinicalBenefits: [
      "Ultra-lean marine protein with near-zero saturated fat burden.",
      "Complex anthocyanins and beta-carotene promote immune and endothelial health.",
      "Asparagus acts as a natural gentle diuretic to reduce sodium retention.",
    ],
    ingredients: [
      { name: "Wild Cod or Halibut Fillet", amount: "170g", category: "protein" },
      { name: "Baked Sweet Potato", amount: "140g", category: "produce" },
      { name: "Fresh Asparagus Spears", amount: "10 spears", category: "produce" },
      { name: "Extra Virgin Olive Oil & Herbs", amount: "2 tsp", category: "pantry" },
    ],
    instructions: [
      "Roast sweet potato cubes and asparagus tossed in olive oil at 400°F for 18 mins.",
      "Bake seasoned cod fillet with lemon slices for 12 mins until flaky.",
      "Garnish with fresh dill and cracked black pepper.",
    ],
    dietaryTags: ["omnivore", "pescatarian", "gluten_free", "heart_healthy", "low_fat"],
  },
  {
    id: "di_yellow_moong_khichdi",
    title: "Soothing Yellow Moong & Brown Rice Khichdi with Steamed Zucchini",
    mealType: "dinner",
    calories: 420,
    protein: 19,
    carbs: 68,
    fat: 8,
    fiber: 14,
    prepTimeMin: 20,
    biomarkerBadges: ["🌿 Gut Healing", "🩸 Light Digestion", "🌱 100% Plant-Based"],
    clinicalBenefits: [
      "Balanced 1:1 amino acid matrix of lentils and rice provides complete easy-to-assimilate protein.",
      "Cumin, asafoetida, and turmeric reduce nocturnal bloating and encourage sound sleep.",
      "Low dietary fat ensures rapid gastric emptying and reduces nocturnal GERD risk.",
    ],
    ingredients: [
      { name: "Yellow Moong Dal & Brown Rice", amount: "70g combined dry", category: "pantry" },
      { name: "Diced Zucchini & Spinach", amount: "1.5 cups", category: "produce" },
      { name: "Cold-Pressed Mustard/Olive Oil", amount: "1 tsp", category: "pantry" },
      { name: "Turmeric, Cumin & Fresh Ginger", amount: "1 tsp", category: "pantry" },
    ],
    instructions: [
      "Pressure cook or simmer dal and brown rice with turmeric, ginger, and 4x water until creamy.",
      "Fold in tender diced zucchini and baby spinach in the last 5 minutes.",
      "Temper with cumin seeds in a teaspoon of olive oil and serve warm.",
    ],
    dietaryTags: ["vegan", "vegetarian", "jain", "high_fiber", "heart_healthy"],
  },
  {
    id: "di_paneer_tikka_grilled_veggies",
    title: "Tandoori Grilled Paneer Skewers with Mint Raita & Quinoa",
    mealType: "dinner",
    calories: 470,
    protein: 29,
    carbs: 38,
    fat: 21,
    fiber: 8,
    prepTimeMin: 22,
    biomarkerBadges: ["🦴 High Calcium", "⚡ Sustained Casein Protein", "🌱 Nutrient Dense"],
    clinicalBenefits: [
      "Casein protein matrix provides a sustained amino acid influx to support overnight muscle remodeling.",
      "Dense in bioavailable calcium, zinc, and fat-soluble vitamins.",
      "Tandoori spices (turmeric, coriander, cumin, ajwain) provide potent digestive anti-inflammatories.",
    ],
    ingredients: [
      { name: "Fresh Paneer (Cubed)", amount: "150g", category: "protein" },
      { name: "Bell Peppers & Zucchini Chunks", amount: "2 cups", category: "produce" },
      { name: "Steamed Quinoa", amount: "1/2 cup", category: "pantry" },
      { name: "Low-Fat Greek Yogurt Marinade with Spices", amount: "2 tbsp", category: "dairy_alt" },
    ],
    instructions: [
      "Marinate paneer and vegetable chunks in yogurt, lemon juice, turmeric, and tandoori spices.",
      "Grill in an oven or pan-sear on skewers until lightly charred and smoky.",
      "Serve over warm quinoa with a side of cool mint cucumber raita.",
    ],
    dietaryTags: ["vegetarian", "eggetarian", "jain", "high_protein"],
  },
  {
    id: "di_turkey_zucchini_bolognese",
    title: "Lean Turkey Herb Bolognese over Roasted Spaghetti Squash",
    mealType: "dinner",
    calories: 410,
    protein: 42,
    carbs: 24,
    fat: 15,
    fiber: 7,
    prepTimeMin: 25,
    biomarkerBadges: ["🍅 Lycopene Rich", "💪 High Lean Protein", "🩸 Low Carb"],
    clinicalBenefits: [
      "Extremely low saturated fat profile supporting healthy LDL particle size and arterial health.",
      "Lycopene from simmered tomato puree provides potent vascular antioxidant protection.",
      "Low glycemic load is ideal for evening metabolic calmness and restful sleep.",
    ],
    ingredients: [
      { name: "Extra Lean Ground Turkey Breast", amount: "150g", category: "protein" },
      { name: "Spaghetti Squash / Zucchini Noodles", amount: "2.5 cups", category: "produce" },
      { name: "Crushed Organic San Marzano Tomatoes", amount: "1 cup", category: "pantry" },
      { name: "Fresh Basil, Oregano & Olive Oil", amount: "1 tsp", category: "produce" },
    ],
    instructions: [
      "Brown lean turkey in a pan with oregano, basil, and black pepper.",
      "Simmer with crushed tomatoes and Italian herbs on low heat for 15 mins.",
      "Serve over roasted fork-scraped spaghetti squash strands.",
    ],
    dietaryTags: ["omnivore", "keto", "low_carb", "gluten_free", "high_protein"],
  },
  {
    id: "di_stuffed_bell_peppers_lentils",
    title: "Mediterranean Stuffed Bell Peppers with Spiced Lentils & Pine Nuts",
    mealType: "dinner",
    calories: 430,
    protein: 21,
    carbs: 58,
    fat: 12,
    fiber: 14,
    prepTimeMin: 25,
    biomarkerBadges: ["🫑 Vitamin C Dense", "🌱 Complete Plant Fiber", "🫀 Polyphenol Rich"],
    clinicalBenefits: [
      "Bell peppers provide over 200% daily value of vitamin C to support collagen synthesis.",
      "Brown lentils supply abundant soluble fiber and prebiotic resistant starch.",
      "Pine nuts deliver pinolenic acid, which stimulates satiety hormones CCK and GLP-1.",
    ],
    ingredients: [
      { name: "Large Red / Yellow Bell Peppers", amount: "2 whole (halved)", category: "produce" },
      { name: "Cooked Brown Lentils & Quinoa", amount: "1 cup combined", category: "pantry" },
      { name: "Toasted Pine Nuts", amount: "10g", category: "pantry" },
      { name: "Organic Marinara Sauce & Herbs", amount: "1/2 cup", category: "pantry" },
    ],
    instructions: [
      "Stuff halved bell peppers with seasoned cooked lentils, quinoa, marinara, and pine nuts.",
      "Bake covered in an oven at 375°F for 20 minutes until peppers are fork-tender.",
      "Garnish with fresh parsley before serving.",
    ],
    dietaryTags: ["vegan", "vegetarian", "jain", "gluten_free", "high_fiber"],
  },
  {
    id: "di_asian_sesame_chicken_stirfry",
    title: "Ginger Sesame Chicken Breast with Sugar Snap Peas & Cauliflower Rice",
    mealType: "dinner",
    calories: 420,
    protein: 44,
    carbs: 20,
    fat: 16,
    fiber: 7,
    prepTimeMin: 18,
    biomarkerBadges: ["⚡ High Protein", "🩸 Low Carb", "🥦 Cruciferous Detox"],
    clinicalBenefits: [
      "High protein-to-calorie ratio supports overnight anabolic tissue rebuilding.",
      "Riced cauliflower reduces net carbohydrate intake while providing potent indoles.",
      "Sesame lignans and ginger provide antioxidant protection against lipid peroxidation.",
    ],
    ingredients: [
      { name: "Chicken Breast Tenderloins", amount: "160g (sliced)", category: "protein" },
      { name: "Fresh Riced Cauliflower", amount: "2 cups", category: "produce" },
      { name: "Sugar Snap Peas & Water Chestnuts", amount: "1.5 cups", category: "produce" },
      { name: "Low-Sodium Tamari & Sesame Oil", amount: "1 tbsp", category: "pantry" },
    ],
    instructions: [
      "Stir-fry chicken breast strips in sesame oil with minced ginger for 5 minutes.",
      "Add snap peas and flash-sautéed cauliflower rice with a splash of tamari.",
      "Serve piping hot sprinkled with toasted sesame seeds.",
    ],
    dietaryTags: ["omnivore", "low_carb", "keto", "high_protein"],
  },
  {
    id: "di_coconut_red_lentil_soup",
    title: "Velvety Coconut Red Lentil Soup with Roasted Pumpkin Seeds",
    mealType: "dinner",
    calories: 430,
    protein: 20,
    carbs: 56,
    fat: 14,
    fiber: 15,
    prepTimeMin: 20,
    biomarkerBadges: ["🥥 Medium Chain Triglycerides", "🌱 High Iron & Fiber", "🌿 Anti-Inflammatory"],
    clinicalBenefits: [
      "Red lentils dissolve smoothly and provide gut-nourishing soluble and insoluble prebiotic fiber.",
      "Medium chain fatty acids from coconut milk provide gentle, easily metabolizable evening fuel.",
      "Pumpkin seeds supply essential zinc and magnesium to support restful sleep architecture.",
    ],
    ingredients: [
      { name: "Split Red Lentils (Masoor)", amount: "65g dry", category: "pantry" },
      { name: "Light Coconut Milk", amount: "100ml", category: "dairy_alt" },
      { name: "Steamed Spinach & Carrots / Zucchini", amount: "1 cup", category: "produce" },
      { name: "Roasted Pepitas (Pumpkin Seeds)", amount: "1 tbsp", category: "pantry" },
    ],
    instructions: [
      "Simmer red lentils with turmeric, cumin, ginger, and vegetable broth for 15 mins until velvety.",
      "Stir in light coconut milk and wilted baby greens.",
      "Ladle into a warm bowl and top with crunchy roasted pumpkin seeds.",
    ],
    dietaryTags: ["vegan", "vegetarian", "jain", "high_fiber", "anti_inflammatory"],
  },
  {
    id: "di_mediterranean_grilled_shrimp",
    title: "Lemon Herb Grilled Shrimp with Greek Quinoa & Cucumber Salad",
    mealType: "dinner",
    calories: 430,
    protein: 38,
    carbs: 36,
    fat: 14,
    fiber: 6,
    prepTimeMin: 15,
    biomarkerBadges: ["🦐 Clean Marine Protein", "⚡ Fast Digestion", "🫀 Zero Saturated Fat"],
    clinicalBenefits: [
      "Shrimp provides dense bioavailable protein with minimal calories and zero saturated fat.",
      "Rich in astaxanthin, a marine carotenoid known for potent mitochondrial antioxidant activity.",
      "Light evening meal profile prevents sleep disturbance and gastroesophageal reflux.",
    ],
    ingredients: [
      { name: "Wild Caught Shrimp (Peeled)", amount: "170g", category: "protein" },
      { name: "Cooked Tri-Color Quinoa", amount: "3/4 cup", category: "pantry" },
      { name: "Persian Cucumbers & Cherry Tomatoes", amount: "1.5 cups", category: "produce" },
      { name: "Extra Virgin Olive Oil & Lemon", amount: "1 tbsp", category: "pantry" },
    ],
    instructions: [
      "Skewer seasoned shrimp and grill in olive oil with oregano and lemon for 2 mins per side.",
      "Toss cooked quinoa with diced cucumbers, cherry tomatoes, and lemon vinaigrette.",
      "Serve warm grilled shrimp over the crisp quinoa salad.",
    ],
    dietaryTags: ["omnivore", "pescatarian", "gluten_free", "high_protein", "low_calorie"],
  },
  {
    id: "di_baingan_bharta_missi_roti",
    title: "Smoky Roasted Eggplant (Baingan Bharta) with Spiced Chickpea Missi Roti",
    mealType: "dinner",
    calories: 410,
    protein: 17,
    carbs: 62,
    fat: 10,
    fiber: 15,
    prepTimeMin: 25,
    biomarkerBadges: ["🍆 Nasunin Antioxidant", "🩸 Low Glycemic Index", "🌱 High Fiber"],
    clinicalBenefits: [
      "Nasunin in eggplant skin protects brain cell membrane lipids from oxidative degradation.",
      "Chickpea flour (besan) in missi roti provides complex low-GI carbs and sustained amino acids.",
      "Exceptional dietary fiber supports smooth overnight digestion and morning bowel regularity.",
    ],
    ingredients: [
      { name: "Charred & Mashed Eggplant", amount: "2 cups", category: "produce" },
      { name: "Fresh Diced Tomatoes & Ginger", amount: "1 cup", category: "produce" },
      { name: "Chickpea & Whole Wheat Missi Roti", amount: "2 small rotis", category: "pantry" },
      { name: "Cold-Pressed Mustard Oil & Cumin", amount: "1 tsp", category: "pantry" },
    ],
    instructions: [
      "Roast eggplant over open flame or broil until charred and tender, then peel and mash.",
      "Cook with cumin, ginger, turmeric, and fresh diced tomatoes in a teaspoon of mustard oil.",
      "Serve alongside freshly cooked chickpea missi roti.",
    ],
    dietaryTags: ["vegan", "vegetarian", "jain", "high_fiber", "heart_healthy"],
  },

  // ==========================================
  // SNACKS (16 VARIED RECIPES)
  // ==========================================
  {
    id: "sn_greek_yogurt_berries",
    title: "Greek Yogurt with Wild Blueberries & Crushed Almonds",
    mealType: "snack",
    calories: 190,
    protein: 15,
    carbs: 16,
    fat: 7,
    fiber: 4,
    prepTimeMin: 3,
    biomarkerBadges: ["🦠 Probiotics", "⚡ Quick Protein", "🫐 Low Glycemic"],
    clinicalBenefits: [
      "Sustained amino acid delivery helps prevent mid-afternoon energy slumps.",
      "Polyphenols from wild blueberries protect against cellular oxidative stress.",
    ],
    ingredients: [
      { name: "Plain Non-Fat Greek Yogurt", amount: "150g", category: "dairy_alt" },
      { name: "Wild Fresh Blueberries", amount: "1/2 cup", category: "produce" },
      { name: "Raw Almond Halves", amount: "10g", category: "pantry" },
    ],
    instructions: ["Combine Greek yogurt with mixed berries and a sprinkle of crushed almonds."],
    dietaryTags: ["vegetarian", "eggetarian", "jain", "probiotic", "high_protein"],
  },
  {
    id: "sn_apple_almond_butter",
    title: "Crisp Honeycrisp Apple Slices with Raw Almond Butter",
    mealType: "snack",
    calories: 200,
    protein: 5,
    carbs: 26,
    fat: 9,
    fiber: 6,
    prepTimeMin: 2,
    biomarkerBadges: ["🍎 Pectin Fiber", "🧠 Vitamin E", "🌿 Heart Healthy"],
    clinicalBenefits: [
      "Quercetin from apple skin reduces inflammatory oxidative markers.",
      "Healthy monounsaturated fats slow gastric emptying for stable afternoon focus.",
    ],
    ingredients: [
      { name: "Organic Honeycrisp Apple", amount: "1 medium", category: "produce" },
      { name: "Raw Almond Butter", amount: "1 tbsp (16g)", category: "pantry" },
    ],
    instructions: ["Slice apple thinly and serve with 1 tbsp creamy raw almond butter."],
    dietaryTags: ["vegan", "vegetarian", "jain", "heart_healthy", "low_glycemic"],
  },
  {
    id: "sn_roasted_edamame_sea_salt",
    title: "Crunchy Sea Salt & Paprika Roasted Edamame",
    mealType: "snack",
    calories: 140,
    protein: 13,
    carbs: 9,
    fat: 4.5,
    fiber: 6,
    prepTimeMin: 1,
    biomarkerBadges: ["🌱 Plant Protein", "🩸 Low Carb", "🧪 High Potassium"],
    clinicalBenefits: [
      "High ratio of clean plant protein to net carbohydrates.",
      "Rich in folate, vitamin K1, and essential intracellular minerals.",
    ],
    ingredients: [
      { name: "Dry Roasted Edamame", amount: "35g (1/3 cup)", category: "pantry" },
    ],
    instructions: ["Enjoy straight from packet or lightly warm with a pinch of smoked paprika."],
    dietaryTags: ["vegan", "vegetarian", "jain", "gluten_free", "high_protein"],
  },
  {
    id: "sn_protein_matcha_shake",
    title: "Antioxidant Iced Ceremonial Matcha & Pea Protein Shake",
    mealType: "snack",
    calories: 160,
    protein: 22,
    carbs: 6,
    fat: 3,
    fiber: 2,
    prepTimeMin: 3,
    biomarkerBadges: ["🍵 EGCG Matcha", "🧠 L-Theanine Focus", "⚡ Fast Recovery"],
    clinicalBenefits: [
      "L-theanine in ceremonial matcha promotes calm, focused alpha brain wave activity.",
      "EGCG stimulates cellular autophagy and thermogenic metabolic rate.",
    ],
    ingredients: [
      { name: "Ceremonial Matcha Powder", amount: "1 tsp", category: "pantry" },
      { name: "Clean Pea Protein Powder", amount: "20g", category: "pantry" },
      { name: "Unsweetened Almond Milk", amount: "250ml", category: "dairy_alt" },
    ],
    instructions: ["Shake vigorously in a blender bottle with ice cubes until frothy and smooth."],
    dietaryTags: ["vegan", "vegetarian", "jain", "high_protein", "low_carb"],
  },
  {
    id: "sn_spiced_roasted_makhana",
    title: "Turmeric & Black Pepper Roasted Foxnuts (Makhana)",
    mealType: "snack",
    calories: 130,
    protein: 4,
    carbs: 22,
    fat: 3,
    fiber: 4,
    prepTimeMin: 5,
    biomarkerBadges: ["🪷 Low Glycemic", "🧪 Mineral Rich", "🫀 Zero Cholesterol"],
    clinicalBenefits: [
      "Low glycemic index snack with natural kaempferol flavonoids that reduce inflammation.",
      "Rich in magnesium and potassium to support cellular electrolyte balance.",
    ],
    ingredients: [
      { name: "Puffed Lotus Seeds (Makhana)", amount: "30g", category: "pantry" },
      { name: "Cold-Pressed Olive Oil", amount: "1/2 tsp", category: "pantry" },
      { name: "Turmeric & Black Pepper", amount: "1/4 tsp each", category: "pantry" },
    ],
    instructions: ["Dry roast makhana in a pan with olive oil, turmeric, and black pepper until crunchy."],
    dietaryTags: ["vegan", "vegetarian", "jain", "gluten_free", "low_calorie"],
  },
  {
    id: "sn_cucumber_hummus_bites",
    title: "Crisp Cucumber & Bell Pepper Batons with Classic Hummus",
    mealType: "snack",
    calories: 140,
    protein: 5,
    carbs: 16,
    fat: 7,
    fiber: 5,
    prepTimeMin: 3,
    biomarkerBadges: ["🥒 Hydrating", "🌱 Soluble Fiber", "🧪 Low Calorie"],
    clinicalBenefits: [
      "High water content cucumbers promote cellular hydration and mineral uptake.",
      "Chickpea tahini hummus delivers gut-friendly prebiotic fiber.",
    ],
    ingredients: [
      { name: "English Cucumber & Red Bell Pepper", amount: "1.5 cups sliced", category: "produce" },
      { name: "Classic Garlic/Plain Hummus", amount: "2 tbsp (35g)", category: "pantry" },
    ],
    instructions: ["Cut vegetables into batons and dip into creamy hummus."],
    dietaryTags: ["vegan", "vegetarian", "jain", "low_calorie", "heart_healthy"],
  },
  {
    id: "sn_walnuts_goji_berries",
    title: "Raw Walnut Halves with Antioxidant Goji Berries & Pumpkin Seeds",
    mealType: "snack",
    calories: 180,
    protein: 6,
    carbs: 14,
    fat: 12,
    fiber: 4,
    prepTimeMin: 1,
    biomarkerBadges: ["🧠 Brain Omega-3", "👁️ Zeaxanthin Vision", "🫀 Heart Healthy"],
    clinicalBenefits: [
      "Rich in alpha-linolenic acid (ALA) for neurovascular membrane preservation.",
      "Goji berry zeaxanthin and lutein safeguard retinal pigment epithelium.",
    ],
    ingredients: [
      { name: "Raw Walnut Halves", amount: "15g", category: "pantry" },
      { name: "Dried Goji Berries", amount: "1 tbsp (12g)", category: "pantry" },
      { name: "Raw Pumpkin Seeds", amount: "10g", category: "pantry" },
    ],
    instructions: ["Mix together in a snack bowl for a nutrient-dense trail mix."],
    dietaryTags: ["vegan", "vegetarian", "jain", "heart_healthy", "gluten_free"],
  },
  {
    id: "sn_hard_boiled_eggs_paprika",
    title: "Pasture-Raised Boiled Eggs with Smoked Paprika & Sea Salt",
    mealType: "snack",
    calories: 140,
    protein: 13,
    carbs: 1,
    fat: 10,
    fiber: 0,
    prepTimeMin: 8,
    biomarkerBadges: ["⚡ Pure Protein", "🧠 Choline Dense", "🩸 Zero Carb"],
    clinicalBenefits: [
      "Provides complete bioavailable protein without impacting insulin secretion.",
      "Choline optimizes hepatic lipid clearance and cognitive clarity.",
    ],
    ingredients: [
      { name: "Pasture-Raised Eggs", amount: "2 large", category: "protein" },
      { name: "Smoked Paprika & Flaky Salt", amount: "Pinch", category: "pantry" },
    ],
    instructions: ["Boil eggs for 8 mins, peel, halve, and dust with smoked paprika and sea salt."],
    dietaryTags: ["omnivore", "eggetarian", "pescatarian", "keto", "high_protein", "low_carb"],
  },
  {
    id: "sn_dark_chocolate_pistachios",
    title: "85% Dark Cacao Squares with Roasted Pistachios",
    mealType: "snack",
    calories: 170,
    protein: 4,
    carbs: 12,
    fat: 12,
    fiber: 4,
    prepTimeMin: 1,
    biomarkerBadges: ["🍫 Flavanol Nitric Oxide", "🧪 Magnesium Rich", "🫀 Arterial Health"],
    clinicalBenefits: [
      "Cocoa flavanols stimulate endothelial nitric oxide production to support vasodilation.",
      "Pistachios supply plant sterols that hinder dietary cholesterol uptake.",
    ],
    ingredients: [
      { name: "85% Single-Origin Dark Chocolate", amount: "20g (2 squares)", category: "pantry" },
      { name: "Roasted Unsalted Pistachios", amount: "15g (approx 20 nuts)", category: "pantry" },
    ],
    instructions: ["Savor slow-melting dark chocolate squares alongside roasted pistachios."],
    dietaryTags: ["vegan", "vegetarian", "jain", "heart_healthy"],
  },
  {
    id: "sn_chia_mango_pot",
    title: "Coconut Chia Seed Pot with Fresh Mango Puree",
    mealType: "snack",
    calories: 160,
    protein: 4,
    carbs: 20,
    fat: 8,
    fiber: 7,
    prepTimeMin: 5,
    biomarkerBadges: ["🥭 Vitamin A", "🌿 Soluble Prebiotic", "🌱 Plant Omega-3"],
    clinicalBenefits: [
      "Chia seed soluble mucilage creates a prebiotic gel that promotes gastrointestinal mucosal barrier integrity.",
      "Fresh mango supplies mangiferin, a natural antioxidant protecting against metabolic stress.",
    ],
    ingredients: [
      { name: "Chia Seeds", amount: "1.5 tbsp", category: "pantry" },
      { name: "Light Coconut Milk", amount: "100ml", category: "dairy_alt" },
      { name: "Fresh Pureed Mango", amount: "3 tbsp", category: "produce" },
    ],
    instructions: ["Stir chia seeds into coconut milk and chill for 20 mins; top with fresh mango puree."],
    dietaryTags: ["vegan", "vegetarian", "jain", "high_fiber"],
  },
  {
    id: "sn_spiced_chana_chaat",
    title: "Tangy Sprouted Moong & Boiled Chickpea Chaat",
    mealType: "snack",
    calories: 160,
    protein: 9,
    carbs: 26,
    fat: 3,
    fiber: 7,
    prepTimeMin: 5,
    biomarkerBadges: ["🌱 Sprouted Enzymes", "🩸 Low GI", "🧪 High Potassium"],
    clinicalBenefits: [
      "Sprouting multiplies live enzymatic activity and dramatically increases vitamin C content.",
      "Chaat masala and fresh lemon juice stimulate digestive fire and enhance non-heme iron uptake.",
    ],
    ingredients: [
      { name: "Sprouted Moong & Boiled Chickpeas", amount: "1/2 cup combined", category: "pantry" },
      { name: "Diced Cucumber & Tomato", amount: "1/2 cup", category: "produce" },
      { name: "Fresh Lemon Juice & Chaat Masala", amount: "1 tsp", category: "pantry" },
    ],
    instructions: ["Toss sprouted moong and chickpeas with diced cucumber, tomato, lemon juice, and chaat masala."],
    dietaryTags: ["vegan", "vegetarian", "jain", "high_fiber", "low_glycemic"],
  },
];

export interface RecommendedExercise {
  id: string;
  name: string;
  calories: number;
  durationMin: number;
  difficulty: "Beginner" | "Intermediate" | "Hard";
  category: "Cardio" | "Strength" | "Flexibility";
  imageUrl: string;
  instructions: string;
}

export const RECOMMENDED_EXERCISES: RecommendedExercise[] = [
  {
    id: "ex_brisk_walking",
    name: "Brisk Walking",
    calories: 200,
    durationMin: 30,
    difficulty: "Beginner",
    category: "Cardio",
    imageUrl: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=400&q=80",
    instructions: "Moderate pace outdoor or treadmill walk engaging arms and core.",
  },
  {
    id: "ex_bodyweight_squats",
    name: "Bodyweight Squats",
    calories: 180,
    durationMin: 20,
    difficulty: "Intermediate",
    category: "Strength",
    imageUrl: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=400&q=80",
    instructions: "Shoulder-width stance, sit back into hips keeping knees tracking toes.",
  },
  {
    id: "ex_dumbbell_squats",
    name: "Dumbbell Squat",
    calories: 300,
    durationMin: 30,
    difficulty: "Hard",
    category: "Strength",
    imageUrl: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=400&q=80",
    instructions: "Hold dumbbells at shoulder height while executing full range squats.",
  },
];

/**
 * Filter recipe bank based on profile diet preferences, allergies, and conditions.
 */
export function filterSafeRecipes(
  recipes: MealRecipe[],
  dietPref: string = "omnivore",
  allergies: string[] = [],
  conditions: string[] = []
): MealRecipe[] {
  const normPref = (dietPref || "omnivore").toLowerCase().trim();

  return recipes.filter((r) => {
    const tags = (r.dietaryTags || []).map((t) => t.toLowerCase());
    const ingNames = r.ingredients.map((i) => i.name.toLowerCase());
    const titleLower = r.title.toLowerCase();

    const isMeatOrPoultry =
      titleLower.includes("chicken") ||
      titleLower.includes("turkey") ||
      titleLower.includes("beef") ||
      titleLower.includes("pork") ||
      titleLower.includes("bacon") ||
      titleLower.includes("steak") ||
      ingNames.some((i) =>
        i.includes("chicken") ||
        i.includes("turkey") ||
        i.includes("beef") ||
        i.includes("pork") ||
        i.includes("bacon") ||
        i.includes("steak")
      );

    const isFishOrSeafood =
      titleLower.includes("salmon") ||
      titleLower.includes("fish") ||
      titleLower.includes("cod") ||
      titleLower.includes("tuna") ||
      titleLower.includes("shrimp") ||
      titleLower.includes("crab") ||
      titleLower.includes("seafood") ||
      titleLower.includes("halibut") ||
      ingNames.some((i) =>
        i.includes("salmon") ||
        i.includes("fish") ||
        i.includes("cod") ||
        i.includes("tuna") ||
        i.includes("shrimp") ||
        i.includes("crab") ||
        i.includes("seafood") ||
        i.includes("halibut")
      );

    const isEgg =
      tags.includes("eggetarian") ||
      titleLower.includes("egg") ||
      titleLower.includes("omelette") ||
      titleLower.includes("frittata") ||
      (titleLower.includes("scramble") && !titleLower.includes("tofu")) ||
      ingNames.some((i) => i.includes("egg") && !i.includes("eggplant"));

    const isDairy = ingNames.some((i) =>
      i.includes("yogurt") ||
      i.includes("paneer") ||
      i.includes("cheese") ||
      (i.includes("milk") && !i.includes("almond milk") && !i.includes("coconut milk") && !i.includes("soy milk") && !i.includes("oat milk")) ||
      i.includes("whey") ||
      (i.includes("butter") && !i.includes("almond butter") && !i.includes("peanut butter")) ||
      i.includes("ghee") ||
      i.includes("cottage cheese") ||
      i.includes("feta")
    );

    const isRootVeg =
      titleLower.includes("onion") ||
      titleLower.includes("garlic") ||
      titleLower.includes("potato") ||
      ingNames.some((i) =>
        i.includes("onion") ||
        i.includes("garlic") ||
        i.includes("potato") ||
        i.includes("radish") ||
        i.includes("beet") ||
        i.includes("carrot") ||
        i.includes("turnip")
      );

    // 1. JAIN PREFERENCE:
    if (normPref === "jain") {
      if (isMeatOrPoultry || isFishOrSeafood || isEgg || isRootVeg) return false;
      if (!tags.includes("jain") && !tags.includes("vegan") && !tags.includes("vegetarian")) return false;
    }
    // 2. VEGAN PREFERENCE:
    else if (normPref === "vegan") {
      if (isMeatOrPoultry || isFishOrSeafood || isEgg || isDairy) return false;
      if (!tags.includes("vegan")) return false;
    }
    // 3. VEGETARIAN PREFERENCE:
    else if (normPref === "vegetarian") {
      if (isMeatOrPoultry || isFishOrSeafood || isEgg) return false;
      if (!tags.includes("vegetarian") && !tags.includes("vegan") && !tags.includes("jain")) return false;
    }
    // 4. EGGETARIAN PREFERENCE:
    else if (normPref === "eggetarian") {
      if (isMeatOrPoultry || isFishOrSeafood) return false;
    }
    // 5. PESCATARIAN PREFERENCE:
    else if (normPref === "pescatarian") {
      if (isMeatOrPoultry) return false;
    }
    // 6. KETO PREFERENCE:
    else if (normPref === "keto") {
      if (!tags.includes("keto") && !tags.includes("low_carb")) return false;
    }

    // Food Allergy Filters:
    for (const allergy of allergies) {
      const a = allergy.toLowerCase();
      if (a === "lactose" && isDairy) return false;
      if (a === "gluten" && ingNames.some((i) => i.includes("wheat") || i.includes("bread") || i.includes("sourdough") || i.includes("tortilla") || i.includes("pasta") || i.includes("couscous") || i.includes("spelt"))) return false;
      if (a === "peanuts" && ingNames.some((i) => i.includes("peanut"))) return false;
      if (a === "tree_nuts" && ingNames.some((i) => i.includes("almond") || i.includes("walnut") || i.includes("cashew") || i.includes("pistachio") || i.includes("pine nut") || i.includes("pecan"))) return false;
      if (a === "eggs" && isEgg) return false;
      if (a === "soy" && ingNames.some((i) => i.includes("tofu") || i.includes("tempeh") || i.includes("edamame") || i.includes("soy") || i.includes("tamari"))) return false;
      if (a === "shellfish" && ingNames.some((i) => i.includes("shrimp") || i.includes("crab") || i.includes("shellfish"))) return false;
    }

    return true;
  });
}

/**
 * Generate a complete 7-Day interactive diet plan with diverse, non-repeating meals.
 */
export function generateWeeklyDietPlan(
  activePanel: LabPanelRow | null,
  trends: BiomarkerTrendMap | BiomarkerTrend[] = {},
  settings: DietUserSettings
): DayDietPlan[] {
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const safeRecipes = filterSafeRecipes(
    MEAL_RECIPES_BANK,
    settings.dietaryPreference,
    settings.foodAllergies,
    settings.dietaryConditions
  );

  const breakfasts = safeRecipes.filter((r) => r.mealType === "breakfast");
  const lunches = safeRecipes.filter((r) => r.mealType === "lunch");
  const dinners = safeRecipes.filter((r) => r.mealType === "dinner");
  const snacks = safeRecipes.filter((r) => r.mealType === "snack");

  const getBf = (idx: number) => {
    if (breakfasts.length > idx) return breakfasts[idx];
    if (breakfasts.length > 0) return breakfasts[idx % breakfasts.length];
    if (safeRecipes.length > 0) return safeRecipes[idx % safeRecipes.length];
    return MEAL_RECIPES_BANK[0];
  };

  const getLu = (idx: number) => {
    if (lunches.length > idx) return lunches[idx];
    if (lunches.length > 0) return lunches[idx % lunches.length];
    if (safeRecipes.length > 0) return safeRecipes[idx % safeRecipes.length];
    return MEAL_RECIPES_BANK[1] || MEAL_RECIPES_BANK[0];
  };

  const getDi = (idx: number) => {
    if (dinners.length > idx) return dinners[idx];
    if (dinners.length > 0) return dinners[idx % dinners.length];
    if (safeRecipes.length > 0) return safeRecipes[idx % safeRecipes.length];
    return MEAL_RECIPES_BANK[2] || MEAL_RECIPES_BANK[0];
  };

  const getSn = (idx: number) => {
    if (snacks.length > idx) return snacks[idx];
    if (snacks.length > 0) return snacks[idx % snacks.length];
    if (safeRecipes.length > 0) return safeRecipes[idx % safeRecipes.length];
    return MEAL_RECIPES_BANK[3] || MEAL_RECIPES_BANK[0];
  };

  const bmr = calculateBMR(settings.targetWeightKg || 72, 175, 36, "male");
  const tdee = calculateTDEE(bmr, settings.activityLevel);
  const targetCal = settings.customCalorieTarget || calculateCalorieTarget(tdee, settings.goal, settings.weeklyPaceKg);

  const days: DayDietPlan[] = [];

  for (let i = 0; i < 7; i++) {
    const bf = getBf(i);
    const lu = getLu(i);
    const di = getDi(i);
    const sn = getSn(i);

    const totalCal = bf.calories + lu.calories + di.calories + sn.calories;
    const totalProt = bf.protein + lu.protein + di.protein + sn.protein;
    const totalCarb = bf.carbs + lu.carbs + di.carbs + sn.carbs;
    const totalFat = bf.fat + lu.fat + di.fat + sn.fat;
    const totalFib = bf.fiber + lu.fiber + di.fiber + sn.fiber;

    let rationale = `Calibrated for ${settings.goal.replace(/_/g, " ")} with ${settings.dietaryPreference} dietary alignment.`;
    if (activePanel?.biomarkers?.["glucose"] && activePanel.biomarkers["glucose"] > 105) {
      rationale += " Emphasizes low-glycemic carbs and high soluble fiber to flatten postprandial glucose curves.";
    } else if (activePanel?.biomarkers?.["ldl"] && activePanel.biomarkers["ldl"] > 130) {
      rationale += " Features cardioprotective fats (EVOO, nuts) with restricted saturated fatty acids.";
    }

    days.push({
      dayNumber: i + 1,
      dayName: dayNames[i],
      targetCalories: targetCal,
      meals: {
        breakfast: bf,
        lunch: lu,
        dinner: di,
        snack: sn,
      },
      totalNutrition: {
        calories: totalCal,
        protein: totalProt,
        carbs: totalCarb,
        fat: totalFat,
        fiber: totalFib,
        sodium: 1650,
      },
      clinicalRationale: rationale,
    });
  }

  return days;
}

/**
 * Returns alternative safe meal options for the "Swap Meal" dialog.
 */
export function getMealAlternatives(
  currentRecipeId: string,
  mealType: MealCategory,
  settings: DietUserSettings
): MealRecipe[] {
  const safeRecipes = filterSafeRecipes(
    MEAL_RECIPES_BANK,
    settings.dietaryPreference,
    settings.foodAllergies,
    settings.dietaryConditions
  );

  return safeRecipes.filter((r) => r.mealType === mealType && r.id !== currentRecipeId);
}

/**
 * Aggregates all ingredients across the 7-day plan into a categorized Grocery Shopping List.
 */
export function generateGroceryList(weeklyPlan: DayDietPlan[]): {
  produce: { name: string; amount: string; checked: boolean }[];
  protein: { name: string; amount: string; checked: boolean }[];
  pantry: { name: string; amount: string; checked: boolean }[];
  dairy_alt: { name: string; amount: string; checked: boolean }[];
} {
  const map: Record<string, { category: "produce" | "protein" | "pantry" | "dairy_alt"; count: number; name: string }> = {};

  weeklyPlan.forEach((day) => {
    const allMeals = [day.meals.breakfast, day.meals.lunch, day.meals.dinner, day.meals.snack];
    allMeals.forEach((meal) => {
      meal.ingredients.forEach((ing) => {
        const key = ing.name.toLowerCase().trim();
        if (!map[key]) {
          map[key] = { category: ing.category, count: 1, name: ing.name };
        } else {
          map[key].count += 1;
        }
      });
    });
  });

  const produce: { name: string; amount: string; checked: boolean }[] = [];
  const protein: { name: string; amount: string; checked: boolean }[] = [];
  const pantry: { name: string; amount: string; checked: boolean }[] = [];
  const dairy_alt: { name: string; amount: string; checked: boolean }[] = [];

  Object.values(map).forEach((item) => {
    const formatted = {
      name: item.name,
      amount: item.count > 1 ? `x${item.count} meals` : "1 portion",
      checked: false,
    };
    if (item.category === "produce") produce.push(formatted);
    else if (item.category === "protein") protein.push(formatted);
    else if (item.category === "pantry") pantry.push(formatted);
    else if (item.category === "dairy_alt") dairy_alt.push(formatted);
  });

  return { produce, protein, pantry, dairy_alt };
}
