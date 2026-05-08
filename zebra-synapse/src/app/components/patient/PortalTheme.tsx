import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "../ui/badge";
import { cn } from "../ui/utils";

export const portalShellClass = "min-h-full text-white";

export const portalContentClass = "flex flex-col gap-6 lg:gap-8";

export const portalPanelClass =
  "clinical-surface rounded-[28px] text-white backdrop-blur-xl transition-all duration-200";

export const portalMutedPanelClass =
  "rounded-[24px] border border-white/8 bg-white/[0.03] backdrop-blur-xl";

export const portalInsetClass =
  "rounded-[22px] border border-white/8 bg-[#0b1525]/80 backdrop-blur-xl";

export const portalPrimaryButtonClass =
  "border-transparent bg-[linear-gradient(135deg,#ff7a33,#ff9b61)] text-white shadow-[0_18px_40px_rgba(255,122,51,0.22)] hover:brightness-110";

export const portalSecondaryButtonClass =
  "border-white/10 bg-white/[0.03] text-white hover:border-white/18 hover:bg-white/[0.08] hover:text-white";

export const portalDangerButtonClass =
  "border-[#ff6f91]/30 bg-[#ff6f91]/12 text-[#ffdbe4] hover:border-[#ff6f91]/45 hover:bg-[#ff6f91]/18 hover:text-white";

export const portalInputClass =
  "h-12 rounded-2xl border border-white/10 bg-[#0d1829]/85 px-4 text-white placeholder:text-[#6f85a3] focus-visible:border-[#60d4ff] focus-visible:ring-[3px] focus-visible:ring-[#60d4ff]/18";

export const portalSelectTriggerClass =
  "h-12 rounded-2xl border-white/10 bg-[#0d1829]/85 text-white data-[placeholder]:text-[#6f85a3] focus-visible:border-[#60d4ff] focus-visible:ring-[#60d4ff]/20";

export const portalSelectContentClass =
  "border-white/10 bg-[#0a1323] text-white shadow-[0_18px_48px_rgba(3,8,18,0.5)]";

export const portalSelectItemClass =
  "rounded-lg text-white focus:bg-white/[0.08] focus:text-white";

export const portalDialogClass =
  "border-white/10 bg-[#0b1324]/95 text-white shadow-[0_30px_80px_rgba(3,8,18,0.6)] backdrop-blur-2xl";

export const portalTableWrapClass =
  "overflow-hidden rounded-[24px] border border-white/8 bg-[#0c1626]/90";

export const portalTableClass = "text-sm text-[#dce8f8]";

export const portalTableHeadClass =
  "h-12 border-b border-white/8 bg-white/[0.04] px-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#8ca0bb]";

export const portalTableCellClass = "px-4 py-4 align-top text-[#dce8f8]";

export function portalTableRowClass(index: number) {
  return cn(
    "border-white/6 transition-colors hover:bg-white/[0.04]",
    index % 2 === 0 ? "bg-white/[0.015]" : "bg-transparent",
  );
}

export function statusPillClass(status: string) {
  switch (status.toLowerCase()) {
    case "confirmed":
    case "normal":
      return "border-emerald-500/25 bg-emerald-500/12 text-emerald-200";
    case "completed":
      return "border-white/12 bg-white/[0.06] text-[#dce8f8]";
    case "high":
    case "risk":
      return "border-[#ff6f91]/25 bg-[#ff6f91]/12 text-[#ffd8e4]";
    case "low":
      return "border-[#60d4ff]/25 bg-[#60d4ff]/12 text-[#b7efff]";
    case "borderline":
    case "moderate":
    case "elevated":
      return "border-[#ffb454]/25 bg-[#ffb454]/12 text-[#ffe0af]";
    default:
      return "border-white/12 bg-white/[0.06] text-[#dce8f8]";
  }
}

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
        statusPillClass(status),
        className,
      )}
    >
      {status}
    </Badge>
  );
}

export function PatientPortalPage({ children }: { children: ReactNode }) {
  return (
    <div className={portalShellClass}>
      <div className={portalContentClass}>{children}</div>
    </div>
  );
}

export function PatientPageHero({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  meta,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: ReactNode;
  meta?: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <section className={cn(portalPanelClass, "relative overflow-hidden px-5 py-6 sm:px-6 lg:px-8 lg:py-7")}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-0 h-44 w-44 rounded-full bg-[radial-gradient(circle,_rgba(255,122,51,0.2)_0%,_rgba(255,122,51,0)_72%)] blur-2xl" />
        <div className="absolute right-0 top-3 h-56 w-56 rounded-full bg-[radial-gradient(circle,_rgba(96,212,255,0.16)_0%,_rgba(96,212,255,0)_72%)] blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-[#60d4ff]/18 bg-[#60d4ff]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#a2ecff]">
              {eyebrow}
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <Icon className="h-5 w-5 text-[#ffb17e]" />
            </span>
          </div>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#92a8c7] md:text-base">{description}</p>
          {meta?.length ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {meta.map((item) => (
                <div key={item.label} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">{item.label}</p>
                  <p className="mt-2 text-sm font-medium text-white">{item.value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#7fdcff]">{eyebrow}</p>
        ) : null}
        <h2 className="mt-1 text-2xl font-semibold text-white">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-6 text-[#92a8c7]">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: ReactNode;
  detail: string;
  icon?: LucideIcon;
  tone?: "blue" | "orange" | "purple" | "green" | "rose";
}) {
  const toneClass =
    tone === "orange"
      ? "from-[rgba(255,122,51,0.16)] to-transparent text-[#ffd0a8]"
      : tone === "purple"
      ? "from-[rgba(159,140,255,0.16)] to-transparent text-[#d7ceff]"
      : tone === "green"
      ? "from-[rgba(122,240,194,0.16)] to-transparent text-[#c9ffe8]"
      : tone === "rose"
      ? "from-[rgba(255,111,145,0.16)] to-transparent text-[#ffd8e4]"
      : "from-[rgba(96,212,255,0.16)] to-transparent text-[#b7efff]";

  return (
    <div className={cn(portalPanelClass, "bg-gradient-to-br p-5", toneClass)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
          <p className="mt-2 text-sm leading-6 text-[#92a8c7]">{detail}</p>
        </div>
        {Icon ? (
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyStateCard({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className={cn(portalPanelClass, "max-w-3xl")}>
      <div className="space-y-4 p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04]">
          <Icon className="h-6 w-6 text-[#ffb17e]" strokeWidth={1.7} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="max-w-2xl text-sm leading-7 text-[#92a8c7]">{description}</p>
        </div>
        {action ? <div>{action}</div> : null}
      </div>
    </div>
  );
}
