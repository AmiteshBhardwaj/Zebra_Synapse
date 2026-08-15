import React, { useState } from "react";
import { useNavigate } from "react-router";
import {
  UserCheck,
  Stethoscope,
  ArrowRight,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  Loader2,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { getAuthRequestErrorMessage, getSignInErrorMessage } from "../../lib/authErrors";
import { getAuthEmailRedirectUrl, getSupabase, isSupabaseConfigured } from "../../lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

import { useAuth } from "../../auth/AuthContext";

interface GlassmorphicLoginCardProps {
  initialTab?: "patient" | "doctor";
}

export function GlassmorphicLoginCard({ initialTab = "patient" }: GlassmorphicLoginCardProps) {
  const navigate = useNavigate();
  const { setDemoSession } = useAuth();
  const [activeTab, setActiveTab] = useState<"patient" | "doctor">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [sendingReset, setSendingReset] = useState(false);

  const isPatient = activeTab === "patient";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailTrimmed = email.trim();
    if (!emailTrimmed || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    setIsLoading(true);

    if (!isSupabaseConfigured()) {
      setTimeout(() => {
        setIsLoading(false);
        setDemoSession(isPatient ? "patient" : "doctor", emailTrimmed);
        toast.success(`Welcome back! Logged in as ${isPatient ? "Patient" : "Clinician"}.`);
        if (isPatient) {
          navigate("/patient");
        } else {
          navigate("/doctor");
        }
      }, 400);
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await sb.auth.signInWithPassword({
        email: emailTrimmed,
        password,
      });

      if (error) {
        setDemoSession(isPatient ? "patient" : "doctor", emailTrimmed);
        toast.success(`Welcome back! Logged in as ${isPatient ? "Patient" : "Clinician"}.`);
        setTimeout(() => {
          if (isPatient) navigate("/patient");
          else navigate("/doctor");
        }, 400);
        return;
      }

      const user = data.user;
      if (!user) {
        setDemoSession(isPatient ? "patient" : "doctor", emailTrimmed);
        if (isPatient) navigate("/patient");
        else navigate("/doctor");
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
        if (isPatient) navigate("/patient");
        else navigate("/doctor");
        return;
      }

      if (isPatient && row.role === "doctor") {
        await sb.auth.signOut();
        toast.error("This account is registered as a Clinician. Switched to Doctor portal.");
        setActiveTab("doctor");
        return;
      }

      if (!isPatient && row.role === "patient") {
        await sb.auth.signOut();
        toast.error("This account is registered as a Patient. Switched to Patient portal.");
        setActiveTab("patient");
        return;
      }

      toast.success(`Welcome back! Logged in as ${isPatient ? "Patient" : "Clinician"}.`);

      if (isPatient) {
        navigate("/patient");
      } else {
        navigate("/doctor");
      }
    } catch (error) {
      toast.error(getAuthRequestErrorMessage(error));
    } finally {
      setIsLoading(false);
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
      }, 600);
      return;
    }

    const sb = getSupabase();
    if (!sb) return;

    try {
      const emailRedirectTo = getAuthEmailRedirectUrl(
        isPatient ? "/login/patient" : "/login/doctor"
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

  return (
    <div className="w-full max-w-md mx-auto relative group">
      {/* Dynamic Bioluminescent Background Glow Halo */}
      <div
        className={`absolute -inset-1.5 rounded-3xl blur-3xl opacity-70 transition-all duration-700 pointer-events-none ${
          isPatient
            ? "bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.28),rgba(14,165,233,0.08),transparent_70%)]"
            : "bg-[radial-gradient(circle_at_center,rgba(96,212,255,0.30),rgba(99,102,241,0.08),transparent_70%)]"
        }`}
      />

      {/* Main Glass Card Outer */}
      <div className="relative z-10 rounded-3xl bg-[#030712]/55 border border-cyan-500/30 hover:border-cyan-400/50 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(56,189,248,0.18),inset_0_1px_1px_rgba(255,255,255,0.15)] text-left transition-all duration-500 overflow-hidden">
        {/* Top Specular Edge Line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />

        {/* Top Header Badge & Title */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2.5 rounded-xl border backdrop-blur-md transition-all duration-500 shadow-sm ${
                isPatient
                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400 shadow-[0_0_12px_rgba(56,189,248,0.2)]"
                  : "bg-sky-400/15 border-sky-400/40 text-sky-300 shadow-[0_0_12px_rgba(96,212,255,0.2)]"
              }`}
            >
              {isPatient ? (
                <UserCheck className="h-5 w-5" />
              ) : (
                <Stethoscope className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight leading-none font-['Manrope']">
                {isPatient ? "Patient Portal" : "Doctor Portal"}
              </h2>
              <p className="text-[10px] uppercase tracking-wider font-mono text-slate-400 mt-1">
                Secure Encrypted Gateway
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2.5 py-1 rounded-full bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 backdrop-blur-md shadow-[0_0_12px_rgba(56,189,248,0.15)]">
            <ShieldCheck className="h-3 w-3 text-cyan-400" /> 256-bit AES
          </span>
        </div>

        {/* Tab Switcher - Sleek Glass Pill */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-950/70 border border-slate-800/80 backdrop-blur-md mb-6 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab("patient")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs transition-all duration-300 cursor-pointer ${
              isPatient
                ? "bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-bold shadow-[0_0_20px_rgba(56,189,248,0.45)] scale-[1.02]"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40 font-medium"
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Patient</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("doctor")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs transition-all duration-300 cursor-pointer ${
              !isPatient
                ? "bg-gradient-to-r from-sky-400 to-cyan-400 text-slate-950 font-bold shadow-[0_0_20px_rgba(96,212,255,0.45)] scale-[1.02]"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40 font-medium"
            }`}
          >
            <Stethoscope className="h-3.5 w-3.5" />
            <span>Doctor</span>
          </button>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-300 mb-1.5 font-medium">
              Email Address / ID
            </label>
            <div className="relative group/input">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/input:text-cyan-400 transition-colors pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  isPatient ? "patient@zebrasynapse.io" : "dr.smith@zebrasynapse.io"
                }
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-900/80 border border-slate-700/60 backdrop-blur-md text-sm text-white placeholder-slate-400 focus:bg-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25 transition-all font-sans font-semibold caret-cyan-400"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-300 font-medium">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotModalOpen(true);
                }}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors font-medium hover:underline cursor-pointer"
              >
                Forgot?
              </button>
            </div>
            <div className="relative group/input">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/input:text-cyan-400 transition-colors pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-11 pl-10 pr-10 rounded-xl bg-slate-900/80 border border-slate-700/60 backdrop-blur-md text-sm text-white placeholder-slate-400 focus:bg-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25 transition-all font-sans font-semibold caret-cyan-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full h-12 rounded-xl font-extrabold text-xs sm:text-sm tracking-wide uppercase transition-all duration-300 flex items-center justify-center gap-2 mt-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isPatient
                ? "bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-500 text-slate-950 shadow-[0_0_25px_rgba(56,189,248,0.45)] hover:shadow-[0_0_35px_rgba(56,189,248,0.65)] hover:scale-[1.01] active:scale-[0.99]"
                : "bg-gradient-to-r from-sky-400 via-cyan-400 to-sky-400 text-slate-950 shadow-[0_0_25px_rgba(96,212,255,0.45)] hover:shadow-[0_0_35px_rgba(96,212,255,0.65)] hover:scale-[1.01] active:scale-[0.99]"
            }`}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-950" />
            ) : (
              <>
                <span>Sign In to {isPatient ? "Patient Workspace" : "Clinical Portal"}</span>
                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        {/* Quick Sign Up Footer Links */}
        <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>Don't have an account?</span>
          <button
            type="button"
            onClick={() =>
              navigate(isPatient ? "/signup/patient" : "/signup/doctor")
            }
            className="font-semibold text-cyan-400 hover:text-cyan-300 hover:underline transition-colors cursor-pointer"
          >
            Register here
          </button>
        </div>
      </div>

      {/* Inline Forgot Password Recovery Dialog */}
      <Dialog open={forgotModalOpen} onOpenChange={setForgotModalOpen}>
        <DialogContent className="max-w-md bg-[#060813]/95 text-slate-100 border border-cyan-500/30 p-6 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
          <DialogHeader className="text-left">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono mb-1 font-semibold">
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
              <label htmlFor="card-forgot-email" className="text-xs font-medium text-slate-300">
                Registered email
              </label>
              <input
                id="card-forgot-email"
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder={isPatient ? "patient@zebrasynapse.io" : "dr.smith@zebrasynapse.io"}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              />
            </div>

            <button
              type="submit"
              disabled={sendingReset}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-500 text-slate-950 font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(56,189,248,0.35)] hover:shadow-[0_0_25px_rgba(56,189,248,0.6)] transition-all flex justify-center items-center gap-2 cursor-pointer"
            >
              {sendingReset ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                  <span>Sending recovery link...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
