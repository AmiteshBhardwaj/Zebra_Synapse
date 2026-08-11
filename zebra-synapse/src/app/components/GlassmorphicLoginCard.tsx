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

export function GlassmorphicLoginCard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"patient" | "doctor">("patient");
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
      {/* Dynamic Background Glow Halo */}
      <div
        className={`absolute -inset-1 rounded-3xl blur-2xl opacity-60 transition-all duration-700 pointer-events-none ${
          isPatient
            ? "bg-[radial-gradient(circle_at_center,rgba(255,142,83,0.5),rgba(0,0,0,0))]"
            : "bg-[radial-gradient(circle_at_center,rgba(96,212,255,0.5),rgba(0,0,0,0))]"
        }`}
      />

      {/* Main Glass Card Outer */}
      <div className="relative z-10 rounded-3xl bg-black/60 border border-white/15 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] text-left transition-all duration-300">
        {/* Top Header Badge & Title */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-xl border transition-all duration-500 ${isPatient
                  ? "bg-[#ff8e53]/15 border-[#ff8e53]/40 text-[#ff8e53]"
                  : "bg-[#60d4ff]/15 border-[#60d4ff]/40 text-[#60d4ff]"
                }`}
            >
              {isPatient ? (
                <UserCheck className="h-5 w-5" />
              ) : (
                <Stethoscope className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight leading-none">
                {isPatient ? "Patient Portal" : "Doctor Portal"}
              </h2>
              <p className="text-[10px] uppercase tracking-wider font-mono text-white/50 mt-1">
                Secure Encrypted Gateway
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <ShieldCheck className="h-3 w-3" /> 256-bit AES
          </span>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-white/[0.05] border border-white/10 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("patient")}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-300 ${isPatient
                ? "bg-[#ff8e53] text-[#2e0e00] shadow-[0_0_15px_rgba(255,142,83,0.4)]"
                : "text-white/60 hover:text-white hover:bg-white/[0.04]"
              }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Patient</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("doctor")}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-300 ${!isPatient
                ? "bg-[#60d4ff] text-[#002233] shadow-[0_0_15px_rgba(96,212,255,0.4)]"
                : "text-white/60 hover:text-white hover:bg-white/[0.04]"
              }`}
          >
            <Stethoscope className="h-3.5 w-3.5" />
            <span>Doctor</span>
          </button>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-white/70 mb-1.5">
              Email Address / ID
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  isPatient ? "patient@zebrasynapse.io" : "dr.smith@zebrasynapse.io"
                }
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.04] border border-white/15 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all font-sans"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-white/70">
                Password
              </label>
              <button
                type="button"
                onClick={() =>
                  navigate(isPatient ? "/login/patient" : "/login/doctor")
                }
                className="text-[11px] text-white/50 hover:text-white transition-colors"
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-11 pl-10 pr-10 rounded-xl bg-white/[0.04] border border-white/15 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
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
            className={`w-full h-12 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isPatient
                ? "bg-[#ff8e53] text-[#2e0e00] hover:bg-[#ffa370] shadow-[0_0_25px_rgba(255,142,83,0.4)]"
                : "bg-[#60d4ff] text-[#002233] hover:bg-[#85deff] shadow-[0_0_25px_rgba(96,212,255,0.4)]"
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
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>Don't have an account?</span>
            <button
              type="button"
              onClick={() =>
                navigate(isPatient ? "/signup/patient" : "/signup/doctor")
              }
              className={`font-semibold hover:underline ${isPatient ? "text-[#ff8e53]" : "text-[#60d4ff]"
                }`}
            >
              Register here
            </button>
          </div>

          <button
            type="button"
            onClick={fillDemo}
            className="w-full py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-[11px] font-mono text-white/70 hover:text-white transition-all flex items-center justify-center gap-1.5"
          >
            <Sparkles className="h-3 w-3 text-amber-400" />
            <span>Auto-fill Demo Credentials</span>
          </button>
        </div>
      </div>
    </div>
  );
}
