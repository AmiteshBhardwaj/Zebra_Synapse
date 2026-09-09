import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders, mockDoctorProfile, mockDoctorUser } from "./test-utils";
import DoctorAppointments from "../app/pages/doctor/DoctorAppointments";
import QuickScheduleAppointmentDialog from "../app/pages/doctor/QuickScheduleAppointmentDialog";
import DoctorTeleconsult from "../app/pages/doctor/DoctorTeleconsult";
import DoctorPatientChat from "../app/pages/doctor/DoctorPatientChat";

// Mock Supabase
vi.mock("../lib/supabase", () => {
  return {
    getSupabase: () => ({
      from: () => ({
        select: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockResolvedValue({ data: null, error: null }),
        channel: () => ({
          on: () => ({ subscribe: () => ({}) }),
          subscribe: () => ({}),
        }),
      }),
      channel: () => ({
        on: () => ({ subscribe: () => ({}) }),
        subscribe: () => ({}),
        send: vi.fn(),
      }),
      removeChannel: vi.fn(),
    }),
    isSupabaseConfigured: () => true,
    withAuthTimeout: (p: any) => Promise.resolve(p),
  };
});

// Partial mock doctorAppointments to preserve TIME_SLOTS and constants
vi.mock("../lib/doctorAppointments", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/doctorAppointments")>();
  return {
    ...actual,
    loadDoctorAppointments: vi.fn().mockReturnValue([
      {
        id: "apt-1",
        patientId: "patient-1",
        patientName: "Maya Thompson",
        date: "2026-08-15",
        time: "10:00 AM",
        type: "teleconsult",
        status: "Confirmed",
        condition: "Hypertension review",
        urgency: "priority",
        createdAt: "2026-08-10T09:00:00Z",
      },
      {
        id: "apt-2",
        patientId: "patient-2",
        patientName: "Liam Carter",
        date: "2026-08-15",
        time: "02:30 PM",
        type: "in-person",
        status: "Confirmed",
        condition: "Routine checkup",
        urgency: "normal",
        createdAt: "2026-08-10T09:00:00Z",
      },
    ]),
    saveDoctorAppointments: vi.fn(),
  };
});

describe("Doctor Appointments & Scheduling Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders DoctorAppointments with schedule list, metrics, and filter controls", async () => {
    renderWithProviders(<DoctorAppointments />, {
      initialEntries: ["/doctor/appointments"],
      authOverrides: { profile: mockDoctorProfile, user: mockDoctorUser as any },
    });

    expect(screen.getByText(/Maya Thompson/i)).toBeInTheDocument();
    expect(screen.getByText(/10:00 AM/i)).toBeInTheDocument();
    expect(screen.getByText(/Hypertension review/i)).toBeInTheDocument();
  });

  it("opens QuickScheduleAppointmentDialog and renders appointment creation fields", async () => {
    const mockPatients = [
      {
        relationshipId: "rel-1",
        patientId: "patient-1",
        name: "Maya Thompson",
        email: "maya@example.com",
        phone: "+1-555-0101",
        healthStatus: "normal" as const,
        condition: "Hypertension",
        assignedDate: "2026-02-15",
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        heartRate: 72,
        glucose: 90,
        lastVisitLabel: "Today",
        vitals: {
          heartRate: 72,
          bloodPressure: "120/80 mmHg",
          glucose: 90,
          status: "normal" as const,
        },
        riskFlags: [],
      },
    ];

    renderWithProviders(
      <QuickScheduleAppointmentDialog
        patients={mockPatients}
        trigger={<button>Open Schedule Dialog</button>}
      />,
      {
        authOverrides: { profile: mockDoctorProfile, user: mockDoctorUser as any },
      }
    );

    const openBtn = screen.getByRole("button", { name: /open schedule dialog/i });
    fireEvent.click(openBtn);

    expect(await screen.findByText(/Schedule Consultation/i)).toBeInTheDocument();
    expect(screen.getByText(/^Patient$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Date$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Time Slot$/i)).toBeInTheDocument();
    expect(screen.getByText(/Consultation Type/i)).toBeInTheDocument();
  });
});

describe("Doctor Teleconsult & Live Consultation Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders DoctorTeleconsult waiting room queue when no active call is present", async () => {
    renderWithProviders(<DoctorTeleconsult />, {
      initialEntries: ["/doctor/teleconsult"],
      authOverrides: { profile: mockDoctorProfile, user: mockDoctorUser as any },
    });

    expect(screen.getByText(/Patients Seeking Instant Teleconsultation/i)).toBeInTheDocument();
    expect(screen.getByText(/Real-time waiting queue/i)).toBeInTheDocument();
  });

  it("renders DoctorTeleconsult in-call interface when room ID is provided in search params", async () => {
    renderWithProviders(<DoctorTeleconsult />, {
      initialEntries: ["/doctor/teleconsult?id=room-test-123&patient=Maya+Thompson&patientId=patient-1"],
      authOverrides: { profile: mockDoctorProfile, user: mockDoctorUser as any },
    });

    const matches = await screen.findAllByText(/Maya Thompson/i);
    expect(matches.length).toBeGreaterThan(0);
    expect(screen.getByText(/Live Virtual Clinic & Video Consult/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Type notes here/i)).toBeInTheDocument();
  });
});

describe("Doctor Patient Chat Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders DoctorPatientChat with patient list and search input", async () => {
    renderWithProviders(<DoctorPatientChat />, {
      initialEntries: ["/doctor/chat"],
      authOverrides: { profile: mockDoctorProfile, user: mockDoctorUser as any },
    });

    expect(screen.getByPlaceholderText(/Search linked patients/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Maya Thompson/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Liam Carter/i).length).toBeGreaterThan(0);
  });
});
