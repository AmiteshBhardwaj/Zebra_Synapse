import { getSupabase } from "./supabase";
import {
  calculateBMR,
  calculateTDEE,
  calculateCalorieTarget,
  calculateMacroTargets,
  type ActivityLevel,
  type HealthGoal,
  type DietUserSettings,
} from "./dietEngine";

export type DietChatMessage = {
  id: string;
  sessionId: string;
  patientId: string;
  sender: "user" | "ai";
  text: string;
  createdAt: string;
  status?: "verified" | "ai_generated";
  recipeCard?: {
    title: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    ingredients?: string[];
  };
};

export type DietChatSession = {
  id: string;
  patientId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messagesCount: number;
  latestMessage?: string | null;
};

export type DietitianContext = {
  patientName?: string;
  heightCm?: number | null;
  weightKg?: number | null;
  activityLevel?: ActivityLevel;
  goal?: HealthGoal;
  targetWeightKg?: number | null;
  dietaryPreference?: string | null;
  foodAllergies?: string[] | null;
  dietaryConditions?: string[] | null;
  dietaryNotes?: string | null;
  dailyWaterTargetMl?: number;
};

const STORAGE_SESSIONS_PREFIX = "zebra_diet_sessions_";
const STORAGE_MESSAGES_PREFIX = "zebra_diet_messages_";

/**
 * Get storage key for sessions of a specific patient
 */
function getSessionsKey(patientId: string): string {
  return `${STORAGE_SESSIONS_PREFIX}${patientId || "guest"}`;
}

/**
 * Get storage key for messages in a session
 */
function getMessagesKey(sessionId: string): string {
  return `${STORAGE_MESSAGES_PREFIX}${sessionId}`;
}

/**
 * Fetch all diet chat sessions for a patient
 */
export async function fetchDietSessions(patientId: string): Promise<DietChatSession[]> {
  try {
    const key = getSessionsKey(patientId);
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved) as DietChatSession[];
      return parsed.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }
  } catch (e) {
    console.error("[dietChat] Failed to load sessions from storage:", e);
  }
  return [];
}

/**
 * Create a new diet chat session
 */
