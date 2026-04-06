import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  EmptyStateCard,
  PatientPageHero,
  PatientPortalPage,
  portalInsetClass,
  portalMutedPanelClass,
  portalPanelClass,
} from "./PortalTheme";

type HighlightItem = {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: "orange" | "purple" | "blue" | "yellow" | "red";
};

const toneClassMap: Record<NonNullable<HighlightItem["tone"]>, string> = {
  orange: "text-[#ff9c61] bg-[#FF6A00]/12 border-[#FF6A00]/20",
  purple: "text-[#b4abff] bg-[#6C5BD4]/12 border-[#6C5BD4]/20",
  blue: "text-[#93c5fd] bg-[#3B82F6]/12 border-[#3B82F6]/20",
  yellow: "text-[#ffe09d] bg-[#FFC857]/12 border-[#FFC857]/20",
  red: "text-[#ffb3b3] bg-[#FF4D4D]/12 border-[#FF4D4D]/20",
};

export default function PatientFeaturePlaceholder({
  eyebrow,
  title,
  description,
  icon,
  meta,
  highlights,
  emptyTitle,
  emptyDescription,
  callout,
  supplementary,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  meta: Array<{ label: string; value: ReactNode }>;
  highlights: HighlightItem[];
  emptyTitle: string;
  emptyDescription: string;
  callout?: ReactNode;
  supplementary?: ReactNode;
}) {
  return (
    <PatientPortalPage>
      <PatientPageHero
        eyebrow={eyebrow}
        title={title}
        description={description}
        icon={icon}
        meta={meta}
      />

      {callout}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <EmptyStateCard
          icon={icon}
          title={emptyTitle}
          description={emptyDescription}
        />

        <div className={`${portalPanelClass} p-6`}>
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/42">Readiness Signals</p>
            <h2 className="text-xl font-semibold text-white">What unlocks this section</h2>
            <p className="text-sm leading-7 text-[#A1A1AA]">
              These signals stay connected to your actual records so the portal does not show generic placeholder advice as if it were personal guidance.
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            {highlights.map((item) => {
              const Icon = item.icon;
              const toneClass = toneClassMap[item.tone ?? "orange"];

              return (
                <div key={item.label} className={`${portalMutedPanelClass} p-4`}>
                  <div className="flex items-start gap-3">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${toneClass}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">{item.label}</p>
                      <p className="mt-2 text-sm font-medium leading-6 text-white">{item.value}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {supplementary ? <div className={`mt-5 p-4 ${portalInsetClass}`}>{supplementary}</div> : null}
        </div>
      </div>
    </PatientPortalPage>
  );
}
