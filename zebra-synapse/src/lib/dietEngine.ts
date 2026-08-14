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

// ==========================================
// 4. 7-DAY DYNAMIC MEAL PLAN GENERATOR
// ==========================================

const MEAL_RECIPES_BANK: MealRecipe[] = [
  // BREAKFASTS
  {
    id: "bf_overnight_chia_oats",
    title: "Oatmeal with Almond Butter and Berries",
    mealType: "breakfast",
    calories: 350,
    protein: 12,
    carbs: 45,
    fat: 14,
    fiber: 9,
    prepTimeMin: 5,
    imageUrl: "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=400&q=80",
    biomarkerBadges: ["🫀 Cardio-Protective", "🌿 High Fiber", "🩸 Low Glycemic"],
    clinicalBenefits: [
      "Rich in fiber and antioxidants, providing long-lasting energy and improving digestion.",
      "Beta-glucan soluble fiber to bind and clear LDL cholesterol.",
      "Omega-3 fatty acids for arterial endothelial health.",
    ],
    ingredients: [
      { name: "Rolled Steel Cut Oats", amount: "50g", category: "pantry" },
      { name: "Chia Seeds & Almond Butter", amount: "1 tbsp each", category: "pantry" },
      { name: "Unsweetened Almond Milk", amount: "200ml", category: "dairy_alt" },
      { name: "Wild Blueberries & Raspberries", amount: "1/2 cup", category: "produce" },
    ],
    instructions: [
      "Combine rolled oats, chia seeds, and almond milk in a bowl or mason jar.",
      "Refrigerate or warm gently for 3-5 minutes.",
      "Top with fresh berries and creamy almond butter before enjoying.",
    ],
    dietaryTags: ["vegan", "vegetarian", "jain", "heart_healthy", "low_glycemic"],
  },
  {
    id: "bf_mediterranean_egg_avocado_toast",
    title: "Scrambled Eggs with Spinach & Whole Grain Toast",
    mealType: "breakfast",
    calories: 300,
    protein: 20,
    carbs: 25,
    fat: 12,
    fiber: 6,
    prepTimeMin: 8,
    imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=400&q=80",
    biomarkerBadges: ["⚡ High Protein", "🧠 Choline Rich", "🥬 Folate"],
    clinicalBenefits: [
      "Choline from pastured eggs supports liver and neural cell membrane synthesis.",
      "Monounsaturated fats enhance fat-soluble carotenoid and vitamin absorption.",
      "Whole grain toast provides complex slow-release carbohydrates without glucose spikes.",
    ],
    ingredients: [
      { name: "Pasture-Raised Eggs", amount: "2 large", category: "protein" },
      { name: "Whole Grain Sourdough Toast", amount: "1 thick slice", category: "pantry" },
      { name: "Fresh Baby Spinach", amount: "1.5 cups", category: "produce" },
      { name: "Extra Virgin Olive Oil", amount: "1 tsp", category: "pantry" },
    ],
    instructions: [
      "Whisk eggs with a splash of water, black pepper, and sea salt.",
      "Gently scramble in olive oil over low heat with fresh baby spinach until soft.",
      "Serve warm over crispy whole grain toast.",
    ],
    dietaryTags: ["omnivore", "eggetarian", "vegetarian", "heart_healthy", "high_protein"],
  },
  {
    id: "bf_tofu_spinach_scramble",
    title: "High-Protein Turmeric Tofu & Herb Scramble",
    mealType: "breakfast",
    calories: 340,
    protein: 26,
    carbs: 18,
    fat: 16,
    fiber: 6,
    prepTimeMin: 12,
    imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80",
    biomarkerBadges: ["✨ Anti-Inflammatory", "🌱 100% Plant-Based", "🧪 Low Sodium"],
    clinicalBenefits: [
      "Curcumin in turmeric provides systemic anti-inflammatory support.",
      "100% cholesterol-free complete plant protein matrix.",
      "Magnesium and potassium from spinach support healthy blood pressure.",
    ],
    ingredients: [
      { name: "Organic Firm Tofu", amount: "180g (crumbled)", category: "protein" },
      { name: "Baby Spinach & Bell Peppers", amount: "1.5 cups", category: "produce" },
      { name: "Turmeric & Nutritional Yeast", amount: "1 tsp each", category: "pantry" },
      { name: "Olive Oil", amount: "1 tsp", category: "pantry" },
    ],
    instructions: [
      "Heat olive oil in a skillet over medium heat.",
      "Crumble firm tofu with turmeric, garlic, and black pepper.",
      "Fold in bell peppers and baby spinach until tender (3-4 mins).",
    ],
    dietaryTags: ["vegan", "vegetarian", "jain", "low_carb", "anti_inflammatory"],
  },
  {
    id: "bf_greek_yogurt_berry_parfait",
    title: "Greek Yogurt with Mixed Berries and Almonds",
    mealType: "breakfast",
    calories: 320,
    protein: 24,
    carbs: 22,
    fat: 12,
    fiber: 5,
    prepTimeMin: 4,
    imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80",
    biomarkerBadges: ["🦠 Probiotic Gut Health", "🦴 Bioactive Calcium", "🫐 Antioxidants"],
    clinicalBenefits: [
      "Live probiotic cultures optimize microbiome diversity and intestinal barrier integrity.",
      "High bioavailable calcium supports bone density and cellular signaling.",
      "Almond polyphenols protect cardiovascular endothelial lining.",
    ],
    ingredients: [
      { name: "Plain Non-Fat Greek Yogurt", amount: "200g", category: "dairy_alt" },
      { name: "Fresh Strawberries & Blueberries", amount: "3/4 cup", category: "produce" },
      { name: "Sliced Raw Almonds", amount: "15g", category: "pantry" },
      { name: "Ground Flaxseed", amount: "1 tbsp", category: "pantry" },
    ],
    instructions: [
      "Spoon creamy Greek yogurt into a bowl.",
      "Layer with antioxidant-rich berries and sliced almonds.",
      "Dust with ground flaxseed for plant lignans and omega-3s.",
    ],
    dietaryTags: ["vegetarian", "eggetarian", "jain", "probiotic", "high_protein"],
  },

  // LUNCHES
  {
    id: "lu_grilled_chicken_wrap_spinach",
    title: "Grilled Chicken Wrap with Avocado and Spinach",
    mealType: "lunch",
    calories: 450,
    protein: 30,
    carbs: 40,
    fat: 16,
    fiber: 8,
    prepTimeMin: 12,
    imageUrl: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=400&q=80",
    biomarkerBadges: ["💪 Muscle Recovery", "🥑 Healthy Fats", "🔋 High Satiety"],
    clinicalBenefits: [
      "Rich in protein and healthy fats, perfect for muscle recovery and maintaining satiety.",
      "Monounsaturated fats from avocado assist in fat-soluble vitamin absorption.",
      "Lycopene and folate support vascular and cellular integrity.",
    ],
    ingredients: [
      { name: "Grilled Chicken Breast", amount: "130g", category: "protein" },
      { name: "Whole Grain Tortilla / Wrap", amount: "1 large", category: "pantry" },
      { name: "Hass Avocado", amount: "1/3 fruit sliced", category: "produce" },
      { name: "Baby Spinach & Tomatoes", amount: "1 cup", category: "produce" },
    ],
    instructions: [
      "Warm the whole grain tortilla slightly on a pan.",
      "Layer sliced grilled chicken, avocado slices, crisp spinach, and diced tomatoes.",
      "Roll tightly and slice in half.",
    ],
    dietaryTags: ["omnivore", "high_protein", "heart_healthy"],
  },
  {
    id: "lu_grilled_chicken_power_greens_salad",
    title: "Grilled Chicken Salad with Avocado and Quinoa",
    mealType: "lunch",
    calories: 450,
    protein: 36,
    carbs: 40,
    fat: 20,
    fiber: 8,
    prepTimeMin: 15,
    imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80",
    biomarkerBadges: ["🥗 Nutrient Dense", "⚡ High Protein", "🩸 Glucose Balanced"],
    clinicalBenefits: [
      "Lean bioavailable protein optimizes nitrogen retention and preserves muscle.",
      "Sulforaphane from cruciferous greens induces natural phase-2 liver enzymes.",
      "Complete amino acid matrix from quinoa promotes sustained cellular repair.",
    ],
    ingredients: [
      { name: "Grilled Herb Chicken Breast", amount: "140g", category: "protein" },
      { name: "Mixed Crisp Salad Greens", amount: "3 cups", category: "produce" },
      { name: "Cooked Tri-Color Quinoa", amount: "1/2 cup", category: "pantry" },
      { name: "Avocado & Olive Oil Vinaigrette", amount: "1.5 tbsp", category: "pantry" },
    ],
    instructions: [
      "Toss greens and quinoa with olive oil lemon vinaigrette.",
      "Top with sliced warm grilled chicken and diced creamy avocado.",
    ],
    dietaryTags: ["omnivore", "gluten_free", "high_protein", "heart_healthy"],
  },
  {
    id: "lu_mediterranean_salmon_quinoa_bowl",
    title: "Mediterranean Wild Salmon & Tri-Color Quinoa Bowl",
    mealType: "lunch",
    calories: 520,
    protein: 42,
    carbs: 44,
    fat: 18,
    fiber: 9,
    prepTimeMin: 20,
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80",
    biomarkerBadges: ["🐟 Omega-3 Rich", "🫀 Triglyceride Lowering", "🌿 Anti-Inflammatory"],
    clinicalBenefits: [
      "EPA & DHA omega-3s reduce vascular inflammation and serum triglycerides.",
      "Complete amino acid profile from quinoa accelerates cellular repair.",
      "High dietary potassium counters excess intracellular sodium.",
    ],
    ingredients: [
      { name: "Wild Salmon Fillet", amount: "140g", category: "protein" },
      { name: "Tri-Color Quinoa (Cooked)", amount: "1 cup", category: "pantry" },
      { name: "Cucumber & Cherry Tomatoes", amount: "1 cup diced", category: "produce" },
      { name: "Extra Virgin Olive Oil & Lemon", amount: "1 tbsp dressing", category: "pantry" },
    ],
    instructions: [
      "Pan-sear salmon in olive oil with oregano and lemon juice for 4 mins per side.",
      "Assemble quinoa base with diced cucumbers, cherry tomatoes, and herbs.",
      "Place warm salmon on top and drizzle with extra virgin olive oil.",
    ],
    dietaryTags: ["omnivore", "pescatarian", "gluten_free", "heart_healthy", "high_protein"],
  },
  {
    id: "lu_lentil_dal_spinach_brown_rice",
    title: "Golden Turmeric Lentil Dal with Spiced Greens & Rice",
    mealType: "lunch",
    calories: 470,
    protein: 23,
    carbs: 76,
    fat: 7,
    fiber: 18,
    prepTimeMin: 25,
    imageUrl: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80",
    biomarkerBadges: ["🌱 High Prebiotic Fiber", "🩸 HbA1c Friendly", "🫀 Zero Cholesterol"],
    clinicalBenefits: [
      "Exceptional soluble and prebiotic fiber supporting short-chain fatty acids (SCFAs).",
      "Non-heme iron combined with lemon vitamin C for enhanced absorption.",
      "Low glycemic index supporting steady HbA1c control.",
    ],
    ingredients: [
      { name: "Yellow Moong / Red Lentils", amount: "70g dry (cooked)", category: "pantry" },
      { name: "Brown Basmati Rice (Cooked)", amount: "3/4 cup", category: "pantry" },
      { name: "Steamed Spinach / Kale", amount: "1.5 cups", category: "produce" },
      { name: "Cold-Pressed Mustard/Olive Oil", amount: "1 tsp", category: "pantry" },
    ],
    instructions: [
      "Simmer lentils with water, turmeric, and minced ginger until tender.",
      "Temper with cumin seeds in olive oil and fold into dal.",
      "Serve alongside steamed brown basmati rice and wilted greens.",
    ],
    dietaryTags: ["vegan", "vegetarian", "jain", "high_fiber", "low_glycemic", "heart_healthy"],
  },

  // DINNERS
  {
    id: "di_grilled_chicken_sweet_potato_beans",
    title: "Grilled Chicken with Sweet Potato and Green Beans",
    mealType: "dinner",
    calories: 500,
    protein: 35,
    carbs: 45,
    fat: 20,
    fiber: 9,
    prepTimeMin: 20,
    imageUrl: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80",
    biomarkerBadges: ["🍠 Complex Carbs", "🍗 High Lean Protein", "🧪 Low Saturated Fat"],
    clinicalBenefits: [
      "Balanced macro distribution ideal for evening glycogen replenishment and muscle recovery.",
      "Slow-burning complex carbs in sweet potatoes stabilize overnight cortisol and blood sugar.",
      "High potassium and dietary fiber from crisp green beans.",
    ],
    ingredients: [
      { name: "Grilled Chicken Tenderloins", amount: "150g", category: "protein" },
      { name: "Roasted Sweet Potato Wedges", amount: "140g", category: "produce" },
      { name: "Steamed Crisp Green Beans", amount: "1.5 cups", category: "produce" },
      { name: "Extra Virgin Olive Oil & Herbs", amount: "1 tsp", category: "pantry" },
    ],
    instructions: [
      "Roast sweet potato wedges tossed in olive oil at 400°F for 20 mins.",
      "Grill seasoned chicken tenderloins with garlic and rosemary.",
      "Steam green beans lightly and assemble together with a squeeze of fresh lemon.",
    ],
    dietaryTags: ["omnivore", "gluten_free", "heart_healthy", "high_protein"],
  },
  {
    id: "di_baked_cod_steamed_veggies_sweet_potato",
    title: "Pan-Roasted White Fish with Garlic Sweet Potato & Asparagus",
    mealType: "dinner",
    calories: 480,
    protein: 44,
    carbs: 46,
    fat: 11,
    fiber: 8,
    prepTimeMin: 22,
    imageUrl: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80",
    biomarkerBadges: ["🌊 Marine Clean Protein", "🫀 Heart Healthy", "🩸 Ultra Low Fat"],
    clinicalBenefits: [
      "Ultra-lean marine protein with near-zero saturated fat burden.",
      "Complex anthocyanins and beta-carotene promote immune and endothelial health.",
      "Asparagus acts as a natural gentle diuretic to reduce sodium retention.",
    ],
    ingredients: [
      { name: "Cod or Halibut Fillet", amount: "180g", category: "protein" },
      { name: "Baked Sweet Potato", amount: "150g", category: "produce" },
      { name: "Fresh Asparagus Spears", amount: "10 spears", category: "produce" },
      { name: "Extra Virgin Olive Oil", amount: "2 tsp", category: "pantry" },
    ],
    instructions: [
      "Roast sweet potato cubes and asparagus tossed in olive oil for 20 mins.",
      "Bake seasoned cod fillet with lemon slices for 12-14 mins until flaky.",
      "Serve garnished with fresh dill.",
    ],
    dietaryTags: ["omnivore", "pescatarian", "gluten_free", "heart_healthy", "low_fat"],
  },
  {
    id: "di_paneer_tofu_stirfry_quinoa",
    title: "Wok-Tossed Tofu & Broccoli with Ginger-Tamari Sauce",
    mealType: "dinner",
    calories: 440,
    protein: 28,
    carbs: 42,
    fat: 17,
    fiber: 9,
    prepTimeMin: 18,
    imageUrl: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=400&q=80",
    biomarkerBadges: ["🥦 Glucosinolate Detox", "🌱 Complete Plant Protein", "🧪 Low Sodium"],
    clinicalBenefits: [
      "Isoflavones support arterial elasticity and healthy lipid profiles.",
      "Glucosinolates from broccoli promote cellular detoxification.",
      "Gingerols soothe gastrointestinal lining and accelerate gastric settling.",
    ],
    ingredients: [
      { name: "Organic Firm Tofu / Paneer", amount: "160g diced", category: "protein" },
      { name: "Broccoli, Snap Peas & Bell Peppers", amount: "2 cups", category: "produce" },
      { name: "Cooked Tri-Color Quinoa", amount: "3/4 cup", category: "pantry" },
      { name: "Low-Sodium Tamari & Ginger", amount: "1 tbsp sauce", category: "pantry" },
    ],
    instructions: [
      "Sear tofu cubes in sesame oil until crisp on all sides (6-7 mins).",
      "Toss in fresh broccoli florets, snap peas, and ginger with 2 tbsp water.",
      "Deglaze with low-sodium tamari and serve over quinoa.",
    ],
    dietaryTags: ["vegan", "vegetarian", "jain", "gluten_free", "low_sodium"],
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
    imageUrl: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=400&q=80",
    biomarkerBadges: ["🍅 Lycopene Rich", "💪 High Lean Protein", "🩸 Low Carb"],
    clinicalBenefits: [
      "Extremely low saturated fat profile supporting healthy LDL particle size.",
      "Lycopene from cooked tomato sauce provides potent vascular and prostate protection.",
      "Low glycemic index ideal for evening metabolic settling.",
    ],
    ingredients: [
      { name: "Lean Ground Turkey", amount: "150g", category: "protein" },
      { name: "Spaghetti Squash / Zucchini Noodles", amount: "2 cups", category: "produce" },
      { name: "Crushed Organic Tomatoes & Basil", amount: "1 cup", category: "pantry" },
    ],
    instructions: [
      "Brown lean turkey in a pan with oregano, basil, and garlic.",
      "Simmer with crushed tomatoes on low heat for 15 mins.",
      "Serve over roasted spaghetti squash or flash-sautéed zucchini noodles.",
    ],
    dietaryTags: ["omnivore", "keto", "low_carb", "gluten_free", "high_protein"],
  },

  // SNACKS
  {
    id: "sn_greek_yogurt_berries",
    title: "Greek Yogurt with Mixed Berries and Almonds",
    mealType: "snack",
    calories: 200,
    protein: 12,
    carbs: 18,
    fat: 10,
    fiber: 4,
    prepTimeMin: 3,
    imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80",
    biomarkerBadges: ["🦠 Probiotics", "⚡ Quick Protein", "🫐 Low Glycemic"],
    clinicalBenefits: [
      "Nutrient-dense afternoon snack providing sustained amino acid delivery and gut barrier support.",
      "Polyphenols protect against oxidative stress.",
    ],
    ingredients: [
      { name: "Plain Greek Yogurt", amount: "150g", category: "dairy_alt" },
      { name: "Mixed Fresh Berries", amount: "1/2 cup", category: "produce" },
      { name: "Raw Almond Halves", amount: "10g", category: "pantry" },
    ],
    instructions: ["Combine Greek yogurt with mixed berries and a sprinkle of crushed almonds."],
    dietaryTags: ["vegetarian", "eggetarian", "jain", "probiotic", "high_protein"],
  },
  {
    id: "sn_apple_almond_butter",
    title: "Crisp Apple Slices with Raw Almond Butter",
    mealType: "snack",
    calories: 210,
    protein: 5,
    carbs: 27,
    fat: 10,
    fiber: 6,
    prepTimeMin: 2,
    imageUrl: "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&w=400&q=80",
    biomarkerBadges: ["🍎 Pectin Fiber", "🧠 Vitamin E", "🌿 Heart Healthy"],
    clinicalBenefits: [
      "Quercetin from apple skin reduces inflammatory oxidative markers.",
      "Healthy monounsaturated fats slow gastric emptying for stable afternoon focus.",
    ],
    ingredients: [
      { name: "Organic Honeycrisp Apple", amount: "1 medium", category: "produce" },
      { name: "Raw Almond Butter", amount: "1 tbsp (16g)", category: "pantry" },
    ],
    instructions: ["Slice apple thinly and serve with 1 tbsp creamy almond butter."],
    dietaryTags: ["vegan", "vegetarian", "jain", "heart_healthy", "low_glycemic"],
  },
  {
    id: "sn_roasted_edamame_sea_salt",
    title: "Crunchy Sea Salt Roasted Edamame",
    mealType: "snack",
    calories: 140,
    protein: 13,
    carbs: 9,
    fat: 4.5,
    fiber: 6,
    prepTimeMin: 1,
    imageUrl: "https://images.unsplash.com/photo-1559181567-c3190ca9959b?auto=format&fit=crop&w=400&q=80",
    biomarkerBadges: ["🌱 Plant Protein", "🩸 Low Carb", "🧪 High Potassium"],
    clinicalBenefits: [
      "High ratio of plant protein to net carbohydrates.",
      "Rich in folate, vitamin K1, and essential minerals.",
    ],
    ingredients: [
      { name: "Dry Roasted Edamame", amount: "35g (1/3 cup)", category: "pantry" },
    ],
    instructions: ["Enjoy straight from packet or lightly warm with a pinch of smoked paprika."],
    dietaryTags: ["vegan", "vegetarian", "jain", "gluten_free", "high_protein"],
  },
  {
    id: "sn_protein_matcha_shake",
    title: "Antioxidant Iced Matcha & Pea Protein Shake",
    mealType: "snack",
    calories: 160,
    protein: 22,
    carbs: 6,
    fat: 3,
    fiber: 2,
    prepTimeMin: 3,
    imageUrl: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=400&q=80",
    biomarkerBadges: ["🍵 EGCG Matcha", "🧠 L-Theanine Focus", "⚡ Fast Recovery"],
    clinicalBenefits: [
      "L-theanine in matcha promotes calm, focused alpha brain waves.",
      "EGCG stimulates cellular autophagy and metabolic rate.",
    ],
    ingredients: [
      { name: "Ceremonial Matcha Powder", amount: "1 tsp", category: "pantry" },
      { name: "Clean Protein Powder", amount: "20g", category: "pantry" },
      { name: "Unsweetened Almond Milk", amount: "250ml", category: "dairy_alt" },
    ],
    instructions: ["Shake vigorously in a blender bottle with ice cubes until frothy."],
    dietaryTags: ["vegan", "vegetarian", "jain", "high_protein", "low_carb"],
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
  return recipes.filter((r) => {
    // Diet preference filter
    if (dietPref === "vegan" && !r.dietaryTags.includes("vegan")) return false;
    if (dietPref === "vegetarian" && !r.dietaryTags.includes("vegetarian") && !r.dietaryTags.includes("vegan")) return false;
    if (dietPref === "jain" && !r.dietaryTags.includes("jain")) return false;
    if (dietPref === "pescatarian" && !r.dietaryTags.includes("pescatarian") && !r.dietaryTags.includes("vegetarian") && !r.dietaryTags.includes("vegan")) return false;
    if (dietPref === "eggetarian" && !r.dietaryTags.includes("eggetarian") && !r.dietaryTags.includes("vegetarian") && !r.dietaryTags.includes("vegan")) return false;
    if (dietPref === "keto" && !r.dietaryTags.includes("keto") && !r.dietaryTags.includes("low_carb")) return false;

    // Food allergy filter
    for (const ing of r.ingredients) {
      const lower = ing.name.toLowerCase();
      if (allergies.includes("lactose") && (lower.includes("yogurt") || lower.includes("paneer") || lower.includes("milk") || lower.includes("whey")) && !lower.includes("almond") && !lower.includes("soy") && !lower.includes("plant")) {
        return false;
      }
      if (allergies.includes("gluten") && (lower.includes("wheat") || lower.includes("sourdough") || lower.includes("pita") || lower.includes("bread"))) {
        return false;
      }
      if (allergies.includes("peanuts") && lower.includes("peanut")) return false;
      if (allergies.includes("tree_nuts") && (lower.includes("almond") || lower.includes("walnut") || lower.includes("cashew"))) return false;
      if (allergies.includes("eggs") && lower.includes("egg")) return false;
      if (allergies.includes("soy") && (lower.includes("tofu") || lower.includes("edamame") || lower.includes("tempeh") || lower.includes("soy"))) return false;
      if (allergies.includes("shellfish") && (lower.includes("shrimp") || lower.includes("crab") || lower.includes("shellfish"))) return false;
    }

    return true;
  });
}

/**
 * Generate a complete 7-Day interactive diet plan.
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

  // Fallbacks if filtered pool is small
  const getBf = (idx: number) => breakfasts[idx % (breakfasts.length || 1)] || MEAL_RECIPES_BANK[0];
  const getLu = (idx: number) => lunches[idx % (lunches.length || 1)] || MEAL_RECIPES_BANK[4];
  const getDi = (idx: number) => dinners[idx % (dinners.length || 1)] || MEAL_RECIPES_BANK[8];
  const getSn = (idx: number) => snacks[idx % (snacks.length || 1)] || MEAL_RECIPES_BANK[11];

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
