import React, { type ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Profile } from "../auth/types";
import { vi } from "vitest";

export const mockPatientProfile: Profile = {
  id: "patient-123",
  role: "patient",
  full_name: "Maya Thompson",
  age: 32,
  gender: "Female",
  blood_type: "A+",
  height_cm: 168,
  weight_kg: 62,
  dietary_preference: "vegetarian",
  food_allergies: ["peanuts"],
  dietary_conditions: ["mild hypertension"],
  dietary_notes: "Prefers low sodium meals",
};

export const mockDoctorProfile: Profile = {
  id: "doctor-123",
  role: "doctor",
  full_name: "Dr. Amelia Hart",
  license_number: "MD-99214-CAR",
};

export const mockUser = {
  id: "patient-123",
  email: "maya.thompson@example.com",
};

export const mockDoctorUser = {
  id: "doctor-123",
  email: "dr.hart@example.com",
};

export const mockLabPanels = [
  {
    id: "panel-1",
    user_id: "patient-123",
    panel_name: "Comprehensive Metabolic Panel",
    lab_name: "BioReference Laboratories",
    collection_date: "2026-02-15T09:30:00Z",
    created_at: "2026-02-15T09:30:00Z",
    report_id: "report-1",
    results: [
      { name: "Hemoglobin", value: 13.8, unit: "g/dL", range: "12.0-15.5", status: "normal" },
      { name: "Fasting Blood Glucose", value: 92, unit: "mg/dL", range: "70-99", status: "normal" },
      { name: "Total Cholesterol", value: 215, unit: "mg/dL", range: "<200", status: "high" },
      { name: "Serum Creatinine", value: 0.9, unit: "mg/dL", range: "0.6-1.2", status: "normal" },
      { name: "Potassium", value: 3.2, unit: "mEq/L", range: "3.5-5.0", status: "low" },
      { name: "Vitamin D (25-OH)", value: 24, unit: "ng/mL", range: "30-100", status: "low" },
    ],
  },
  {
    id: "panel-2",
    user_id: "patient-123",
    panel_name: "Lipid Profile & Cardiac Risk",
    lab_name: "Quest Diagnostics",
    collection_date: "2026-01-10T08:00:00Z",
    created_at: "2026-01-10T08:00:00Z",
    report_id: "report-2",
    results: [
      { name: "Total Cholesterol", value: 228, unit: "mg/dL", range: "<200", status: "high" },
      { name: "HDL Cholesterol", value: 48, unit: "mg/dL", range: ">50", status: "low" },
      { name: "LDL Cholesterol", value: 142, unit: "mg/dL", range: "<100", status: "high" },
      { name: "Triglycerides", value: 165, unit: "mg/dL", range: "<150", status: "high" },
    ],
  },
];

import { AuthContext, type AuthContextValue } from "../auth/AuthContext";

export interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  initialEntries?: string[];
  authOverrides?: Partial<AuthContextValue>;
}

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  { initialEntries = ["/"], authOverrides = {}, ...renderOptions }: RenderWithProvidersOptions = {}
) {
  const queryClient = createTestQueryClient();

  const defaultAuthValue: AuthContextValue = {
    session: null,
    user: mockUser as any,
    profile: mockPatientProfile,
    loading: false,
    configured: true,
    refreshProfile: vi.fn().mockResolvedValue(undefined),
    updateProfile: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue(undefined),
    setDemoSession: vi.fn(),
    ...authOverrides,
  };

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={defaultAuthValue}>
          <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  }

  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), queryClient };
}
