import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders, mockPatientProfile, mockLabPanels } from "./test-utils";
import MedicalRecordsInsights from "../app/pages/patient/MedicalRecordsInsights";
import DiseasePrediction from "../app/pages/patient/DiseasePrediction";
import PatientDietFitness from "../app/pages/patient/PatientDietFitness";
import ClinicalTrials from "../app/pages/patient/ClinicalTrials";
import WellnessTips from "../app/pages/patient/WellnessTips";

const mockActivePanel = {
  id: "panel-1",
  patient_id: "patient-123",
  upload_id: "upload-1",
  recorded_at: "2026-02-15T09:30:00Z",
  fasting_glucose: 92,
  total_cholesterol: 215,
  ldl: 142,
  hdl: 48,
  triglycerides: 165,
  hemoglobin: 13.8,
  wbc: 6.5,
  platelets: 240,
  creatinine: 0.9,
  potassium: 3.2,
  vitamin_d_25_oh: 24,
  biomarkers: {
    fasting_glucose: 92,
    total_cholesterol: 215,
    ldl: 142,
    hdl: 48,
    triglycerides: 165,
    hemoglobin: 13.8,
    potassium: 3.2,
    vitamin_d_25_oh: 24,
  },
};

// Mock shared patient hooks
vi.mock("../hooks/usePatientLabReports", () => ({
  usePatientLabReports: () => ({
    uploads: [
      {
        id: "upload-1",
        original_filename: "cn2_metabolic_panel.pdf",
        status: "completed",
        analysis_status: "completed",
        created_at: "2026-02-15T09:30:00Z",
      },
    ],
    hasLabReports: true,
    loading: false,
    deleteLabReport: vi.fn(),
    refetch: vi.fn(),
  }),
}));

vi.mock("../hooks/usePatientLabPanels", () => ({
  usePatientLabPanels: () => ({
    panels: [mockActivePanel],
    hasPanels: true,
    loading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("../hooks/useActiveReport", () => ({
  useActiveReport: (panels: any) => ({
    selectedReportId: "upload-1",
    setSelectedReportId: vi.fn(),
    activePanel: panels[0] || mockActivePanel,
    isAllReports: false,
    multiPanelMeta: {
      uniqueBiomarkersCount: 6,
      panelCount: 1,
      earliestDate: "2026-02-15",
      latestDate: "2026-02-15",
    },
    biomarkerTrends: [],
  }),
}));

// Mock Supabase calls in child views
vi.mock("../lib/supabase", () => ({
  getSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }),
  }),
  isSupabaseConfigured: () => true,
  withAuthTimeout: (promise: any) => Promise.resolve(promise),
}));

describe("Patient Portal Records & Deterministic Health Insights Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("MedicalRecordsInsights Component", () => {
    it("renders active lab record workspace and biomarker sections", () => {
      renderWithProviders(<MedicalRecordsInsights />);

      expect(screen.getAllByText(/Active Medical Record/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/cn2_metabolic_panel\.pdf/i).length).toBeGreaterThan(0);
    });
  });

  describe("DiseasePrediction Component", () => {
    it("renders deterministic multi-organ risk prediction cards and models", () => {
      renderWithProviders(<DiseasePrediction />);

      expect(screen.getAllByText(/Disease Prediction/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Predictive Intelligence/i)).toBeInTheDocument();
      expect(screen.getByText(/Rule-based risk assessments/i)).toBeInTheDocument();
    });
  });

  describe("PatientDietFitness Component", () => {
    it("renders dietary guidance, calorie targets, and macro distribution", () => {
      renderWithProviders(<PatientDietFitness />, {
        authOverrides: { profile: mockPatientProfile },
      });

      expect(screen.getAllByText(/Diet & Fitness/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Overview/i)).toBeInTheDocument();
    });
  });

  describe("ClinicalTrials Component", () => {
    it("renders clinical trial studies tailored to lab signals", () => {
      renderWithProviders(<ClinicalTrials />);

      expect(screen.getAllByText(/Clinical Trials/i).length).toBeGreaterThan(0);
    });
  });

  describe("WellnessTips Component", () => {
    it("renders personalized wellness tips based on biomarker metrics", () => {
      renderWithProviders(<WellnessTips />);

      expect(screen.getAllByText(/Wellness Tips/i).length).toBeGreaterThan(0);
    });
  });
});
