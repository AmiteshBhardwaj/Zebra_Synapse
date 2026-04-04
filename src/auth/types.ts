export type UserRole = "patient" | "doctor";

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string | null;
  license_number: string | null;
};
