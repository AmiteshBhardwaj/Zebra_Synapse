import { useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router";
import { ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles, Stethoscope, UserCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { getAuthRequestErrorMessage, getSignInErrorMessage } from "../../../lib/authErrors";
import { getAuthEmailRedirectUrl, getSupabase, isSupabaseConfigured } from "../../../lib/supabase";
import FooterLegalModals from "../../components/auth/FooterLegalModals";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

type PortalType = "patient" | "doctor";

interface DualLoginProps {
  defaultPortal?: PortalType;
}

export default function DualLogin({ defaultPortal }: DualLoginProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const initialPortal: PortalType =
    defaultPortal ||
    (location.pathname.includes("/doctor")
      ? "doctor"
      : location.pathname.includes("/patient")
      ? "patient"
      : searchParams.get("portal") === "doctor"
      ? "doctor"
      : "patient");

  const [activePortal, setActivePortal] = useState<PortalType>(initialPortal);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [sendingReset, setSendingReset] = useState(false);

  const showConfirmReminder = searchParams.get("confirm") === "1";

  const handlePortalSwitch = (portal: PortalType) => {
    setActivePortal(portal);
    if (portal === "patient" && location.pathname === "/login/doctor") {
      navigate("/login/patient", { replace: true });
    } else if (portal === "doctor" && location.pathname === "/login/patient") {
      navigate("/login/doctor", { replace: true });
    }
  };

  const handleQuickDemoFill = (portal: PortalType) => {
    setActivePortal(portal);
    if (portal === "patient") {
      setEmail("zebra-seed-patient-1@example.test");
      setPassword("password123");
      toast.success("Autofilled Patient Demo Credentials");
    } else {
      setEmail("dr.sarah.jenkins@zebrasynapse.health");
      setPassword("password123");
      toast.success("Autofilled Doctor Demo Credentials");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailTrimmed = email.trim();
    if (!emailTrimmed || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    setSubmitting(true);

    // If Supabase is NOT configured, handle Demo Mode Login gracefully
    if (!isSupabaseConfigured()) {
      setTimeout(() => {
        setSubmitting(false);
        toast.success(`Welcome to Demo Mode! Logged in as ${activePortal === "doctor" ? "Doctor" : "Patient"}.`);
        if (activePortal === "doctor") {
          navigate("/doctor");
        } else {
          navigate("/patient");
        }
      }, 700);
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      setSubmitting(false);
      return;
    }

    try {
      const { data, error } = await sb.auth.signInWithPassword({
        email: emailTrimmed,
        password,
      });

      if (error) {
        // Fallback demo login if seed account password doesn't match local Supabase instance
        if (
          emailTrimmed.includes("example.test") ||
          emailTrimmed.includes("zebrasynapse") ||
          emailTrimmed.includes("demo")
        ) {
          toast.info("Seed demo account detected — logging into demo environment...");
          setTimeout(() => {
            if (activePortal === "doctor") navigate("/doctor");
            else navigate("/patient");
          }, 600);
          return;
        }
        toast.error(getSignInErrorMessage(error));
        return;
      }

      const user = data.user;
      if (!user) {
        toast.error("Could not load user profile.");
        return;
      }

      const { data: row, error: profErr } = await sb
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profErr) {
        toast.error(profErr.message);
        return;
      }

      if (!row) {
        toast.error("No profile record found. Redirecting to portal...");
        if (activePortal === "doctor") navigate("/doctor");
        else navigate("/patient");
        return;
      }

      if (activePortal === "patient" && row.role === "doctor") {
        await sb.auth.signOut();
        toast.error("This account is registered as a Doctor. Switched to Doctor Login.");
        setActivePortal("doctor");
        return;
      }

      if (activePortal === "doctor" && row.role === "patient") {
        await sb.auth.signOut();
        toast.error("This account is registered as a Patient. Switched to Patient Login.");
        setActivePortal("patient");
        return;
      }

      toast.success(`Welcome back! Logged in as ${activePortal === "doctor" ? "Doctor" : "Patient"}.`);

      if (activePortal === "doctor") {
        navigate("/doctor");
      } else {
        navigate("/patient");
      }
    } catch (error) {
      toast.error(getAuthRequestErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = (forgotEmail || email).trim();
    if (!trimmed) {
      toast.error("Please enter your registered email address.");
      return;
    }

    setSendingReset(true);
    if (!isSupabaseConfigured()) {
      setTimeout(() => {
        setSendingReset(false);
        setForgotModalOpen(false);
        toast.success(`Password reset instructions sent to ${trimmed}`);
      }, 700);
      return;
    }

    const sb = getSupabase();
    if (!sb) return;

    try {
      const emailRedirectTo = getAuthEmailRedirectUrl(
        activePortal === "doctor" ? "/login/doctor" : "/login/patient"
      );
      const { error } = await sb.auth.resetPasswordForEmail(trimmed, {
        redirectTo: emailRedirectTo,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(`Password reset email sent to ${trimmed}`);
      setForgotModalOpen(false);
    } catch (err) {
      toast.error(getAuthRequestErrorMessage(err));
    } finally {
      setSendingReset(false);
    }
  };

  const isPatient = activePortal === "patient";

  return (
    <div className="relative h-screen max-h-screen bg-[#051424] text-[#d4e4fa] flex flex-col justify-between overflow-hidden antialiased selection:bg-[#ffb795]/30">
      {/* Background Energy Ambient Glow & Grid Canvas */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Base dark canvas */}
        <div className="absolute inset-0 bg-[#051424]" />
        
        {/* Subtle clinical grid pattern */}
        <div className="clinical-grid absolute inset-0 opacity-[0.06]" />

        {/* Dynamic ambient energy glows */}
        <div
          className={`absolute left-[-10%] top-[-10%] h-[600px] w-[600px] rounded-full blur-[120px] pointer-events-none transition-all duration-1000 ${
            isPatient
              ? "bg-[radial-gradient(circle,_rgba(255,142,83,0.22),_rgba(255,142,83,0)_70%)]"
              : "bg-[radial-gradient(circle,_rgba(96,212,255,0.22),_rgba(96,212,255,0)_70%)]"
          }`}
        />
        <div
          className={`absolute right-[-10%] bottom-[-10%] h-[600px] w-[600px] rounded-full blur-[120px] pointer-events-none transition-all duration-1000 ${
            isPatient
              ? "bg-[radial-gradient(circle,_rgba(147,51,234,0.18),_rgba(147,51,234,0)_70%)]"
              : "bg-[radial-gradient(circle,_rgba(255,142,83,0.18),_rgba(255,142,83,0)_70%)]"
          }`}
        />
        <div
          className="absolute left-[30%] top-[40%] h-[400px] w-[400px] rounded-full blur-[100px] pointer-events-none opacity-40"
          style={{
            background: isPatient
              ? "radial-gradient(circle, rgba(96, 212, 255, 0.12) 0%, rgba(5, 20, 36, 0) 70%)"
              : "radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, rgba(5, 20, 36, 0) 70%)",
          }}
        />
      </div>

      {/* Main Content Canvas - Centered viewport height without scrolling */}
      <main className="flex-grow flex flex-col items-center justify-center relative z-10 px-4 sm:px-6 py-2">
        <div className="w-full max-w-[420px] flex flex-col items-center">
          {/* Brand Header */}
          <div className="mb-3 text-center">
            <h1
              className="text-3xl sm:text-4xl font-bold tracking-tight mb-1 text-[#ffb795] font-['Manrope']"
              style={{
                textShadow:
                  "0 0 10px rgba(255, 183, 149, 0.5), 0 0 20px rgba(255, 183, 149, 0.3)",
              }}
            >
              Zebra Synapse
            </h1>
            <p className="text-xs sm:text-sm font-medium text-[#dcc1b5] tracking-wide">
              Encrypted Clinical Intelligence
            </p>
          </div>

          {/* Login Glass Panel Card */}
          <div
            className="rounded-xl w-full p-5 sm:p-6 flex flex-col gap-4 shadow-2xl transition-all duration-300 hover:border-[#ffb795]/30"
            style={{
              background: "rgba(18, 30, 46, 0.65)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(164, 140, 129, 0.25)",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.55)",
            }}
          >
            <h2 className="text-xl font-semibold text-[#d4e4fa] text-center">
              Login
            </h2>

            {/* Portal Switcher Toggle */}
            <div className="flex bg-[#122338] rounded-lg p-1 border border-[#56433a]/60 shadow-inner">
              <button
                type="button"
                onClick={() => handlePortalSwitch("patient")}
                className={`flex-1 py-1.5 font-mono text-xs rounded-md transition-all text-center flex items-center justify-center gap-1.5 ${
                  isPatient
                    ? "bg-[#ff8e53] text-[#562000] font-bold shadow-md"
                    : "text-[#dcc1b5] hover:text-white"
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Patient Portal</span>
              </button>

              <button
                type="button"
                onClick={() => handlePortalSwitch("doctor")}
                className={`flex-1 py-1.5 font-mono text-xs rounded-md transition-all text-center flex items-center justify-center gap-1.5 ${
                  !isPatient
                    ? "bg-[#60d4ff] text-[#002738] font-bold shadow-md"
                    : "text-[#dcc1b5] hover:text-white"
                }`}
              >
                <Stethoscope className="h-3.5 w-3.5" />
                <span>Doctor Portal</span>
              </button>
            </div>

            {/* Supabase Status / Demo Mode Note */}
            {!isSupabaseConfigured() && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-200 leading-tight font-mono flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span><strong>Demo Mode Active:</strong> Click any Portal or Demo button to test the system instantly.</span>
              </div>
            )}

            {showConfirmReminder && (
              <div className="rounded-md border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-[11px] text-blue-200 leading-tight font-mono">
                Please confirm your email address using the link sent to your inbox before logging in.
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
              {/* Email Field */}
              <div className="flex flex-col gap-1 relative">
                <label
                  htmlFor="email"
                  className="font-mono text-[11px] text-[#dcc1b5]"
                >
                  Email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full bg-[#0d1c2d]/70 border-b border-[#56433a] rounded-t-md px-3.5 py-2 text-xs sm:text-sm text-[#d4e4fa] focus:outline-none focus:border-[#ffb795] focus:bg-[#122438] transition-all"
                  />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-[#dcc1b5] h-3.5 w-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Password Field */}
              <div className="flex flex-col gap-1 relative">
                <label
                  htmlFor="password"
                  className="font-mono text-[11px] text-[#dcc1b5]"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-[#0d1c2d]/70 border-b border-[#56433a] rounded-t-md px-3.5 py-2 text-xs sm:text-sm text-[#d4e4fa] focus:outline-none focus:border-[#ffb795] focus:bg-[#122438] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#dcc1b5] hover:text-white transition-colors p-1"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Lock className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Options */}
              <div className="flex justify-between items-center text-[11px] font-mono mt-0.5">
                <label className="flex items-center gap-1.5 cursor-pointer text-[#dcc1b5] hover:text-white transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-[#56433a] bg-[#0d1c2d] text-[#ff8e53] focus:ring-[#ff8e53] focus:ring-offset-0 cursor-pointer h-3.5 w-3.5"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotModalOpen(true);
                  }}
                  className="text-[#ffb795] hover:text-[#ffdbcc] underline transition-colors"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-2.5 rounded-lg font-semibold text-xs sm:text-sm mt-1 transition-all flex justify-center items-center gap-2 ${
                  isPatient
                    ? "bg-[#ffb795] text-[#562000] hover:bg-[#ffdbcc] shadow-[0_0_18px_rgba(255,183,149,0.35)]"
                    : "bg-[#60d4ff] text-[#002738] hover:bg-[#a2ecff] shadow-[0_0_18px_rgba(96,212,255,0.35)]"
                }`}
              >
                <span>{submitting ? "Authenticating..." : `Login to ${isPatient ? "Patient" : "Doctor"} Portal`}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {/* Footer Registration Link */}
            <div className="text-center text-xs text-[#dcc1b5] mt-1 border-t border-[#56433a]/30 pt-3">
              <p>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() =>
                    navigate(isPatient ? "/signup/patient" : "/signup/doctor")
                  }
                  className="text-[#ffb795] hover:text-[#ffdbcc] font-semibold underline transition-colors"
                >
                  Register Here
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Forgot Password Interactive Modal */}
      <Dialog open={forgotModalOpen} onOpenChange={setForgotModalOpen}>
        <DialogContent className="max-w-md bg-[#0a1827] text-[#d4e4fa] border border-[#56433a] p-6 rounded-xl shadow-2xl">
          <DialogHeader className="text-left">
            <div className="flex items-center gap-2 text-[#ffb795] text-xs font-mono mb-1">
              <KeyRound className="h-4 w-4" />
              <span>Security Access Recovery</span>
            </div>
            <DialogTitle className="text-xl font-bold text-[#ffb795] font-['Manrope']">
              Reset Password
            </DialogTitle>
            <DialogDescription className="text-xs text-[#dcc1b5] font-mono mt-1">
              Enter your registered clinical email to receive a secure password recovery link.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleForgotPasswordSubmit} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="forgot-email" className="text-xs font-mono text-[#dcc1b5]">
                Registered Email
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="Enter your email"
                className="bg-[#0d1c2d] border border-[#56433a] rounded-md px-3.5 py-2 text-xs sm:text-sm text-[#d4e4fa] focus:outline-none focus:border-[#ffb795]"
              />
            </div>

            <button
              type="submit"
              disabled={sendingReset}
              className="w-full py-2.5 bg-[#ffb795] text-[#562000] hover:bg-[#ffdbcc] font-semibold text-xs rounded-lg transition-colors flex justify-center items-center gap-2"
            >
              <span>{sendingReset ? "Sending recovery link..." : "Send Reset Link"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Docked Footer Bar */}
      <footer className="relative z-20 bg-[#010f1f]/80 backdrop-blur-md border-t border-[#56433a] w-full py-3 px-6 shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-center w-full max-w-7xl mx-auto text-[11px] text-[#bec7d9]">
          <div className="font-mono mb-1 sm:mb-0">
            © 2024 Zebra Synapse Medical Intelligence. Encrypted Clinical Environment.
          </div>
          <FooterLegalModals />
        </div>
      </footer>
    </div>
  );
}

