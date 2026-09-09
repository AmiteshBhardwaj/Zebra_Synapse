import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders, mockPatientProfile, mockLabPanels } from "./test-utils";
import PatientLabChat from "../app/pages/patient/PatientLabChat";
import Appointments from "../app/pages/patient/Appointments";
import Prescription from "../app/pages/patient/Prescription";
import PatientTeleconsult from "../app/pages/patient/PatientTeleconsult";

// Mock teleconsult components
vi.mock("../app/components/teleconsult/VideoCall", () => ({
  default: () => <div data-testid="video-call-mock">Video Call Interface</div>,
}));

vi.mock("../app/components/teleconsult/RealtimeNote", () => ({
  default: () => <div data-testid="realtime-note-mock">Realtime Clinical Notes</div>,
}));

// Mock Three.js mascot in PatientLabChat
vi.mock("../app/components/patient/MascotRobot3D", () => ({
  MascotRobot3D: () => <div data-testid="robot-mascot-mock" />,
}));

// Mock hooks
vi.mock("../hooks/usePatientLabReports", () => ({
  usePatientLabReports: () => ({
    uploads: [
      {
        id: "upload-1",
        original_filename: "metabolic_panel.pdf",
        status: "completed",
        created_at: "2026-02-15T09:30:00Z",
      },
    ],
    hasLabReports: true,
    loading: false,
  }),
}));

vi.mock("../hooks/usePatientLabPanels", () => ({
  usePatientLabPanels: () => ({
    panels: mockLabPanels,
    hasPanels: true,
    loading: false,
  }),
}));

vi.mock("../hooks/usePatientLabReportExtractions", () => ({
  usePatientLabReportExtractions: () => ({
    extractions: [],
    loading: false,
  }),
}));

// Mock chat and prescription services
vi.mock("../lib/labReportChat", () => ({
  fetchPatientAllQueries: vi.fn().mockResolvedValue([
    {
      id: "query-1",
      patient_id: "patient-123",
      report_id: "upload-1",
      question: "Why do I feel dizzy and weak?",
      answer: "Your potassium level of 3.2 mEq/L is slightly below normal.",
      verification_status: "verified",
      doctor_verification_note: "Patient advised on potassium foods.",
      created_at: "2026-02-16T10:00:00Z",
    },
  ]),
  fetchQueriesForReport: vi.fn().mockResolvedValue([]),
  clearQueriesForReport: vi.fn().mockResolvedValue(undefined),
  submitLabReportQuery: vi.fn(),
  generateLabReportAiAnswer: vi.fn(),
  isMedicalClinicalQuery: vi.fn().mockReturnValue(true),
}));

describe("Patient Portal Interactive Services Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PatientLabChat AI Grounded Assistant", () => {
    it("renders clinical chat interface with prompt suggestions", async () => {
      renderWithProviders(<PatientLabChat />, {
        authOverrides: { profile: mockPatientProfile },
      });

      expect(screen.getAllByText(/Why am I weak & tired\?/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Check Blood Sugar & HbA1c/i).length).toBeGreaterThan(0);
      expect(
        screen.getByPlaceholderText(/Type a thought or symptom/i)
      ).toBeInTheDocument();
    });
  });

  describe("Appointments Component", () => {
    it("renders appointment management header and schedule trigger", () => {
      renderWithProviders(<Appointments />);

      expect(screen.getAllByText(/Appointments/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Schedule/i).length).toBeGreaterThan(0);
    });
  });

  describe("Prescription Component", () => {
    it("renders patient medications list and prescription categories", async () => {
      renderWithProviders(<Prescription />);

      expect(screen.getAllByText(/Prescriptions/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Active Prescriptions/i)).toBeInTheDocument();
    });
  });

  describe("PatientTeleconsult Component", () => {
    it("renders teleconsultation matching lobby when no room id provided", () => {
      renderWithProviders(<PatientTeleconsult />, { initialEntries: ["/patient/teleconsult"] });

      expect(screen.getAllByText(/Teleconsultation/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Instant Teleconsultation Matching/i)).toBeInTheDocument();
      expect(screen.getByText(/Start Searching for Doctors/i)).toBeInTheDocument();
    });

    it("renders active call video and realtime note view when room id is provided", () => {
      renderWithProviders(<PatientTeleconsult />, {
        initialEntries: ["/patient/teleconsult?id=consult-session-123"],
      });

      expect(screen.getByTestId("video-call-mock")).toBeInTheDocument();
      expect(screen.getByTestId("realtime-note-mock")).toBeInTheDocument();
    });
  });
});
