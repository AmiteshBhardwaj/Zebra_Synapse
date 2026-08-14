export type UserRole = "patient" | "doctor";

export type DietaryPreference =
  | "omnivore"
  | "vegetarian"
  | "vegan"
  | "eggetarian"
  | "pescatarian"
  | "jain"
  | "keto"
  | "halal"
  | "kosher"
  | (string & {});

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string | null;
  license_number?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  dietary_preference?: DietaryPreference | null;
  food_allergies?: string[] | null;
  dietary_conditions?: string[] | null;
  dietary_notes?: string | null;
};

