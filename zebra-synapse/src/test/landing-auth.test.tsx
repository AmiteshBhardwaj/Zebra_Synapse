import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import WelcomePage from "../app/pages/WelcomePage";
import PatientLogin from "../app/pages/auth/PatientLogin";
import DoctorLogin from "../app/pages/auth/DoctorLogin";
import DualLogin from "../app/pages/auth/DualLogin";
import { GlassmorphicLoginCard } from "../app/components/GlassmorphicLoginCard";

// Mock Three.js canvas and GSAP animations
vi.mock("../app/components/DnaCanvas3D", () => ({
  DnaCanvas3D: () => <div data-testid="dna-canvas-mock">3D DNA Canvas</div>,
}));

vi.mock("gsap", () => ({
  default: {
    registerPlugin: vi.fn(),
    context: vi.fn(() => ({ revert: vi.fn() })),
    to: vi.fn(),
  },
}));

vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: {},
}));

describe("Auth & Landing Page Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  describe("WelcomePage Component", () => {
    it("renders hero titles, feature signal cards, and 3D canvas", () => {
      renderWithProviders(<WelcomePage />);

      expect(screen.getByText(/BIOMARKER ENGINE/i)).toBeInTheDocument();
      expect(screen.getByText(/CLINICAL AI SYNAPSE/i)).toBeInTheDocument();
      expect(screen.getByText(/COLLABORATIVE CARE/i)).toBeInTheDocument();
      expect(screen.getByTestId("dna-canvas-mock")).toBeInTheDocument();
      expect(screen.getByText(/HIPAA Compliant/i)).toBeInTheDocument();
    });

    it("renders call-to-action button to proceed to login", () => {
      renderWithProviders(<WelcomePage />);

      const loginBtn = screen.getByRole("button", { name: /proceed to login/i });
      expect(loginBtn).toBeInTheDocument();
      fireEvent.click(loginBtn);
    });

    it("handles reduced motion preferences cleanly without overlapping hero and login card", () => {
      // Mock prefers-reduced-motion: reduce = true
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      renderWithProviders(<WelcomePage />);

      // Hero should be visible
      expect(screen.getByText(/BIOMARKER ENGINE/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /proceed to login/i })).toBeInTheDocument();

      // Proceed to login click triggers transition
      const proceedBtn = screen.getByRole("button", { name: /proceed to login/i });
      fireEvent.click(proceedBtn);

      // Now login view should be active with Platform Overview back button
      expect(screen.getByRole("button", { name: /platform overview/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/patient@zebrasynapse\.io/i)).toBeInTheDocument();

      // Click back to overview
      const backBtn = screen.getByRole("button", { name: /platform overview/i });
      fireEvent.click(backBtn);

      // Sign In button should now be available in header
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });
  });

  describe("GlassmorphicLoginCard Component", () => {
    it("renders email and password inputs with role switching tabs", () => {
      renderWithProviders(<GlassmorphicLoginCard initialTab="patient" />);

      expect(screen.getByPlaceholderText(/patient@zebrasynapse\.io/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText("••••••••••••")).toBeInTheDocument();

      const doctorBtn = screen.getByRole("button", { name: /doctor/i });
      fireEvent.click(doctorBtn);

      expect(screen.getByPlaceholderText(/dr\.smith@zebrasynapse\.io/i)).toBeInTheDocument();
    });

    it("toggles password visibility when toggle button is clicked", () => {
      renderWithProviders(<GlassmorphicLoginCard initialTab="patient" />);

      const pwdInput = screen.getByPlaceholderText("••••••••••••");
      expect(pwdInput).toHaveAttribute("type", "password");

      // Find the toggle button adjacent to password input
      const toggleBtn = pwdInput.parentElement?.querySelector("button");
      expect(toggleBtn).toBeInTheDocument();
      if (toggleBtn) {
        fireEvent.click(toggleBtn);
        expect(pwdInput).toHaveAttribute("type", "text");
      }
    });
  });

  describe("Dedicated Auth Pages", () => {
    it("renders PatientLogin page with login form", () => {
      renderWithProviders(<PatientLogin />);
      expect(screen.getByRole("button", { name: /proceed to login/i })).toBeInTheDocument();
      expect(screen.getByText(/BIOMARKER ENGINE/i)).toBeInTheDocument();
    });

    it("renders DoctorLogin page with login form", () => {
      renderWithProviders(<DoctorLogin />);
      expect(screen.getByRole("button", { name: /proceed to login/i })).toBeInTheDocument();
      expect(screen.getByText(/BIOMARKER ENGINE/i)).toBeInTheDocument();
    });

    it("renders DualLogin portal selector with Patient and Clinician options", () => {
      renderWithProviders(<DualLogin />);
      expect(screen.getByText(/Sign in to your workspace/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^patient$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^clinician$/i })).toBeInTheDocument();
    });
  });
});
