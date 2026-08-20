import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "../ui/badge";
import { cn } from "../ui/utils";

export const portalShellClass =
  "min-h-full text-slate-100 pt-3 sm:pt-4 lg:pt-5 pb-6 sm:pb-8 lg:pb-10 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto font-sans selection:bg-cyan-500/20 selection:text-cyan-300 bg-[#07090e]";

export const portalContentClass = "flex flex-col gap-6 lg:gap-8 relative z-10";

export const portalPanelClass =
  "rounded-[24px] bg-slate-900/70 backdrop-blur-xl border border-blue-900/40 shadow-2xl shadow-blue-950/20 hover:border-cyan-500/30 transition-all duration-200 text-slate-100";

export const portalMutedPanelClass =
  "rounded-[22px] border border-blue-900/30 bg-slate-950/60 shadow-sm text-slate-100";

export const portalInsetClass =
  "rounded-[20px] border border-blue-900/30 bg-slate-950/80 shadow-inner text-slate-200";

export const portalPrimaryButtonClass =
  "border-transparent bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 rounded-2xl";

export const portalSecondaryButtonClass =
  "border-blue-900/40 bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:border-cyan-500/40 shadow-sm transition-all duration-150 rounded-2xl";

export const portalDangerButtonClass =
  "border-rose-500/30 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 hover:border-rose-400/50 shadow-sm transition-all duration-150 rounded-2xl";

export const portalInputClass =
  "h-12 rounded-2xl border border-blue-900/50 bg-slate-950/80 px-4 text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-400 focus-visible:ring-[2px] focus-visible:ring-cyan-500/20 transition-all";

export const portalSelectTriggerClass =
  "h-12 rounded-2xl border border-blue-900/50 bg-slate-950/80 text-slate-100 data-[placeholder]:text-slate-500 focus-visible:border-cyan-400 focus-visible:ring-cyan-500/20 transition-all";

export const portalSelectContentClass =
  "border border-blue-900/50 bg-[#0a0f1d] text-slate-100 shadow-2xl rounded-2xl p-1.5 z-50 backdrop-blur-xl";

export const portalSelectItemClass =
  "rounded-xl text-slate-300 focus:bg-cyan-500/20 focus:text-cyan-300 cursor-pointer text-xs sm:text-sm";

export const portalDialogClass =
  "border border-blue-900/40 bg-[#0a0f1d]/95 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[28px] backdrop-blur-2xl";

export const portalTableWrapClass =
  "overflow-hidden rounded-[22px] border border-blue-900/40 bg-slate-950/70 shadow-sm";

export const portalTableClass = "text-sm text-slate-300";

export const portalTableHeadClass =
  "h-12 border-b border-blue-900/40 bg-slate-900/80 px-4 text-xs font-mono font-semibold uppercase tracking-[0.18em] text-cyan-400";

export const portalTableCellClass = "px-4 py-4 align-top text-slate-300 border-b border-blue-900/20";

export function portalTableRowClass(index: number) {
  return cn(
    "transition-colors hover:bg-slate-800/40",
    index % 2 === 0 ? "bg-slate-950/40" : "bg-slate-900/30",
  );
}

export function statusPillClass(status: string) {
  switch (status.toLowerCase()) {
    case "confirmed":
    case "normal":
    case "optimal":
      return "border-emerald-500/30 bg-emerald-950/40 text-emerald-300 shadow-sm";
    case "completed":
      return "border-cyan-500/30 bg-cyan-950/40 text-cyan-300 shadow-sm";
    case "cancelled":
    case "canceled":
    case "high":
    case "risk":
    case "critical":
      return "border-rose-500/30 bg-rose-950/40 text-rose-300 shadow-sm";
    case "low":
      return "border-sky-500/30 bg-sky-950/40 text-sky-300 shadow-sm";
    case "borderline":
    case "moderate":
    case "elevated":
    case "caution":
      return "border-amber-500/30 bg-amber-950/40 text-amber-300 shadow-sm";
    default:
      return "border-blue-900/40 bg-slate-800/80 text-slate-300";
  }
}

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full border px-3 py-1 text-[11px] font-mono font-semibold uppercase tracking-[0.14em]",
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
  rightContent,
}: {
  eyebrow?: string;
  badge?: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  action?: ReactNode;
  meta?: Array<{ label: string; value: ReactNode }>;
  rightContent?: ReactNode;
}) {
  const eyebrowText = eyebrow || badge || "OVERVIEW";
  const actionContent = actions || action;

  return (
    <section className={cn(portalPanelClass, "relative overflow-hidden px-6 py-7 sm:px-8 lg:px-10 lg:py-8")}>
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl flex-1">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-1 text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-cyan-300">
              {eyebrowText}
            </span>
            {Icon && (
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-300 shadow-sm">
                <Icon className="h-5 w-5 stroke-[2.2]" />
              </span>
            )}
          </div>
          <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl font-['Manrope']">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 md:text-base">{description}</p>
          {meta?.length ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {meta.map((item) => (
                <div key={item.label} className="rounded-[20px] border border-blue-900/40 bg-slate-950/60 px-4 py-3">
                  <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-cyan-400/80">{item.label}</p>
                  <p className="mt-1.5 text-sm font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        {rightContent ? (
          <div className="shrink-0 lg:max-w-md xl:max-w-lg flex flex-col items-center lg:items-end justify-center gap-4">
            {rightContent}
            {actionContent ? <div className="flex shrink-0 items-center gap-3">{actionContent}</div> : null}
          </div>
        ) : actionContent ? (
          <div className="flex shrink-0 items-center gap-3">{actionContent}</div>
        ) : null}
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
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="text-[11px] font-mono uppercase tracking-[0.24em] font-semibold text-cyan-400">{eyebrow}</p>
        ) : null}
        <h2 className="mt-1 text-2xl font-bold text-white tracking-tight font-['Manrope']">{title}</h2>
        {description ? <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{description}</p> : null}
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
      ? "border-amber-500/30 bg-amber-950/20 text-slate-100"
      : tone === "green"
      ? "border-emerald-500/30 bg-emerald-950/20 text-slate-100"
      : tone === "rose"
      ? "border-rose-500/30 bg-rose-950/20 text-slate-100"
      : tone === "purple"
      ? "border-purple-500/30 bg-purple-950/20 text-slate-100"
      : "border-cyan-500/30 bg-cyan-950/20 text-slate-100";

  const iconToneClass =
    tone === "orange"
      ? "bg-amber-950/60 border border-amber-500/40 text-amber-300"
      : tone === "green"
      ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300"
      : tone === "rose"
      ? "bg-rose-950/60 border border-rose-500/40 text-rose-300"
      : tone === "purple"
      ? "bg-purple-950/60 border border-purple-500/40 text-purple-300"
      : "bg-cyan-950/60 border border-cyan-500/40 text-cyan-300";

  return (
    <div className={cn(portalPanelClass, "p-6 transition-all duration-200 hover:scale-[1.01]", toneClass)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white tracking-tight font-mono">{value}</p>
          <p className="mt-1.5 text-xs text-slate-400">{detail}</p>
        </div>
        {Icon ? (
          <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm", iconToneClass)}>
            <Icon className="h-5 w-5 stroke-[2.2]" />
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
      <div className="space-y-4 p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-sm">
          <Icon className="h-6 w-6 stroke-[2.2]" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-white font-['Manrope']">{title}</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-400">{description}</p>
        </div>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </div>
  );
}
