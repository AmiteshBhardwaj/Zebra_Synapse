import { useNavigate } from "react-router";
import { Activity, ArrowRight, BrainCircuit, ShieldCheck, Stethoscope, User } from "lucide-react";
import { Button } from "../components/ui/button";

const portalCards = [
  {
    title: "Patient Portal",
    description:
      "Upload reports, review structured biomarkers, and understand what needs attention next without wading through clutter.",
    icon: User,
    accentClass: "text-[#ffb17e]",
    ringClass: "border-[#ff7a33]/20 bg-[#ff7a33]/10",
    primaryLabel: "Patient Login",
    secondaryLabel: "Create account",
    onPrimary: "/login/patient",
    onSecondary: "/signup/patient",
  },
  {
    title: "Doctor Portal",
    description:
      "Search linked patients, triage risk quickly, and move from overview to detail inside one consistent clinical workspace.",
    icon: Stethoscope,
    accentClass: "text-[#8fe7ff]",
    ringClass: "border-[#60d4ff]/20 bg-[#60d4ff]/10",
    primaryLabel: "Doctor Login",
    secondaryLabel: "Create account",
    onPrimary: "/login/doctor",
    onSecondary: "/signup/doctor",
  },
] as const;

const signalCards = [
  {
    label: "Structured panels",
    value: "Lab uploads become usable biomarkers",
    icon: Activity,
  },
  {
    label: "AI signal",
    value: "Insights stay visible, not buried",
    icon: BrainCircuit,
  },
  {
    label: "Trust layer",
    value: "Shared patient-doctor workflow, secured",
    icon: ShieldCheck,
  },
] as const;

export default function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="clinical-grid absolute inset-0 opacity-[0.05]" />
        <div className="absolute left-[-8%] top-[4%] h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(255,122,51,0.24),_rgba(255,122,51,0)_72%)] blur-3xl" />
        <div className="absolute right-[-8%] top-[8%] h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(96,212,255,0.18),_rgba(96,212,255,0)_72%)] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-xl sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ff7a33,#60d4ff)] shadow-[0_18px_36px_rgba(10,18,32,0.4)]">
              <Activity className="h-4 w-4 text-white" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#7fdcff]">Clinical intelligence</p>
              <h1 className="text-base font-semibold text-white">Zebra Synapse</h1>
            </div>
          </div>
          <div className="hidden rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/55 sm:inline-flex">
            Shared patient + doctor workspace
          </div>
        </header>

        <div className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-12">
          <section className="max-w-3xl">
            <div className="inline-flex rounded-full border border-[#60d4ff]/18 bg-[#60d4ff]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#a2ecff]">
              Calm interface. Faster decisions.
            </div>
            <h2 className="mt-6 max-w-3xl text-5xl font-semibold tracking-[-0.05em] text-white sm:text-6xl xl:text-7xl">
              Clinical data,
              <span className="clinical-text-gradient"> made legible.</span>
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#9bb0cb] sm:text-lg">
              Zebra Synapse turns fragmented uploads into a cleaner healthcare workspace where patients
              see what changed and doctors see what matters first.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {signalCards.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="clinical-surface rounded-[24px] p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                      <Icon className="h-5 w-5 text-[#8fe7ff]" />
                    </div>
                    <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/45">{item.label}</p>
                    <p className="mt-2 text-sm leading-6 text-white">{item.value}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid gap-4">
            {portalCards.map((card) => {
              const Icon = card.icon;

              return (
                <div key={card.title} className="clinical-surface rounded-[32px] p-6 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border ${card.ringClass}`}>
                        <Icon className={`h-5 w-5 ${card.accentClass}`} strokeWidth={1.9} />
                      </div>
                      <h3 className="mt-5 text-2xl font-semibold text-white">{card.title}</h3>
                      <p className="mt-3 max-w-md text-sm leading-7 text-[#92a8c7]">{card.description}</p>
                    </div>
                    <ArrowRight className="mt-1 h-5 w-5 text-white/32" />
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Button
                      className="h-12 flex-1 rounded-2xl border-transparent bg-[linear-gradient(135deg,#ff7a33,#ff9b61)] text-white hover:brightness-110"
                      onClick={() => navigate(card.onPrimary)}
                    >
                      {card.primaryLabel}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12 flex-1 rounded-2xl border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:text-white"
                      onClick={() => navigate(card.onSecondary)}
                    >
                      {card.secondaryLabel}
                    </Button>
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      </div>
    </div>
  );
}
