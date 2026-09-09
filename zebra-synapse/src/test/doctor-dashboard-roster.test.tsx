import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders, mockDoctorProfile, mockDoctorUser } from "./test-utils";
import DoctorDashboard from "../app/pages/doctor/DoctorDashboard";
import PatientsList from "../app/pages/doctor/PatientsList";
import DoctorPatientsDirectory from "../app/pages/doctor/DoctorPatientsDirectory";

// Mock care relationships
vi.mock("../lib/careRelationships", () => ({
  CARE_RELATIONSHIPS_LIST_SELECT: "*",
  CARE_RELATIONSHIPS_FALLBACK_SELECT: "*",
  mapRowToListItem: (row: any) => ({
    patientId: row.patient_id,
    name: "Maya Thompson",
    lastVisit: "2026-02-15",
    primaryCondition: "Mild Hypertension",
    riskFlags: ["High Total Cholesterol"],
    biomarkers: { total_cholesterol: 215 },
    vitals: { blood_pressure: "125/82", status: "normal" },
  }),
}));

// Mock doctor appointments preserving constants like TIME_SLOTS
vi.mock("../lib/doctorAppointments", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/doctorAppointments")>();
  return {
    ...actual,
    loadDoctorAppointments: () => [
      {
        id: "apt-1",
        patientId: "patient-123",
        patientName: "Maya Thompson",
        time: "9:30 AM",
        type: "teleconsult",
        status: "scheduled",
        condition: "Hypertension Checkup",
      },
    ],
    saveDoctorAppointments: vi.fn(),
  };
});

// Mock supabase client
vi.mock("../lib/supabase", () => ({
  getSupabase: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: "care-1",
                patient_id: "patient-123",
                doctor_id: "doctor-123",
                patient: {
                  id: "patient-123",
                  full_name: "Maya Thompson",
                },
              },
            ],
            error: null,
          }),
        }),
      }),
    }),
  }),
  isSupabaseConfigured: () => true,
  withAuthTimeout: (promise: any) => Promise.resolve(promise),
}));

describe("Doctor Portal Dashboard & Roster Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("DoctorDashboard Shell Component", () => {
    it("renders doctor sidebar branding and all primary navigation items", () => {
      renderWithProviders(<DoctorDashboard />, {
        initialEntries: ["/doctor"],
        authOverrides: { profile: mockDoctorProfile, user: mockDoctorUser as any },
      });

      expect(screen.getByText(/Doctor Portal/i)).toBeInTheDocument();
      expect(screen.getByTitle("Home")).toBeInTheDocument();
      expect(screen.getByTitle("Patients")).toBeInTheDocument();
      expect(screen.getByTitle("Appointments")).toBeInTheDocument();
      expect(screen.getByTitle("Teleconsultations")).toBeInTheDocument();
      expect(screen.getByTitle("Patient Messages")).toBeInTheDocument();
      expect(screen.getByTitle("Account Settings")).toBeInTheDocument();
      expect(screen.getByTitle("Logout")).toBeInTheDocument();
    });

    it("triggers signOut when clicking logout button in doctor sidebar", () => {
      const mockSignOut = vi.fn().mockResolvedValue(undefined);
      renderWithProviders(<DoctorDashboard />, {
        initialEntries: ["/doctor"],
        authOverrides: {
          profile: mockDoctorProfile,
          user: mockDoctorUser as any,
          signOut: mockSignOut,
        },
      });

      const logoutBtn = screen.getByTitle("Logout");
      fireEvent.click(logoutBtn);
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe("PatientsList Home View", () => {
    it("renders clinician shift greeting and visits count summary", async () => {
      renderWithProviders(<PatientsList />, {
        authOverrides: { profile: mockDoctorProfile, user: mockDoctorUser as any },
      });

      expect(screen.getAllByText(/Dr\. Amelia Hart/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Visits for Today/i)).toBeInTheDocument();
      expect(screen.getByText(/Active Shift/i)).toBeInTheDocument();
    });
  });

  describe("DoctorPatientsDirectory Component", () => {
    it("renders patients directory and load patient records", async () => {
      renderWithProviders(<DoctorPatientsDirectory />, {
        authOverrides: { profile: mockDoctorProfile, user: mockDoctorUser as any },
      });

      expect(await screen.findByText(/Maya Thompson/i)).toBeInTheDocument();
    });
  });
});
