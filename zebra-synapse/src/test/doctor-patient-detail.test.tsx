import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, mockDoctorProfile, mockDoctorUser } from "./test-utils";
import PatientDetail from "../app/pages/doctor/PatientDetail";

// Mock router useParams
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useParams: () => ({ patientId: "patient-123" }),
  };
});

// Mock query verification lib
vi.mock("../lib/labReportChat", () => ({
  verifyLabReportQuery: vi.fn().mockResolvedValue({ success: true }),
  rejectAndReplaceLabReportQuery: vi.fn().mockResolvedValue({ success: true }),
  isMedicalClinicalQuery: vi.fn().mockReturnValue(true),
  fetchDoctorPatientQueries: vi.fn().mockResolvedValue([
    {
      id: "query-123",
      patient_id: "patient-123",
      report_id: "upload-1",
      user_query: "Why do I feel dizzy and weak?",
      answer: "Your potassium level of 3.2 mEq/L is slightly below the normal reference range (3.5-5.0).",
      status: "pending_review",
      doctor_response: null,
      doctor_notes: null,
      created_at: "2026-02-16T10:00:00Z",
    },
  ]),
}));

// Mock Supabase
vi.mock("../lib/supabase", () => {
  const mockCareRelationship = {
    id: "care-1",
    patient_id: "patient-123",
    doctor_id: "doctor-123",
    health_status: "normal",
    blood_pressure_systolic: 122,
    blood_pressure_diastolic: 80,
    heart_rate: 72,
    glucose: 92,
    created_at: "2026-02-15T10:00:00Z",
    patient: {
      id: "patient-123",
      full_name: "Maya Thompson",
      age: 32,
      gender: "female",
      blood_type: "A+",
      height_cm: 168,
      weight_kg: 62,
      dietary_preference: "vegetarian",
    },
  };

  const mockQuery = {
    id: "query-123",
    patient_id: "patient-123",
    report_id: "upload-1",
    question: "Why do I feel dizzy and weak?",
    answer: "Your potassium level of 3.2 mEq/L is slightly below the normal reference range (3.5-5.0).",
    status: "pending_review",
    doctor_response: null,
    doctor_notes: null,
    created_at: "2026-02-16T10:00:00Z",
  };

  const mockPrescription = {
    id: "rx-1",
    patient_id: "patient-123",
    prescribed_by: "doctor-123",
    details: "Atorvastatin 20mg\nTake once daily at bedtime",
    status: "active",
    created_at: "2026-02-15T12:00:00Z",
  };

  const createQueryBuilder = (table: string) => {
    const builder: any = {
      eq: () => builder,
      order: () => builder,
      maybeSingle: () => Promise.resolve({ data: mockCareRelationship, error: null }),
      select: () => builder,
      then: (resolve: any) => {
        if (table === "lab_report_queries") {
          return resolve({ data: [mockQuery], error: null });
        }
        if (table === "prescriptions") {
          return resolve({ data: [mockPrescription], error: null });
        }
        if (table === "care_relationships") {
          return resolve({ data: [mockCareRelationship], error: null });
        }
        return resolve({ data: [], error: null });
      },
    };
    return builder;
  };

  return {
    getSupabase: () => ({
      from: (table: string) => ({
        select: () => createQueryBuilder(table),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
    isSupabaseConfigured: () => true,
    withAuthTimeout: (p: any) => Promise.resolve(p),
  };
});

describe("Doctor Portal Patient Detail Chart & Clinical Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders patient chart with demographic details, vitals, and tabs", async () => {
    renderWithProviders(<PatientDetail />, {
      initialEntries: ["/doctor/patient/patient-123"],
      authOverrides: { profile: mockDoctorProfile, user: mockDoctorUser as any },
    });

    expect(await screen.findByText(/Maya Thompson/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /lab results/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /ai chat reviews/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /medications/i })).toBeInTheDocument();
  });

  it("renders clinical tab triggers and patient navigation", async () => {
    renderWithProviders(<PatientDetail />, {
      initialEntries: ["/doctor/patient/patient-123"],
      authOverrides: { profile: mockDoctorProfile, user: mockDoctorUser as any },
    });

    expect(await screen.findByText(/Maya Thompson/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to patients/i })).toBeInTheDocument();

    const user = userEvent.setup();
    const queriesTab = screen.getByRole("tab", { name: /ai chat reviews/i });
    await user.click(queriesTab);
    expect(await screen.findByText(/Why do I feel dizzy and weak\?/i)).toBeInTheDocument();
  });
});
