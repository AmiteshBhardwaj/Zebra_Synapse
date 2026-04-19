import type { ReactNode } from "react";
import { ArrowLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { Activity, BrainCircuit, ShieldCheck } from "lucide-react";
import { Button } from "../ui/button";

type AuthExperienceShellProps = {
  title: string;
  description: string;
  eyebrow: string;
  icon: LucideIcon;
  iconAccent: string;
  onBack: () => void;
  children: ReactNode;
};

const valuePoints = [
  {
    title: "Structured health data",
    body: "Lab reports, profiles, and care context stay readable instead of scattered.",
    icon: Activity,
  },
  {
    title: "AI-guided clarity",
    body: "Use insights as signal, not as noisy decoration.",
    icon: BrainCircuit,
  },
  {
    title: "Secure care flow",
    body: "Built for shared patient-doctor work inside one protected system.",
    icon: ShieldCheck,
  },
] as const;

export default function AuthExperienceShell({
  title,
  description,
  eyebrow,
  icon: Icon,
  iconAccent,
  onBack,
  children,
}: AuthExperienceShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="clinical-grid absolute inset-0 opacity-[0.05]" />
        <div className="absolute left-[-8%] top-[6%] h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(255,122,51,0.18),_rgba(255,122,51,0)_72%)] blur-3xl" />
        <div className="absolute right-[-8%] top-[10%] h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(96,212,255,0.16),_rgba(96,212,255,0)_72%)] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          className="mb-6 w-fit rounded-full border border-white/10 bg-white/[0.03] px-4 text-white/78 hover:bg-white/[0.08] hover:text-white"
          onClick={onBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <div className="grid flex-1 items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="clinical-surface rounded-[32px] p-6 sm:p-8 lg:p-9">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#60d4ff]/18 bg-[#60d4ff]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#a2ecff]">
              {eyebrow}
            </div>

            <div className="mt-6 flex h-14 w-14 items-center justify-center rounded-[22px] border border-white/10 bg-white/[0.05]">
              <Icon className="h-7 w-7" strokeWidth={1.8} style={{ color: iconAccent }} />
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">{title}</h1>
            <p className="mt-4 max-w-lg text-sm leading-7 text-[#92a8c7] sm:text-base">{description}</p>

            <div className="mt-8 space-y-3">
              {valuePoints.map((item) => {
                const ValueIcon = item.icon;

                return (
                  <div key={item.title} className="flex gap-4 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                      <ValueIcon className="h-5 w-5 text-[#8fe7ff]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <ChevronRight className="h-4 w-4 text-white/30" />
                      </div>
                      <p className="mt-1 text-sm leading-6 text-[#92a8c7]">{item.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="clinical-surface rounded-[32px] p-6 sm:p-8 lg:p-9">
            {children}
          </section>
        </div>
      </div>
    </div>
  );
}
