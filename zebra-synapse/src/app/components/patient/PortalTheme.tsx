import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "../ui/badge";
import { cn } from "../ui/utils";

export const portalShellClass = "min-h-full text-slate-100 p-6 sm:p-8 lg:p-10 max-w-[1600px] mx-auto font-sans selection:bg-cyan-500/20 selection:text-cyan-300";

export const portalContentClass = "flex flex-col gap-6 lg:gap-8 relative z-10";

export const portalPanelClass =
  "rounded-[24px] bg-[#0d131f] border border-cyan-500/20 hover:border-cyan-400/40 shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-200 text-slate-100";

export const portalMutedPanelClass =
  "rounded-[22px] border border-cyan-500/15 bg-[#0a0f19] shadow-md";

export const portalInsetClass =
  "rounded-[20px] border border-cyan-500/15 bg-[#070b13] shadow-inner";

export const portalPrimaryButtonClass =
  "border-transparent bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-500 text-slate-950 font-semibold shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:shadow-[0_0_28px_rgba(56,189,248,0.5)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-150";

export const portalSecondaryButtonClass =
  "border-slate-800 bg-[#0e1422] text-slate-200 hover:border-cyan-500/40 hover:bg-[#141b2e] hover:text-white shadow-sm transition-all duration-150";

export const portalDangerButtonClass =
  "border-rose-500/30 bg-rose-950/40 text-rose-200 hover:border-rose-400/50 hover:bg-rose-900/60 hover:text-white shadow-sm transition-all duration-150";

export const portalInputClass =
  "h-12 rounded-2xl border border-slate-800 bg-[#090d16] px-4 text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-400 focus-visible:ring-[2px] focus-visible:ring-cyan-400/20 transition-all";

export const portalSelectTriggerClass =
  "h-12 rounded-2xl border-slate-800 bg-[#090d16] text-slate-100 data-[placeholder]:text-slate-500 focus-visible:border-cyan-400 focus-visible:ring-cyan-400/20 transition-all";

export const portalSelectContentClass =
  "border-cyan-500/20 bg-[#0d131f] text-slate-100 shadow-[0_18px_48px_rgba(0,0,0,0.8)]";

export const portalSelectItemClass =
  "rounded-lg text-slate-200 focus:bg-cyan-500/20 focus:text-cyan-200 cursor-pointer";

export const portalDialogClass =
  "border-cyan-500/25 bg-[#0d131f] text-slate-100 shadow-[0_30px_80px_rgba(0,0,0,0.85)]";

export const portalTableWrapClass =
  "overflow-hidden rounded-[22px] border border-cyan-500/15 bg-[#0a0f19] shadow-lg";

export const portalTableClass = "text-sm text-slate-200";

export const portalTableHeadClass =
  "h-12 border-b border-cyan-500/15 bg-[#0e1524] px-4 text-xs font-mono font-semibold uppercase tracking-[0.18em] text-cyan-400/80";

export const portalTableCellClass = "px-4 py-4 align-top text-slate-200 border-b border-slate-800/60";

export function portalTableRowClass(index: number) {
  return cn(
    "transition-colors hover:bg-cyan-500/10",
    index % 2 === 0 ? "bg-[#0c121e]" : "bg-[#090e18]",
  );
}

export function statusPillClass(status: string) {
  switch (status.toLowerCase()) {
    case "confirmed":
    case "normal":
      return "border-emerald-500/30 bg-emerald-500/15 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]";
    case "completed":
      return "border-cyan-500/30 bg-cyan-500/15 text-cyan-300 shadow-[0_0_10px_rgba(56,189,248,0.2)]";
    case "cancelled":
    case "canceled":
      return "border-rose-500/30 bg-rose-500/15 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.2)]";
    case "high":
    case "risk":
      return "border-rose-500/30 bg-rose-500/15 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.2)]";
    case "low":
      return "border-sky-500/30 bg-sky-500/15 text-sky-300 shadow-[0_0_10px_rgba(14,165,233,0.2)]";
    case "borderline":
    case "moderate":
    case "elevated":
      return "border-amber-500/30 bg-amber-500/15 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]";
    default:
      return "border-slate-700 bg-slate-900 text-slate-300";
  }
}

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full border px-3 py-1 text-[11px] font-mono font-semibold uppercase tracking-[0.18em]",
        statusPillClass(status),
        className,
      )}
    >
      {status}
    </Badge>
  );
}

export function PatientPortalPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(portalShellClass, className)}>
      <div className={portalContentClass}>{children}</div>
    </div>
  );
}

export function PatientPageHero({
  eyebrow,
  badge,
  title,
  description,
  icon: Icon,
  actions,
  action,
  meta,
}: {
  eyebrow?: string;
  badge?: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  action?: ReactNode;
  meta?: Array<{ label: string; value: ReactNode }>;
}) {
  const eyebrowText = eyebrow || badge || "OVERVIEW";
  const actionContent = actions || action;

  return (
    <section className={cn(portalPanelClass, "relative overflow-hidden px-6 py-7 sm:px-8 lg:px-10 lg:py-8 border-cyan-500/30 bg-[#0d131f] shadow-[0_10px_30px_rgba(0,0,0,0.5)]")}>
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-cyan-500/30 bg-cyan-950/80 px-3.5 py-1 text-[11px] font-mono font-semibold uppercase tracking-[0.24em] text-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.2)]">
              {eyebrowText}
            </span>
            {Icon && (
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/30 bg-[#070b13] text-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.15)]">
                <Icon className="h-5 w-5" />
              </span>
            )}
          </div>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl font-['Manrope']">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">{description}</p>
          {meta?.length ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {meta.map((item) => (
                <div key={item.label} className="rounded-[20px] border border-cyan-500/20 bg-[#080c16] px-4 py-3">
                  <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-cyan-400/70">{item.label}</p>
                  <p className="mt-2 text-sm font-medium text-slate-100">{item.value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        {actionContent ? <div className="flex shrink-0 items-center gap-3">{actionContent}</div> : null}
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
          <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-cyan-400">{eyebrow}</p>
        ) : null}
        <h2 className="mt-1 text-2xl font-semibold text-white tracking-tight font-['Manrope']">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p> : null}
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
    tone === "orange" || tone === "purple" || tone === "blue"
      ? "border-cyan-500/30 bg-[#0e1628] text-cyan-200 shadow-[0_0_20px_rgba(56,189,248,0.1)]"
      : tone === "green"
      ? "border-emerald-500/30 bg-[#0c1a1f] text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
      : tone === "rose"
      ? "border-rose-500/30 bg-[#1f0f18] text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.1)]"
      : "border-sky-500/30 bg-[#0e172a] text-sky-200 shadow-[0_0_20px_rgba(14,165,233,0.1)]";

  return (
    <div className={cn(portalPanelClass, "p-6 transition-all duration-200 hover:scale-[1.01]", toneClass)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-cyan-400/80">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-white tracking-tight">{value}</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p>
        </div>
        {Icon ? (
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/30 bg-[#070b13] text-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.2)]">
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
    <div className={cn(portalPanelClass, "max-w-3xl border-cyan-500/30 bg-[#0d131f]")}>
      <div className="space-y-4 p-7">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/30 bg-[#070b13] text-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
          <Icon className="h-6 w-6" strokeWidth={1.7} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white font-['Manrope']">{title}</h2>
          <p className="max-w-2xl text-sm leading-7 text-slate-300">{description}</p>
        </div>
        {action ? <div>{action}</div> : null}
      </div>
    </div>
  );
}