export async function createDietSession(
  patientId: string,
  initialTitle = "New Nutrition Chat"
): Promise<DietChatSession> {
  const sessionId = `diet_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newSession: DietChatSession = {
    id: sessionId,
    patientId: patientId || "guest",
    title: initialTitle,
    createdAt: now,
    updatedAt: now,
    messagesCount: 0,
    latestMessage: null,
  };

  try {
    const sessions = await fetchDietSessions(patientId);
    const updated = [newSession, ...sessions];
    localStorage.setItem(getSessionsKey(patientId), JSON.stringify(updated));
  } catch (e) {
    console.error("[dietChat] Failed to create session:", e);
  }

  return newSession;
}

/**
 * Fetch messages for a specific diet chat session
 */
export async function fetchDietSessionMessages(sessionId: string): Promise<DietChatMessage[]> {
  try {
    const key = getMessagesKey(sessionId);
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved) as DietChatMessage[];
    }
  } catch (e) {
    console.error("[dietChat] Failed to load messages:", e);
  }
  return [];
}

/**
 * Save / append a message to a session
 */
export async function saveDietMessage(
  sessionId: string,
  patientId: string,
  message: Omit<DietChatMessage, "id" | "sessionId" | "patientId" | "createdAt">
): Promise<DietChatMessage> {
  const newMsg: DietChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    sessionId,
    patientId: patientId || "guest",
    createdAt: new Date().toISOString(),
    ...message,
  };

  try {
    const existing = await fetchDietSessionMessages(sessionId);
    const updated = [...existing, newMsg];
    localStorage.setItem(getMessagesKey(sessionId), JSON.stringify(updated));

    // Update parent session metadata
    const sessions = await fetchDietSessions(patientId);
    const sessionIndex = sessions.findIndex((s) => s.id === sessionId);

    if (sessionIndex >= 0) {
      const current = sessions[sessionIndex];
      // Auto-generate a title from the first user query if still generic
      let updatedTitle = current.title;
      if (
        (current.title === "New Nutrition Chat" || current.title === "Diet Consultation") &&
        message.sender === "user"
      ) {
        updatedTitle =
          message.text.length > 38 ? `${message.text.substring(0, 38)}...` : message.text;
      }

      sessions[sessionIndex] = {
        ...current,
        title: updatedTitle,
        updatedAt: new Date().toISOString(),
        messagesCount: updated.length,
        latestMessage: message.text,
      };
      localStorage.setItem(getSessionsKey(patientId), JSON.stringify(sessions));
    }
  } catch (e) {
    console.error("[dietChat] Failed to save message:", e);
  }

  return newMsg;
}

/**
 * Rename a diet session
 */
export async function renameDietSession(
  sessionId: string,
  patientId: string,
  newTitle: string
): Promise<void> {
  try {
    const sessions = await fetchDietSessions(patientId);
    const updated = sessions.map((s) => (s.id === sessionId ? { ...s, title: newTitle.trim() } : s));
    localStorage.setItem(getSessionsKey(patientId), JSON.stringify(updated));
  } catch (e) {
    console.error("[dietChat] Failed to rename session:", e);
  }
}

/**
 * Delete a diet session and its messages
 */
export async function deleteDietSession(sessionId: string, patientId: string): Promise<void> {
  try {
    localStorage.removeItem(getMessagesKey(sessionId));
    const sessions = await fetchDietSessions(patientId);
    const filtered = sessions.filter((s) => s.id !== sessionId);
    localStorage.setItem(getSessionsKey(patientId), JSON.stringify(filtered));
  } catch (e) {
    console.error("[dietChat] Failed to delete session:", e);
  }
}

/**
 * Clear all messages inside a session
 */
export async function clearDietSessionMessages(
  sessionId: string,
  patientId: string
): Promise<void> {
  try {
    localStorage.removeItem(getMessagesKey(sessionId));
    const sessions = await fetchDietSessions(patientId);
    const updated = sessions.map((s) =>
      s.id === sessionId
        ? { ...s, messagesCount: 0, latestMessage: null, updatedAt: new Date().toISOString() }
        : s
    );
    localStorage.setItem(getSessionsKey(patientId), JSON.stringify(updated));
  } catch (e) {
    console.error("[dietChat] Failed to clear session messages:", e);
  }
}

/**
 * Generate clinically grounded AI Dietitian response with Gemini API or Deterministic Engine
 */
export async function generateDietitianAiAnswer(
  query: string,
  context: DietitianContext = {}
): Promise<string> {
  const patientName = context.patientName || "Friend";
  const weightKg = context.weightKg || 70;
  const heightCm = context.heightCm || 175;
  const activityLevel = context.activityLevel || "moderate";
  const goal = context.goal || "maintain_longevity";
  const targetWeightKg = context.targetWeightKg || weightKg;
  const preference = context.dietaryPreference || "omnivore";
  const allergies = context.foodAllergies || [];
  const conditions = context.dietaryConditions || [];
  const notes = context.dietaryNotes || "";

  // Calculate user metrics
  const bmr = calculateBMR(weightKg, heightCm, 30, "male");
  const tdee = calculateTDEE(bmr, activityLevel);
  const targetCalories = calculateCalorieTarget(tdee, goal);
  const macroTargets = calculateMacroTargets(targetCalories, goal);

  // 1. Check for Gemini API Key in Environment
  const geminiApiKey =
    (typeof import.meta !== "undefined" && (import.meta as any)?.env?.VITE_GEMINI_API_KEY) ||
    ((globalThis as any)?.process?.env?.VITE_GEMINI_API_KEY) ||
    "";

  if (geminiApiKey) {
    try {
      const systemPrompt = `You are "Synapse AI Dietitian", an elite, empathetic, and evidence-based Clinical Nutritionist and Dietitian for the Zebra Synapse health platform.
Your mission is to provide personalized, actionable, and medically sound nutrition guidance, delicious recipes, meal planning, macro breakdowns, and ingredient substitutions.

User Profile Context (NO LAB REPORT CONTEXT REQUIRED):
- Name: ${patientName}
- Weight: ${weightKg} kg (Target Goal: ${targetWeightKg} kg)
- Height: ${heightCm} cm
- Activity Level: ${activityLevel}
- Health / Dietary Goal: ${goal.replace(/_/g, " ")}
- Estimated BMR: ${bmr} kcal/day | TDEE: ${tdee} kcal/day
- Target Daily Calories: ${targetCalories} kcal/day
- Target Macros: Protein ${macroTargets.grams.protein}g (${macroTargets.split.proteinPct}%), Carbs ${macroTargets.grams.carbs}g (${macroTargets.split.carbsPct}%), Fat ${macroTargets.grams.fat}g (${macroTargets.split.fatPct}%)
- Dietary Preference: ${preference}
- Food Allergies / Intolerances: ${allergies.length > 0 ? allergies.join(", ") : "None specified"}
- Digestive / Medical Dietary Conditions: ${conditions.length > 0 ? conditions.join(", ") : "None reported"}
- Custom Notes / Food Dislikes: ${notes || "None"}

Communication Guidelines:
1. Speak with warmth, encouragement, and high clinical authority.
2. When answering recipe or meal questions, provide exact macro estimates (Calories, Protein, Carbs, Healthy Fats) and simple preparation steps.
3. Strictly respect the user's dietary preferences (${preference}) and never suggest ingredients containing their allergies (${allergies.join(", ") || "none"}).
4. If the user has specific conditions (like hypertension, diabetes, GERD, PCOS), tailor the dietary guidance accordingly (e.g. low-glycemic, low-sodium, anti-inflammatory).
5. Format your responses beautifully using clear markdown, bullet points, bold text for key nutrients, and short paragraphs for readability.
6. Keep recommendations practical and delicious.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
          geminiApiKey
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: systemPrompt },
                  { text: `Patient Question / Request:\n"${query}"` },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (generatedText && generatedText.trim().length > 0) {
          return generatedText.trim();
        }
      }
    } catch (err) {
      console.warn("[dietChat] Gemini API call failed, switching to clinical engine fallback:", err);
    }
  }

  // 2. Deterministic Clinical Nutrition Fallback Engine
  return generateDeterministicDietResponse(query, {
    patientName,
    weightKg,
    targetCalories,
    macroTargets,
    preference,
    allergies,
    conditions,
    goal,
  });
}

