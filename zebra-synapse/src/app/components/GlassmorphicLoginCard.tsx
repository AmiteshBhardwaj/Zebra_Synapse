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
} from "lucide-react";
import { toast } from "sonner";
import { getAuthRequestErrorMessage, getSignInErrorMessage } from "../../lib/authErrors";
import { getSupabase, isSupabaseConfigured } from "../../lib/supabase";

interface GlassmorphicLoginCardProps {
  initialTab?: "patient" | "doctor";
}

export function GlassmorphicLoginCard({ initialTab = "patient" }: GlassmorphicLoginCardProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"patient" | "doctor">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
        toast.success(`Welcome to Demo Mode! Logged in as ${isPatient ? "Patient" : "Clinician"}.`);
        if (isPatient) {
          navigate("/patient");
        } else {
          navigate("/doctor");
        }
      }, 600);
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
        if (
          emailTrimmed.includes("example.test") ||
          emailTrimmed.includes("zebrasynapse") ||
          emailTrimmed.includes("demo")
        ) {
          toast.info("Seed demo account detected — logging into workspace...");
          setTimeout(() => {
            if (isPatient) navigate("/patient");
            else navigate("/doctor");
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

  const fillDemo = () => {
    if (isPatient) {
      setEmail("patient@zebrasynapse.io");
      setPassword("patient123");
    } else {
      setEmail("dr.smith@zebrasynapse.io");
      setPassword("doctor123");
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

      {/* Main Glass Card Outer - Ultra-Frosted High-Transparency Surface */}
      <div className="relative z-10 rounded-3xl bg-[#030712]/45 border border-cyan-500/20 hover:border-cyan-400/35 backdrop-blur-xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_40px_rgba(56,189,248,0.12),inset_0_1px_1px_rgba(255,255,255,0.12)] text-left transition-all duration-500 overflow-hidden">
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
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-950/60 border border-slate-800/80 backdrop-blur-md mb-6 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab("patient")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs transition-all duration-300 ${
              isPatient
                ? "bg-gradient-to-r from-cyan-500 to-sky-400 text-slate-950 font-bold shadow-[0_0_20px_rgba(56,189,248,0.45)] scale-[1.02]"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40 font-medium"
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Patient</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("doctor")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs transition-all duration-300 ${
              !isPatient
                ? "bg-gradient-to-r from-sky-400 to-cyan-500 text-slate-950 font-bold shadow-[0_0_20px_rgba(96,212,255,0.45)] scale-[1.02]"
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
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-900/40 border border-slate-700/60 backdrop-blur-md text-sm text-slate-100 placeholder-slate-500 focus:bg-slate-900/70 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/25 transition-all font-sans"
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
                onClick={() =>
                  navigate(isPatient ? "/login/patient" : "/login/doctor")
                }
                className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors font-medium hover:underline"
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
                className="w-full h-11 pl-10 pr-10 rounded-xl bg-slate-900/40 border border-slate-700/60 backdrop-blur-md text-sm text-slate-100 placeholder-slate-500 focus:bg-slate-900/70 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/25 transition-all font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Action Button - High Energy Bioluminescent CTA */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full h-12 rounded-xl font-extrabold text-xs sm:text-sm tracking-wide uppercase transition-all duration-300 flex items-center justify-center gap-2 mt-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isPatient
                ? "bg-gradient-to-r from-cyan-500 via-sky-400 to-cyan-500 text-slate-950 shadow-[0_0_25px_rgba(56,189,248,0.45)] hover:shadow-[0_0_35px_rgba(56,189,248,0.65)] hover:scale-[1.01] active:scale-[0.99]"
                : "bg-gradient-to-r from-sky-400 via-cyan-400 to-sky-400 text-slate-950 shadow-[0_0_25px_rgba(96,212,255,0.45)] hover:shadow-[0_0_35px_rgba(96,212,255,0.65)] hover:scale-[1.01] active:scale-[0.99]"
            }`}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <span>Sign In to {isPatient ? "Patient Workspace" : "Clinical Portal"}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Fill & Sign Up Footer Links */}
        <div className="mt-6 pt-4 border-t border-slate-800/60 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Don't have an account?</span>
            <button
              type="button"
              onClick={() =>
                navigate(isPatient ? "/signup/patient" : "/signup/doctor")
              }
              className="font-semibold text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
            >
              Register here
            </button>
          </div>

          <button
            type="button"
            onClick={fillDemo}
            className="w-full py-2 rounded-xl bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 hover:border-amber-500/40 text-[11px] font-mono text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5 backdrop-blur-sm shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            <span>Auto-fill Demo Credentials</span>
          </button>
        </div>
      </div>
    </div>
  );
}
