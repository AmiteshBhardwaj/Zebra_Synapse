import { useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Stethoscope,
  UserCheck,
  KeyRound,
  ShieldCheck,
  Activity,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { getAuthRequestErrorMessage, getSignInErrorMessage } from "../../../lib/authErrors";
import { getAuthEmailRedirectUrl, getSupabase, isSupabaseConfigured } from "../../../lib/supabase";
import FooterLegalModals from "../../components/auth/FooterLegalModals";
import DnaHelix from "../../components/DnaHelix";
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailTrimmed = email.trim();
    if (!emailTrimmed || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    setSubmitting(true);

    if (!isSupabaseConfigured()) {
      setTimeout(() => {
        setSubmitting(false);
        toast.success(`Welcome to Demo Mode! Logged in as ${activePortal === "doctor" ? "Clinician" : "Patient"}.`);
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
        if (
          emailTrimmed.includes("example.test") ||
          emailTrimmed.includes("zebrasynapse") ||
          emailTrimmed.includes("demo")
        ) {
          toast.info("Seed demo account detected — logging into environment...");
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
        toast.error("No profile record found. Redirecting to workspace...");
        if (activePortal === "doctor") navigate("/doctor");
        else navigate("/patient");
        return;
      }

      if (activePortal === "patient" && row.role === "doctor") {
        await sb.auth.signOut();
        toast.error("This account is registered as a Clinician. Switched to Clinician Login.");
        setActivePortal("doctor");
        return;
      }

      if (activePortal === "doctor" && row.role === "patient") {
        await sb.auth.signOut();
        toast.error("This account is registered as a Patient. Switched to Patient Login.");
        setActivePortal("patient");
        return;
      }

      toast.success(`Welcome back! Logged in as ${activePortal === "doctor" ? "Clinician" : "Patient"}.`);

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
    <div className="min-h-screen w-full bg-[#08090e] text-slate-100 relative overflow-hidden antialiased font-sans flex flex-col justify-between selection:bg-cyan-500/20 selection:text-cyan-300">
      
      {/* ==========================================
          SUBTLE RESTRAINED ATMOSPHERIC BACKGROUND
          ========================================== */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Continuous near-black canvas */}
        <div className="absolute inset-0 bg-[#08090e]" />

        {/* Muted background navy & slate undertones */}
        <div className="absolute top-[8%] left-[6%] w-[42vw] h-[42vw] rounded-full bg-[radial-gradient(circle,_rgba(15,23,42,0.45)_0%,_transparent_70%)] blur-[120px]" />
        <div className="absolute bottom-[8%] right-[6%] w-[38vw] h-[38vw] rounded-full bg-[radial-gradient(circle,_rgba(14,165,233,0.035)_0%,_transparent_75%)] blur-[130px]" />

        {/* Quiet clinical grid noise */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40" />
      </div>

      {/* ==========================================
          MAIN VIEWPORT CONTENT (GENEROUS 1280px MAX CONTAINER)
          ========================================== */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 xl:px-14 pt-8 pb-4 flex-grow flex flex-col justify-between">
        
        {/* TOP NAVIGATION BAR */}
        <header className="flex justify-between items-center w-full shrink-0 mb-6 lg:mb-0">
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2.5"
          >
            <div className="w-2 h-2 rounded-full bg-cyan-500" />
            <span className="text-xs font-mono tracking-[0.2em] uppercase text-slate-400 font-medium">
              Zebra Synapse
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-800/80 bg-slate-900/40 text-[11px] font-mono text-slate-400"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
            <span>SECURE CLINICAL PLATFORM</span>
          </motion.div>
        </header>

        {/* MAIN DESKTOP THREE-COLUMN COMPOSITION:
            HERO (5 cols) | DEDICATED DNA COLUMN (2 cols) | LOGIN CARD (5 cols) */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-4 xl:gap-8 items-center my-auto py-4">
          
          {/* LEFT HERO COLUMN (~42-45% WIDTH, NO OVERLAP) */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-5 max-w-xl lg:-mt-4 relative z-10">
            
            {/* Eyebrow Badge */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-slate-400 font-mono text-[11px] tracking-[0.2em] uppercase"
            >
              CLINICAL INTELLIGENCE PLATFORM
            </motion.div>

            {/* Display Title */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="text-4xl sm:text-5xl lg:text-[60px] xl:text-[66px] font-extrabold tracking-tight leading-[0.98] text-slate-100 font-['Manrope']"
            >
              Zebra{" "}
              <span className="text-sky-300 font-extrabold">
                Synapse
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed max-w-md"
            >
              Turn clinical lab data into actionable insights. Extract biomarkers from lab reports, monitor longitudinal trends, and connect findings to clinical workflows.
            </motion.p>

            {/* Quiet Editorial Feature Cards (Strictly inside Left Column) */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1"
            >
              <div className="rounded-xl border border-slate-800/50 bg-slate-950/30 p-3.5">
                <div className="flex items-center gap-2 text-cyan-400">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                    Biomarker Extraction
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-normal mt-1">
                  Convert lab reports into structured biomarker data.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800/50 bg-slate-950/30 p-3.5">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Activity className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                    Clinical Workflows
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-normal mt-1">
                  Connect findings to patient-care workflows.
                </p>
              </div>
            </motion.div>

          </div>

          {/* DEDICATED CENTER COLUMN — TALL 500px ELEGANT PNG DNA HELIX VISUAL BRIDGE */}
          <div className="hidden lg:flex lg:col-span-2 justify-center items-center h-full min-h-[500px] pointer-events-none relative z-0 px-1">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="w-[110px] lg:w-[130px] xl:w-[150px] h-[460px] lg:h-[500px] xl:h-[530px] flex items-center justify-center"
            >
              <DnaHelix className="w-full h-full" />
            </motion.div>
          </div>

          {/* RIGHT LOGIN COLUMN — RESTRAINED CLINICAL LOGIN CARD */}
          <div className="lg:col-span-5 w-full flex justify-center lg:justify-end relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="w-full max-w-[430px] xl:max-w-[450px] rounded-2xl border border-slate-800/90 bg-[#0e1017]/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl relative"
            >
              <div className="mb-5">
                <span className="text-[10px] font-mono tracking-[0.18em] text-slate-400 uppercase block mb-1">
                  ACCESS PORTAL
                </span>
                <h2 className="text-xl font-bold tracking-tight text-slate-100">
                  Sign in to your workspace
                </h2>
              </div>

              {/* Quiet Role Selector */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  I&apos;m signing in as
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-950/90 rounded-xl p-1 border border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => handlePortalSwitch("patient")}
                    className={`py-1.5 px-3 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isPatient
                        ? "bg-slate-800 text-slate-100 border border-slate-700/60 font-semibold shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Patient</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePortalSwitch("doctor")}
                    className={`py-1.5 px-3 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      !isPatient
                        ? "bg-slate-800 text-slate-100 border border-slate-700/60 font-semibold shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Stethoscope className="h-3.5 w-3.5" />
                    <span>Clinician</span>
                  </button>
                </div>
              </div>

              {!isSupabaseConfigured() && (
                <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-400 leading-relaxed font-mono">
                  <strong>Demo Mode Active:</strong> Sign in with any clinical email.
                </div>
              )}

              {showConfirmReminder && (
                <div className="mb-4 rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-3 text-[11px] text-cyan-200 leading-relaxed">
                  Please confirm your email address.
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-slate-300 mb-1.5">
                    {isPatient ? "Email address" : "Clinical email"}
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={isPatient ? "name@example.com" : "doctor@hospital.org"}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 pl-10 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    />
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 h-4 w-4 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-medium text-slate-300 mb-1.5">
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
                      placeholder="••••••••••••"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 pl-10 pr-10 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    />
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 h-4 w-4 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200 transition-colors select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-cyan-600 focus:ring-cyan-500/20 cursor-pointer h-3.5 w-3.5"
                    />
                    <span>Remember session</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotModalOpen(true);
                    }}
                    className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition-all duration-200 flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>{isPatient ? "Sign in to Patient Portal" : "Sign in to Clinical Workspace"}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center text-xs text-slate-400 mt-5 border-t border-slate-800/80 pt-4">
                <p>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => navigate(isPatient ? "/signup/patient" : "/signup/doctor")}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline transition-colors ml-1"
                  >
                    Create account
                  </button>
                </p>
              </div>
            </motion.div>
          </div>
        </main>

        {/* DOCKED FOOTER */}
        <footer className="w-full shrink-0 pt-6 pb-2 border-t border-slate-800/40 flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] font-mono text-[#64748b] relative z-10">
          <div>© 2026 Zebra Synapse Health. Enterprise Clinical Infrastructure.</div>
          <FooterLegalModals />
        </footer>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      <Dialog open={forgotModalOpen} onOpenChange={setForgotModalOpen}>
        <DialogContent className="max-w-md bg-[#0f111a] text-slate-100 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-xl">
          <DialogHeader className="text-left">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono mb-1">
              <KeyRound className="h-4 w-4" />
              <span>SECURITY RECOVERY</span>
            </div>
            <DialogTitle className="text-xl font-bold text-slate-100 font-['Manrope']">
              Reset your password
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-mono mt-1">
              Enter your registered clinical email to receive a secure password recovery link.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleForgotPasswordSubmit} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="forgot-email" className="text-xs font-medium text-slate-300">
                Registered email
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder={isPatient ? "name@example.com" : "doctor@hospital.org"}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={sendingReset}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-xl transition-colors flex justify-center items-center gap-2"
            >
              {sendingReset ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending recovery link...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}



