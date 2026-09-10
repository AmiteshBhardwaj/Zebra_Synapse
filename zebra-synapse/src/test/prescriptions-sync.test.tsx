import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  fetchPatientPrescriptions,
  createPrescription,
  updatePrescriptionStatus,
  subscribePrescriptions,
  getStoredPrescriptions,
  prescriptionHeading,
  prescriptionInstructions,
} from "../lib/prescriptions";
import Prescription from "../app/pages/patient/Prescription";
import { renderWithProviders } from "./test-utils";

vi.mock("../lib/supabase", () => ({
  getSupabase: () => null,
  isSupabaseConfigured: () => false,
}));

describe("Prescriptions Synchronization Service", () => {
  const mockPatientId = "test-patient-sync-101";

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("fetches baseline prescriptions and saves them to local storage when database is clean", async () => {
    const mockSb = null; // offline / fallback
    const list = await fetchPatientPrescriptions(mockSb, mockPatientId);

    expect(list.length).toBeGreaterThan(0);
    const active = list.filter((r) => r.status === "active");
    expect(active.length).toBe(3);
    expect(active[0].details).toContain("Metformin Hydrochloride");

    // Local storage should also have been populated
    const stored = getStoredPrescriptions(mockPatientId);
    expect(stored.length).toBe(list.length);
  });

  it("creates a new prescription, stores it, and triggers sync", async () => {
    const mockSb = null;
    const syncCallback = vi.fn();
    const unsub = subscribePrescriptions(mockSb, mockPatientId, syncCallback);

    const result = await createPrescription(mockSb, {
      patientId: mockPatientId,
      prescribedBy: "doc-123",
      prescriberName: "Dr. Gregory House",
      details: "Amoxicillin 250mg\nTake 1 tablet every 8 hours with water.",
      status: "active",
    });

    expect(result.data).not.toBeNull();
    expect(result.data?.details).toContain("Amoxicillin 250mg");

    // Verify localStorage has the new prescription at the top
    const stored = getStoredPrescriptions(mockPatientId);
    expect(stored[0].details).toContain("Amoxicillin 250mg");

    // Verify sync event fired
    expect(syncCallback).toHaveBeenCalled();

    unsub();
  });

  it("updates prescription status to completed and synchronizes cache", async () => {
    const mockSb = null;
    const syncCallback = vi.fn();
    const unsub = subscribePrescriptions(mockSb, mockPatientId, syncCallback);

    // Initial baseline
    const list = await fetchPatientPrescriptions(mockSb, mockPatientId);
    const firstActive = list.find((r) => r.status === "active");
    expect(firstActive).toBeDefined();

    const updateRes = await updatePrescriptionStatus(mockSb, {
      id: firstActive!.id,
      patientId: mockPatientId,
      status: "completed",
    });

    expect(updateRes.success).toBe(true);

    // Verify localStorage has updated status
    const stored = getStoredPrescriptions(mockPatientId);
    const updatedItem = stored.find((r) => r.id === firstActive!.id);
    expect(updatedItem?.status).toBe("completed");
    expect(updatedItem?.completed_at).not.toBeNull();

    expect(syncCallback).toHaveBeenCalled();
    unsub();
  });

  it("correctly separates headings and instruction details", () => {
    const raw = "Lipitor 20mg\nTake 1 tablet at night with food.";
    expect(prescriptionHeading(raw)).toBe("Lipitor 20mg");
    expect(prescriptionInstructions(raw)).toBe("Take 1 tablet at night with food.");
  });

  it("renders Prescription patient page with active medications and instruction details", async () => {
    renderWithProviders(<Prescription />);

    await waitFor(() => {
      expect(screen.getByText(/Active Prescriptions/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Metformin Hydrochloride/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Atorvastatin Calcium/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Past Prescriptions/i)).toBeInTheDocument();
      expect(screen.getByText(/Amoxicillin 500mg/i)).toBeInTheDocument();
    });
  });
});
