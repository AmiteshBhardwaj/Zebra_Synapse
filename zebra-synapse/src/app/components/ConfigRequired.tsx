import type { ReactNode } from "react";
import { Link } from "react-router";
import { AlertTriangle, Database } from "lucide-react";

function SetupState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof AlertTriangle;
  title: string;
  description: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden px-6 py-10 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="clinical-grid absolute inset-0 opacity-[0.05]" />
        <div className="absolute left-[8%] top-[12%] h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(255,122,51,0.2),_rgba(255,122,51,0)_72%)] blur-3xl" />
        <div className="absolute right-[8%] top-[18%] h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(96,212,255,0.14),_rgba(96,212,255,0)_72%)] blur-3xl" />
      </div>
      <div className="relative z-10 mx-auto flex min-h-[80vh] max-w-2xl items-center justify-center">
        <div className="clinical-surface w-full rounded-[32px] p-8 sm:p-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-white/10 bg-white/[0.04]">
            <Icon className="h-8 w-8 text-[#ffb17e]" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold text-white">{title}</h1>
          <div className="mt-4 text-sm leading-7 text-[#92a8c7]">{description}</div>
          <Link
            to="/"
            className="mt-8 inline-flex rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
          >
            Back to home
          </Link>
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
          Add <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-white">VITE_SUPABASE_URL</code>{" "}
          and <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-white">VITE_SUPABASE_ANON_KEY</code>{" "}
          to a <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-white">.env</code> file in the
          project root, then restart the dev server. Copy{" "}
          <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-white">.env.example</code> as a starting point.
        </>
      }
    />
  );
}

export function ProfileMissing() {
  return (
    <SetupState
      icon={Database}
      title="Profile not found"
      description={
        <>
          Your account exists but there is no row in{" "}
          <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-white">profiles</code>. Run the SQL in{" "}
          <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-white">
            supabase/migrations/001_profiles.sql
          </code>{" "}
          in the Supabase SQL Editor, then sign up again or repair the missing profile row.
        </>
      }
    />
  );
}