/**
 * Deterministic rule-based response generator for nutrition & diet queries
 */
function generateDeterministicDietResponse(
  query: string,
  ctx: {
    patientName: string;
    weightKg: number;
    targetCalories: number;
    macroTargets: { grams: { protein: number; carbs: number; fat: number } };
    preference: string;
    allergies: string[];
    conditions: string[];
    goal: string;
  }
): string {
  const q = query.toLowerCase();

  // High-protein suggestions
  if (q.includes("protein") || q.includes("muscle") || q.includes("post-workout")) {
    const isVeg = ctx.preference.includes("veg");
    return `### High-Protein Nutrition Blueprint 🥩🌱

To support your target of **${ctx.macroTargets.grams.protein}g protein daily** (calculated for your ${ctx.weightKg}kg profile), here are optimal, bioavailable sources tailored to your **${ctx.preference}** lifestyle:

${
  isVeg
    ? `* **Tempeh & Organic Tofu**: 20g protein per 100g. Rich in isoflavones and gut-friendly probiotics.
* **Edamame & Green Peas**: 18g protein per cup. Excellent fiber-to-protein ratio.
* **Greek Yogurt / Skyr / Paneer**: 15–20g protein per 150g serving. High in leucine for muscle protein synthesis.
* **Lentils & Chickpeas with Quinoa**: Complete amino acid profiles when paired together.`
    : `* **Wild Alaskan Salmon / Trout**: 25g protein per 100g. Abundant in anti-inflammatory Omega-3 fatty acids.
* **Pasture-Raised Eggs & Egg Whites**: 6g protein per large egg, high bioavailability (Biological Value: 100).
* **Skinless Chicken / Turkey Breast**: 31g protein per 100g with minimal saturated fat.
* **Greek Yogurt or Cottage Cheese**: 18g protein per serving, rich in slow-digesting casein.`
}

💡 **Nutritionist Tip**: Spread your protein across 3–4 meals (aim for ~${Math.round(
      ctx.macroTargets.grams.protein / 3
    )}g per meal) to maximize muscle protein synthesis and maintain stable satiety throughout the day.`;
  }

  // Anti-inflammatory suggestions
  if (q.includes("inflammation") || q.includes("inflammatory") || q.includes("joint") || q.includes("recovery")) {
    return `### Anti-Inflammatory Dietary Protocol 🥗✨

Chronic inflammation is significantly attenuated by polyphenol-dense whole foods and healthy lipid ratios. Here is your evidence-based anti-inflammatory meal guide:

1. **Dark Leafy Greens & Cruciferous Veggies**: Kale, wild arugula, broccoli sprouts (sulforaphane), and spinach.
2. **Polyphenol-Dense Berries**: Wild blueberries, blackberries, and pomegranate seeds (combat oxidative stress).
3. **Healthy Monounsaturated & Omega-3 Fats**: Extra virgin cold-pressed olive oil, raw walnuts, chia seeds, and avocado.
4. **Bioactive Spices & Roots**: Fresh grated turmeric (paired with black pepper for piperine absorption) and fresh ginger root.
5. **Polyphenol Hydration**: Ceremonial green tea or matcha containing high concentrations of **EGCG**.

🚫 **Key Items to Minimize**: Ultra-processed seed oils (high Omega-6), refined sucrose, and deep-fried foods.`;
  }

  // Diabetes / Blood Sugar / Low GI
  if (q.includes("diabet") || q.includes("sugar") || q.includes("glucose") || q.includes("hba1c") || q.includes("glycemic")) {
    return `### Blood Sugar Balance & Glycemic Optimization 📉🍎

To promote steady glucose homeostasis and avoid insulin spikes, here is your 4-step metabolic plate blueprint:

* **1. Fiber-First Eating Order**: Eat fibrous leafy greens or raw vegetables first, followed by proteins and healthy fats, and finish with complex carbs. This slows gastric emptying and flattens glucose curves by up to **40%**.
* **2. Low-Glycemic Carbohydrates**: Steel-cut oats, quinoa, black beans, sweet potatoes, and green apples instead of refined flours or white rice.
* **3. Post-Meal Movement**: A brisk 10–15 minute walk following your largest meal activates GLUT-4 transporters, clearing glucose without requiring excessive insulin.
* **4. Cinnamon & Apple Cider Vinegar**: 1 tsp of Ceylon cinnamon or 1 tbsp ACV in water before carb-containing meals helps increase peripheral insulin sensitivity.

Target Daily Calorie Intake: **${ctx.targetCalories} kcal/day** with **${ctx.macroTargets.grams.carbs}g complex carbs**.`;
  }

  // Snacks under 200 kcal
  if (q.includes("snack") || q.includes("200") || q.includes("hunger") || q.includes("cravings")) {
    return `### 4 Satiating Snacks Under 200 kcal 🥑⚡

Here are nutritionist-approved, nutrient-dense snacks that keep energy stable without triggering calorie overages:

1. **Greek Yogurt Crunch Bowl (~165 kcal)**
   - 120g 0% Greek yogurt + 1/3 cup raspberries + 1 tbsp chia seeds
   - *15g Protein | 12g Carbs | 3g Fat*

2. **Crispy Edamame with Sea Salt (~140 kcal)**
   - 1/2 cup steamed edamame pods with pink Himalayan salt & smoked paprika
   - *11g Protein | 9g Carbs | 5g Healthy Fat*

3. **Almond Butter Cucumber Bites (~150 kcal)**
   - 1 sliced English cucumber topped with 1 tbsp raw almond butter and a pinch of cinnamon
   - *4g Protein | 6g Carbs | 9g Fat*

4. **Hard-Boiled Egg & Avocado Slices (~160 kcal)**
   - 1 pastured hard-boiled egg + 1/4 sliced Hass avocado with everything-bagel seasoning
   - *7g Protein | 3g Carbs | 12g Healthy Fat*`;
  }

  // Low Sodium / Hypertension
  if (q.includes("sodium") || q.includes("salt") || q.includes("blood pressure") || q.includes("hypertension") || q.includes("dash")) {
    return `### Low-Sodium & DASH Diet Flavour Swaps 🌿🧂

Managing sodium under **1,800mg/day** does not mean bland meals! Enhance flavor and lower blood pressure with these culinary techniques:

* **Acid Over Salt**: Finish soups, roasted veggies, and proteins with fresh lemon zest, lime juice, or aged balsamic glaze. Acid stimulates the same taste receptors as sodium.
* **Potassium-Rich Counterparts**: Potassium directly prompts renal excretion of sodium. Increase avocado, bananas, spinach, coconut water, and baked potatoes.
* **Aromatic Spice Blends**: Smoked paprika, garlic powder, onion flakes, rosemary, and ground cumin add deep savory (umami) depth with zero sodium.
* **Rinse Canned Legumes**: Rinsing canned beans and chickpeas under cold water removes up to **40% of added processing sodium**.`;
  }

  // Hydration & Water
  if (q.includes("water") || q.includes("hydrate") || q.includes("hydration") || q.includes("drink")) {
    const recLiters = (ctx.weightKg * 0.035).toFixed(1);
    return `### Precision Hydration & Electrolyte Guide 💧

Based on your current body weight of **${ctx.weightKg} kg**, your baseline hydration requirement is approximately **${recLiters} Liters (${Math.round(
      Number(recLiters) * 1000
    )} ml) per day**.

* **Morning Kickstart**: Drink 500ml of room-temperature water with a squeeze of fresh lemon upon waking to rehydrate after cellular respiration.
* **Electrolyte Balance**: If exercising or in warm climates, ensure adequate sodium, potassium, and magnesium rather than drinking plain distilled water in excess.
* **Hydration Checklist**:
  - [ ] 500ml upon waking
  - [ ] 500ml mid-morning
  - [ ] 500ml with lunch
  - [ ] 500ml pre/post workout
  - [ ] 500ml afternoon & dinner`;
  }

  // Default overview
  return `### Hello ${ctx.patientName}! Here is your personalized nutrition overview 🥗

Based on your profile goal (**${ctx.goal.replace(/_/g, " ")}**) and **${ctx.preference}** preference:

* **Daily Energy Target**: **${ctx.targetCalories} kcal/day**
* **Macronutrient Split**:
  - **Protein**: ${ctx.macroTargets.grams.protein}g (${ctx.macroTargets.grams.protein * 4} kcal)
  - **Carbohydrates**: ${ctx.macroTargets.grams.carbs}g (${ctx.macroTargets.grams.carbs * 4} kcal)
  - **Healthy Fats**: ${ctx.macroTargets.grams.fat}g (${ctx.macroTargets.grams.fat * 9} kcal)

How can I assist you right now? You can ask me for:
1. **7-Day Custom Meal Plans** with grocery lists
2. **Instant Recipe Adjustments** & low-sodium or dairy-free swaps
3. **Macro Tracking Guidance** for specific restaurant meals
4. **Nutrient-Dense Snacks** tailored to your cravings`;
}
