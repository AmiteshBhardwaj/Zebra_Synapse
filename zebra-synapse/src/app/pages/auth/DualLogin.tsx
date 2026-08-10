import { useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { getAuthRequestErrorMessage, getSignInErrorMessage } from "../../../lib/authErrors";
import { getAuthEmailRedirectUrl, getSupabase, isSupabaseConfigured } from "../../../lib/supabase";

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
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

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
    if (!isSupabaseConfigured()) {
      toast.error("Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env");
      return;
    }
    const sb = getSupabase();
    if (!sb) return;

    const emailTrimmed = email.trim();
    if (!emailTrimmed || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await sb.auth.signInWithPassword({
        email: emailTrimmed,
        password,
      });

      if (error) {
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
        toast.error("No profile record found. Please verify your Supabase database migration.");
        await sb.auth.signOut();
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

  const handleResendConfirmation = async () => {
    if (!isSupabaseConfigured()) {
      toast.error("Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env");
      return;
    }
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Please enter your email address first.");
      return;
    }
    const sb = getSupabase();
    if (!sb) return;
    const emailRedirectTo = getAuthEmailRedirectUrl(
      activePortal === "doctor" ? "/login/doctor" : "/login/patient"
    );
    setResending(true);
    try {
      const { error } = await sb.auth.resend({
        type: "signup",
        email: trimmed,
        options: { emailRedirectTo },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Confirmation email sent! Please check your inbox and spam folder.");
    } catch (error) {
      toast.error(getAuthRequestErrorMessage(error));
    } finally {
      setResending(false);
    }
  };

  const isPatient = activePortal === "patient";

  return (
    <div className="relative h-screen max-h-screen bg-[#051424] text-[#d4e4fa] flex flex-col justify-between overflow-hidden antialiased selection:bg-[#ffb795]/30">
      {/* Background Energy Artwork Canvas & Dimming Overlay */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 bg-cover bg-center w-full h-full transition-opacity duration-1000"
          style={{
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAAdFqHkTQDMiMDDjdNAPfXJO3tpx13D7A2ZmTREcR0o4_1tHI7Ac_Nvk5WAi0ik04ojOsMbKX5egO1F040WKE2PNNg8OZbMNHUYu-VocSvh9zoexbce1F1a6ID2OivJhjCXnKhwzK1Wzj20Qv-UNW9uhjy-6buIhl-suuXAPsmm8iWpim9FSDbIt8V8aBPiFcLojLBAX8spp3OvhZW0l3FK8-egTn47AnJIHkP49fFvzjFTD0pT5rLmFEF7CQKdZuPUQ')`,
          }}
        />
        {/* Ambient Gradient Fallback & Dimming Overlay */}
        <div className="absolute inset-0 bg-[#051424]/65 backdrop-blur-[2px]" />
        <div
          className={`absolute left-[-15%] top-[-10%] h-[500px] w-[500px] rounded-full blur-[100px] pointer-events-none transition-all duration-700 ${
            isPatient
              ? "bg-[radial-gradient(circle,_rgba(255,142,83,0.25),_rgba(255,142,83,0)_70%)]"
              : "bg-[radial-gradient(circle,_rgba(96,212,255,0.25),_rgba(96,212,255,0)_70%)]"
          }`}
        />
        <div
          className={`absolute right-[-15%] bottom-[-10%] h-[500px] w-[500px] rounded-full blur-[100px] pointer-events-none transition-all duration-700 ${
            isPatient
              ? "bg-[radial-gradient(circle,_rgba(147,51,234,0.2),_rgba(147,51,234,0)_70%)]"
              : "bg-[radial-gradient(circle,_rgba(255,142,83,0.2),_rgba(255,142,83,0)_70%)]"
          }`}
        />
      </div>

      {/* Main Content Canvas - Centered viewport height without scrolling */}
      <main className="flex-grow flex flex-col items-center justify-center relative z-10 px-4 sm:px-6 py-2">
        <div className="w-full max-w-[420px] flex flex-col items-center">
          {/* Brand Header */}
          <div className="mb-4 text-center">
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
            className="rounded-xl w-full p-6 flex flex-col gap-4 shadow-2xl"
            style={{
              background: "rgba(30, 41, 59, 0.45)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(164, 140, 129, 0.2)",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
            }}
          >
            <h2 className="text-xl font-semibold text-[#d4e4fa] text-center">
              Login
            </h2>

            {/* Portal Switcher Toggle */}
            <div className="flex bg-[#1c2b3c] rounded-lg p-1 border border-[#56433a]">
              <button
                type="button"
                onClick={() => handlePortalSwitch("patient")}
                className={`flex-1 py-1.5 font-mono text-xs rounded-md transition-all text-center ${
                  isPatient
                    ? "bg-[#ff8e53] text-[#562000] font-bold shadow-sm"
                    : "text-[#dcc1b5] hover:text-white"
                }`}
              >
                Patient Portal
              </button>

              <button
                type="button"
                onClick={() => handlePortalSwitch("doctor")}
                className={`flex-1 py-1.5 font-mono text-xs rounded-md transition-all text-center ${
                  !isPatient
                    ? "bg-[#60d4ff] text-[#002738] font-bold shadow-sm"
                    : "text-[#dcc1b5] hover:text-white"
                }`}
              >
                Doctor Portal
              </button>
            </div>

            {/* Supabase Status / Warnings */}
            {!isSupabaseConfigured() && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200 leading-tight font-mono">
                Supabase credentials not detected. Please add <code className="text-white">VITE_SUPABASE_URL</code> and <code className="text-white">VITE_SUPABASE_ANON_KEY</code> to <code className="text-white">.env</code>.
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
                    placeholder={isPatient ? "name@domain.com" : "doctor@domain.com"}
                    className="w-full bg-[#0d1c2d]/50 border-b border-[#56433a] rounded-t-md px-3.5 py-2 text-xs sm:text-sm text-[#d4e4fa] focus:outline-none focus:border-[#ffb795] focus:ring-0 transition-colors"
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
                    placeholder="••••••••"
                    className="w-full bg-[#0d1c2d]/50 border-b border-[#56433a] rounded-t-md px-3.5 py-2 text-xs sm:text-sm text-[#d4e4fa] focus:outline-none focus:border-[#ffb795] focus:ring-0 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#dcc1b5] hover:text-white transition-colors"
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
                  onClick={handleResendConfirmation}
                  disabled={resending}
                  className="text-[#ffb795] hover:text-[#ffdbcc] transition-colors"
                >
                  {resending ? "Sending..." : "Forgot Password?"}
                </button>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-2.5 rounded-lg font-semibold text-xs sm:text-sm mt-1 transition-colors flex justify-center items-center gap-2 ${
                  isPatient
                    ? "bg-[#ffb795] text-[#562000] hover:bg-[#ffdbcc] shadow-[0_0_15px_rgba(255,183,149,0.3)]"
                    : "bg-[#60d4ff] text-[#002738] hover:bg-[#a2ecff] shadow-[0_0_15px_rgba(96,212,255,0.3)]"
                }`}
              >
                <span>{submitting ? "Signing in..." : "Login"}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {/* Footer Registration Link */}
            <div className="text-center text-xs text-[#dcc1b5] mt-1">
              <p>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() =>
                    navigate(isPatient ? "/signup/patient" : "/signup/doctor")
                  }
                  className="text-[#ffb795] hover:text-[#ffdbcc] font-semibold transition-colors"
                >
                  Register
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Docked Footer Bar */}
      <footer className="relative z-20 bg-[#010f1f]/80 backdrop-blur-md border-t border-[#56433a] w-full py-3 px-6 shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-center w-full max-w-7xl mx-auto text-[11px] text-[#bec7d9]">
          <div className="font-mono mb-1 sm:mb-0">
            © 2024 Zebra Synapse Medical Intelligence. Encrypted Clinical Environment.
          </div>
          <nav className="flex flex-wrap justify-center gap-4 font-mono">
            <a
              href="#"
              className="text-[#dcc1b5] hover:text-[#ffb795] underline transition-all opacity-80 hover:opacity-100"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-[#dcc1b5] hover:text-[#ffb795] underline transition-all opacity-80 hover:opacity-100"
            >
              Terms of Service
            </a>
            <a
              href="#"
              className="text-[#dcc1b5] hover:text-[#ffb795] underline transition-all opacity-80 hover:opacity-100"
            >
              HIPAA Compliance
            </a>
            <a
              href="#"
              className="text-[#dcc1b5] hover:text-[#ffb795] underline transition-all opacity-80 hover:opacity-100"
            >
              Contact
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
