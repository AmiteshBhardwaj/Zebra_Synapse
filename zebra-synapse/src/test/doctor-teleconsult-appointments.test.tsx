import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders, mockDoctorProfile, mockDoctorUser } from "./test-utils";
import DoctorAppointments from "../app/pages/doctor/DoctorAppointments";
import QuickScheduleAppointmentDialog from "../app/pages/doctor/QuickScheduleAppointmentDialog";
import DoctorTeleconsult from "../app/pages/doctor/DoctorTeleconsult";
import DoctorPatientChat from "../app/pages/doctor/DoctorPatientChat";
import PostConsultationWrapUp from "../app/components/teleconsult/PostConsultationWrapUp";
import PatientDoctorChat from "../app/pages/patient/PatientDoctorChat";
import { fetchDoctorPatientMessages, getAllGlobalMessages, saveGlobalMessages } from "../lib/doctorPatientChat";
import { mockPatientProfile, mockUser } from "./test-utils";

// Mock Supabase
vi.mock("../lib/supabase", () => {
  const createQueryChain = () => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      neq: vi.fn(() => chain),
      or: vi.fn(() => chain),
      order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
      channel: () => ({
        on: () => ({ subscribe: () => ({}) }),
        subscribe: () => ({}),
      }),
      then: (resolve: any) => resolve({ data: [], error: null }),
    };
    return chain;
  };

  return {
    getSupabase: () => ({
      from: () => createQueryChain(),
      channel: () => {
        const ch: any = {
          on: vi.fn(() => ch),
          subscribe: vi.fn(() => ch),
          send: vi.fn(),
        };
        return ch;
      },
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

describe("Teleconsultation Post-Call Note Delivery Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders dedicated note writing interface on call wrap-up and sends note directly to patient messages", async () => {
    const continueFn = vi.fn();
    const openPatientFn = vi.fn();
    const returnDashboardFn = vi.fn();

    renderWithProviders(
      <PostConsultationWrapUp
        consultationId="consult-test-888"
        patientId="pat_maya_thompson"
        patientName="Maya Thompson"
        callDurationSec={245}
        initialNotes="Initial blood pressure reading 118/78 mmHg. Patient reports good tolerance."
        waitingQueueCount={2}
        onContinueTeleconsult={continueFn}
        onOpenPatientDetail={openPatientFn}
        onReturnToDashboard={returnDashboardFn}
      />,
      {
        initialEntries: ["/doctor/teleconsult"],
        authOverrides: { profile: mockDoctorProfile, user: mockDoctorUser as any },
      }
    );

    // Verify only the note writing workstation is shown
    expect(screen.getByText(/Teleconsultation Note for Maya Thompson/i)).toBeInTheDocument();
    expect(screen.getByText(/Write Teleconsultation Note/i)).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(/Initial blood pressure reading 118\/78 mmHg/i)
    ).toBeInTheDocument();

    const sendBtn = screen.getByRole("button", { name: /Send Note to Patient Messages/i });
    expect(sendBtn).toBeInTheDocument();

    // Doctor clicks send note
    fireEvent.click(sendBtn);

    // Verify delivery confirmation
    expect(await screen.findByText(/Note Sent to Maya Thompson's Messages/i)).toBeInTheDocument();
    expect(screen.getByText(/Return to Live Waiting Queue/i)).toBeInTheDocument();

    // Verify message is saved to universal messages store with teleconsultation note attachment
    const messages = getAllGlobalMessages();
    const teleNoteMsg = messages.find((m) => m.content.includes("consult-test-888"));
    expect(teleNoteMsg).toBeDefined();
    expect(teleNoteMsg?.attachments?.[0]?.metadata?.type).toBe("teleconsultation_note");
    expect(teleNoteMsg?.sender_role).toBe("doctor");
  });

  it("renders PatientDoctorChat displaying received teleconsultation note with specialized card", async () => {
    // Seed a teleconsultation note in universal storage for patient-123
    const seededNote = {
      id: "msg-tele-test-1",
      doctor_id: "doc_amelia_hart",
      patient_id: "patient-123",
      sender_id: "doc_amelia_hart",
      sender_role: "doctor" as const,
      doctor_name: "Dr. Amelia Hart",
      patient_name: "Maya Thompson",
      content: "📋 TELECONSULTATION CLINICAL NOTE\nSession: #consult-test-888\nDuration: 04m 05s\nConsulting Doctor: Dr. Amelia Hart\n\nPatient advised to maintain hydration and continue routine BP logs.",
      attachments: [
        {
          type: "document" as const,
          title: "Teleconsultation Note",
          metadata: { type: "teleconsultation_note", consultationId: "consult-test-888" },
        },
      ],
      is_read: false,
      created_at: new Date().toISOString(),
    };
    saveGlobalMessages([seededNote]);

    const fetched = await fetchDoctorPatientMessages(
      "doc_amelia_hart",
      "patient-123",
      "Dr. Amelia Hart",
      "Maya Thompson"
    );
    expect(fetched.length).toBe(1);
    expect(fetched[0].content).toContain("TELECONSULTATION CLINICAL NOTE");

    renderWithProviders(<PatientDoctorChat />, {
      initialEntries: ["/patient/teleconsult?tab=messages&doctorId=doc_amelia_hart"],
      authOverrides: { profile: mockPatientProfile, user: mockUser as any },
    });

    const noteElements = await screen.findAllByText(/Teleconsultation Clinical Note/i);
    expect(noteElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/Official Doctor Encounter Record/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Patient advised to maintain hydration and continue routine BP logs/i)
    ).toBeInTheDocument();
  });
});

