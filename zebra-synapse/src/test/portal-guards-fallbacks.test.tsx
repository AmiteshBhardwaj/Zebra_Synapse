import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { Routes, Route } from "react-router";
import { renderWithProviders, mockPatientProfile, mockUser, mockDoctorProfile, mockDoctorUser } from "./test-utils";
import RequirePatientPortal from "../app/layouts/RequirePatientPortal";
import RequireDoctorPortal from "../app/layouts/RequireDoctorPortal";
import { ErrorBoundary } from "../app/components/ErrorBoundary";
import ProfileSettings from "../app/pages/ProfileSettings";

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
        update: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
    isSupabaseConfigured: () => true,
    withAuthTimeout: (p: any) => Promise.resolve(p),
  };
});

describe("RequirePatientPortal Route Guard", () => {
  it("renders ConfigRequired when auth is not configured", () => {
    renderWithProviders(<RequirePatientPortal />, {
      authOverrides: { configured: false },
    });
    expect(screen.getByText(/Supabase not configured/i)).toBeInTheDocument();
  });

  it("renders Loading state when auth is loading", () => {
    renderWithProviders(<RequirePatientPortal />, {
      authOverrides: { loading: true },
    });
    expect(screen.getByText(/Loading\.\.\./i)).toBeInTheDocument();
  });

  it("redirects unauthenticated user to /login/patient", () => {
    renderWithProviders(
      <Routes>
        <Route path="/patient" element={<RequirePatientPortal />} />
        <Route path="/login/patient" element={<div>Patient Login Redirect Target</div>} />
      </Routes>,
      {
        initialEntries: ["/patient"],
        authOverrides: { user: null, profile: null },
      }
    );
    expect(screen.getByText(/Patient Login Redirect Target/i)).toBeInTheDocument();
  });

  it("redirects doctor role to /doctor", () => {
    renderWithProviders(
      <Routes>
        <Route path="/patient" element={<RequirePatientPortal />} />
        <Route path="/doctor" element={<div>Doctor Portal Redirect Target</div>} />
      </Routes>,
      {
        initialEntries: ["/patient"],
        authOverrides: { user: mockDoctorUser as any, profile: mockDoctorProfile },
      }
    );
    expect(screen.getByText(/Doctor Portal Redirect Target/i)).toBeInTheDocument();
  });

  it("renders PatientDashboard when user has patient profile", () => {
    renderWithProviders(
      <Routes>
        <Route path="/patient/*" element={<RequirePatientPortal />} />
      </Routes>,
      {
        initialEntries: ["/patient"],
        authOverrides: { user: mockUser as any, profile: mockPatientProfile },
      }
    );
    expect(screen.getByText(/Logout/i)).toBeInTheDocument();
  });
});

describe("RequireDoctorPortal Route Guard", () => {
  it("redirects unauthenticated user to /login/doctor", () => {
    renderWithProviders(
      <Routes>
        <Route path="/doctor" element={<RequireDoctorPortal />} />
        <Route path="/login/doctor" element={<div>Doctor Login Redirect Target</div>} />
      </Routes>,
      {
        initialEntries: ["/doctor"],
        authOverrides: { user: null, profile: null },
      }
    );
    expect(screen.getByText(/Doctor Login Redirect Target/i)).toBeInTheDocument();
  });

  it("redirects patient role to /patient", () => {
    renderWithProviders(
      <Routes>
        <Route path="/doctor" element={<RequireDoctorPortal />} />
        <Route path="/patient" element={<div>Patient Portal Redirect Target</div>} />
      </Routes>,
      {
        initialEntries: ["/doctor"],
        authOverrides: { user: mockUser as any, profile: mockPatientProfile },
      }
    );
    expect(screen.getByText(/Patient Portal Redirect Target/i)).toBeInTheDocument();
  });

  it("renders DoctorDashboard when user has doctor profile", () => {
    renderWithProviders(
      <Routes>
        <Route path="/doctor" element={<RequireDoctorPortal />} />
      </Routes>,
      {
        initialEntries: ["/doctor"],
        authOverrides: { user: mockDoctorUser as any, profile: mockDoctorProfile },
      }
    );
    expect(screen.getByText(/Doctor Portal/i)).toBeInTheDocument();
  });
});

describe("ErrorBoundary Resilience & Crash Recovery", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  const CrashingComponent = () => {
    throw new Error("Simulated web rendering error");
  };

  const HealthyComponent = () => <div>Normal Working Component</div>;

  it("renders healthy children when no error occurs", () => {
    renderWithProviders(
      <ErrorBoundary>
        <HealthyComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Normal Working Component/i)).toBeInTheDocument();
  });

  it("catches errors and renders fallback with retry button", () => {
    renderWithProviders(
      <ErrorBoundary componentName="Lab Chart">
        <CrashingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Lab Chart Unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/Simulated web rendering error/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("renders fullPage crash UI when fullPage is true", () => {
    renderWithProviders(
      <ErrorBoundary fullPage>
        <CrashingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Workspace Display Interrupted/i)).toBeInTheDocument();
    expect(screen.getByText(/Reload Workspace/i)).toBeInTheDocument();
    expect(screen.getByText(/Reset Cache/i)).toBeInTheDocument();
  });

  it("renders custom fallback node when provided", () => {
    renderWithProviders(
      <ErrorBoundary fallback={<div>Custom Fallback View</div>}>
        <CrashingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Custom Fallback View/i)).toBeInTheDocument();
  });
});

describe("ProfileSettings Suite", () => {
  it("renders ProfileSettings with identity, metrics, and dietary preferences", () => {
    renderWithProviders(<ProfileSettings />, {
      authOverrides: { user: mockUser as any, profile: mockPatientProfile },
    });

    expect(screen.getByText(/Account Settings/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /profile & identity/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /body metrics & vitals/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /diet & health preferences/i })).toBeInTheDocument();
  });

  it("switches to Dietary Profile tab and shows diet options", () => {
    renderWithProviders(<ProfileSettings />, {
      authOverrides: { user: mockUser as any, profile: mockPatientProfile },
    });

    const dietTab = screen.getByRole("button", { name: /diet & health preferences/i });
    fireEvent.click(dietTab);

    expect(screen.getByText(/Dietary Structure & Allergies/i)).toBeInTheDocument();
    expect(screen.getByText(/Primary Diet Style/i)).toBeInTheDocument();
    expect(screen.getByText(/^Vegetarian$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Vegan$/i)).toBeInTheDocument();
  });
});
