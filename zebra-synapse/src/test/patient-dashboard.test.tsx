import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders, mockPatientProfile, mockLabPanels } from "./test-utils";
import PatientDashboard from "../app/pages/patient/PatientDashboard";
import PatientHome from "../app/pages/patient/PatientHome";

// Mock hooks used by PatientHome
vi.mock("../hooks/usePatientLabReports", () => ({
  usePatientLabReports: () => ({
    uploads: [
      {
        id: "upload-1",
        file_name: "blood_test_2026.pdf",
        status: "completed",
        created_at: "2026-02-15T09:30:00Z",
      },
    ],
    uploadLabReport: vi.fn(),
    loading: false,
  }),
}));

vi.mock("../hooks/usePatientLabPanels", () => ({
  usePatientLabPanels: () => ({
    panels: mockLabPanels,
    refetch: vi.fn(),
    loading: false,
  }),
}));

vi.mock("../hooks/useActiveReport", () => ({
  useActiveReport: (panels: any) => ({
    selectedReportId: "report-1",
    setSelectedReportId: vi.fn(),
    activePanel: panels[0] || null,
  }),
}));

// Mock Three.js canvas & sub-canvases
vi.mock("../app/components/DnaCanvas3D", () => ({
  DnaCanvas3D: () => <div data-testid="dna-canvas-mock" />,
}));

describe("Patient Portal Dashboard & Navigation Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PatientDashboard Navigation Shell", () => {
    it("renders all primary menu items and sidebar links", () => {
      renderWithProviders(<PatientDashboard />, { initialEntries: ["/patient"] });

      expect(screen.getByTitle("Health Overview")).toBeInTheDocument();
      expect(screen.getByTitle("Medical Records")).toBeInTheDocument();
      expect(screen.getByTitle("AI Lab Assistant")).toBeInTheDocument();
      expect(screen.getByTitle("Appointments")).toBeInTheDocument();
      expect(screen.getByTitle("Teleconsultation")).toBeInTheDocument();
      expect(screen.getByTitle("Prescription")).toBeInTheDocument();
      expect(screen.getByTitle("Disease Prediction")).toBeInTheDocument();
      expect(screen.getByTitle("Diet & Fitness")).toBeInTheDocument();
      expect(screen.getByTitle("Clinical Trials")).toBeInTheDocument();
      expect(screen.getByTitle("Wellness Tips")).toBeInTheDocument();
      expect(screen.getByTitle("Account settings")).toBeInTheDocument();
      expect(screen.getByTitle("Logout")).toBeInTheDocument();
    });

    it("triggers signOut when clicking logout button", () => {
      const mockSignOut = vi.fn().mockResolvedValue(undefined);
      renderWithProviders(<PatientDashboard />, {
        initialEntries: ["/patient"],
        authOverrides: { signOut: mockSignOut },
      });

      const logoutBtn = screen.getByTitle("Logout");
      fireEvent.click(logoutBtn);
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe("PatientHome 3D Health Dashboard", () => {
    it("renders patient summary and organ system hotspots", () => {
      renderWithProviders(<PatientHome />, {
        authOverrides: { profile: mockPatientProfile },
      });

      // Verifies organ systems mapped from mock lab results
      expect(screen.getAllByText(/Heart/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Blood Cells/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Lungs/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Stomach/i).length).toBeGreaterThan(0);
    });

    it("renders quick health metrics and panel information", () => {
      renderWithProviders(<PatientHome />, {
        authOverrides: { profile: mockPatientProfile },
      });

      // Verifies patient name
      expect(screen.getAllByText(/Maya Thompson/i).length).toBeGreaterThan(0);
    });
  });
});
