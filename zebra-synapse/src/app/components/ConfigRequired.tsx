import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { AlertTriangle, Database, RefreshCw } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";

function SetupState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof AlertTriangle;
  title: string;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#090d16] px-6 py-10 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="clinical-grid absolute inset-0 opacity-[0.05]" />
        <div className="absolute left-[8%] top-[12%] h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(255,122,51,0.2),_rgba(255,122,51,0)_72%)] blur-3xl" />
        <div className="absolute right-[8%] top-[18%] h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(96,212,255,0.14),_rgba(96,212,255,0)_72%)] blur-3xl" />
      </div>
      <div className="relative z-10 mx-auto flex min-h-[80vh] max-w-2xl items-center justify-center">
        <div className="w-full rounded-[32px] border border-white/10 bg-[#121824] p-8 sm:p-10 shadow-2xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-white/15 bg-white/[0.08]">
            <Icon className="h-8 w-8 text-[#ffb17e]" />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-white">{title}</h1>
          <div className="mt-4 text-sm sm:text-base leading-relaxed text-[#c2d4ec]">{description}</div>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            {action}
            <Link
              to="/"
              className="inline-flex rounded-full border border-white/15 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.12]"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConfigRequired() {
  return (
    <SetupState
      icon={AlertTriangle}
      title="Supabase not configured"
      description={
        <>
          Add <code className="rounded bg-white/10 px-2 py-0.5 text-xs text-white font-mono">VITE_SUPABASE_URL</code>{" "}
          and <code className="rounded bg-white/10 px-2 py-0.5 text-xs text-white font-mono">VITE_SUPABASE_ANON_KEY</code>{" "}
          to a <code className="rounded bg-white/10 px-2 py-0.5 text-xs text-white font-mono">.env</code> file in the
          project root, then restart the dev server. Copy{" "}
          <code className="rounded bg-white/10 px-2 py-0.5 text-xs text-white font-mono">.env.example</code> as a starting point.
        </>
      }
    />
  );
}

export function ProfileMissing() {
  const { refreshProfile } = useAuth();
  const [repairing, setRepairing] = useState(false);
  const navigate = useNavigate();

  const handleRepair = async () => {
    setRepairing(true);
    try {
      await refreshProfile();
      navigate("/patient");
    } catch {
      window.location.reload();
    } finally {
      setRepairing(false);
    }
  };

  return (
    <SetupState
      icon={Database}
      title="Profile Setup Needed"
      description={
        <>
          Your account exists in authentication, but its profile details are being initialized. Click below to complete profile setup and continue to your dashboard.
        </>
      }
      action={
        <button
          type="button"
          onClick={handleRepair}
          disabled={repairing}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#00a8ff] to-[#0077ff] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${repairing ? "animate-spin" : ""}`} />
          {repairing ? "Initializing profile..." : "Complete Profile & Sign In"}
        </button>
      }
    />
  );
}
