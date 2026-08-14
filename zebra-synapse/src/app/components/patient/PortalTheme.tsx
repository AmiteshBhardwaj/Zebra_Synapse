import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "../ui/badge";
import { cn } from "../ui/utils";

export const portalShellClass =
  "min-h-full text-slate-800 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto font-sans selection:bg-lime-500/20 selection:text-lime-900 bg-[#f6f8f5]";

export const portalContentClass = "flex flex-col gap-6 lg:gap-8 relative z-10";

export const portalPanelClass =
  "rounded-[24px] bg-white border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-all duration-200 text-slate-800";

export const portalMutedPanelClass =
  "rounded-[22px] border border-slate-100 bg-[#f8fafc] shadow-sm text-slate-800";

export const portalInsetClass =
  "rounded-[20px] border border-slate-100 bg-[#f8fafc] shadow-inner text-slate-800";

export const portalPrimaryButtonClass =
  "border-transparent bg-[#84cc16] hover:bg-[#73b512] text-white font-semibold shadow-sm hover:shadow-md hover:shadow-lime-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 rounded-2xl";

export const portalSecondaryButtonClass =
  "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all duration-150 rounded-2xl";

export const portalDangerButtonClass =
  "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 shadow-sm transition-all duration-150 rounded-2xl";

export const portalInputClass =
  "h-12 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus-visible:border-lime-500 focus-visible:ring-[2px] focus-visible:ring-lime-500/20 transition-all";

export const portalSelectTriggerClass =
  "h-12 rounded-2xl border-slate-200 bg-white text-slate-900 data-[placeholder]:text-slate-400 focus-visible:border-lime-500 focus-visible:ring-lime-500/20 transition-all";

export const portalSelectContentClass =
  "border-slate-100 bg-white text-slate-900 shadow-xl rounded-2xl p-1.5 z-50";

export const portalSelectItemClass =
  "rounded-xl text-slate-700 focus:bg-lime-50 focus:text-lime-900 cursor-pointer text-xs sm:text-sm";

export const portalDialogClass =
  "border-slate-100 bg-white text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.08)] rounded-[28px]";

export const portalTableWrapClass =
  "overflow-hidden rounded-[22px] border border-slate-100 bg-white shadow-sm";

export const portalTableClass = "text-sm text-slate-700";

export const portalTableHeadClass =
  "h-12 border-b border-slate-100 bg-slate-50/80 px-4 text-xs font-mono font-semibold uppercase tracking-[0.18em] text-slate-500";

export const portalTableCellClass = "px-4 py-4 align-top text-slate-700 border-b border-slate-100";

export function portalTableRowClass(index: number) {
  return cn(
    "transition-colors hover:bg-lime-50/30",
    index % 2 === 0 ? "bg-white" : "bg-slate-50/50",
  );
}

export function statusPillClass(status: string) {
  switch (status.toLowerCase()) {
    case "confirmed":
    case "normal":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm";
    case "completed":
      return "border-lime-200 bg-lime-50 text-lime-700 shadow-sm";
    case "cancelled":
    case "canceled":
    case "high":
    case "risk":
      return "border-rose-200 bg-rose-50 text-rose-700 shadow-sm";
    case "low":
      return "border-sky-200 bg-sky-50 text-sky-700 shadow-sm";
    case "borderline":
    case "moderate":
    case "elevated":
      return "border-amber-200 bg-amber-50 text-amber-700 shadow-sm";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
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
    <section className={cn(portalPanelClass, "relative overflow-hidden px-6 py-7 sm:px-8 lg:px-10 lg:py-8")}>
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-lime-200 bg-lime-50 px-3.5 py-1 text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-lime-800">
              {eyebrowText}
            </span>
            {Icon && (
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-500/15 text-lime-600 shadow-sm">
                <Icon className="h-5 w-5 stroke-[2.2]" />
              </span>
            )}
          </div>
          <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl font-['Manrope']">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500 md:text-base">{description}</p>
          {meta?.length ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {meta.map((item) => (
                <div key={item.label} className="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                  <p className="mt-1.5 text-sm font-semibold text-slate-900">{item.value}</p>
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
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="text-[11px] font-mono uppercase tracking-[0.24em] font-semibold text-lime-600">{eyebrow}</p>
        ) : null}
        <h2 className="mt-1 text-2xl font-bold text-slate-900 tracking-tight font-['Manrope']">{title}</h2>
        {description ? <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{description}</p> : null}
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
      ? "border-orange-100 bg-orange-50/30 text-slate-900"
      : tone === "green"
      ? "border-lime-100 bg-lime-50/30 text-slate-900"
      : tone === "rose"
      ? "border-rose-100 bg-rose-50/30 text-slate-900"
      : tone === "purple"
      ? "border-purple-100 bg-purple-50/30 text-slate-900"
      : "border-sky-100 bg-sky-50/30 text-slate-900";

  const iconToneClass =
    tone === "orange"
      ? "bg-orange-100 text-orange-600"
      : tone === "green"
      ? "bg-lime-100 text-lime-700"
      : tone === "rose"
      ? "bg-rose-100 text-rose-600"
      : tone === "purple"
      ? "bg-purple-100 text-purple-600"
      : "bg-sky-100 text-sky-600";

  return (
    <div className={cn(portalPanelClass, "p-6 transition-all duration-200 hover:scale-[1.01]", toneClass)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
          <p className="mt-1.5 text-xs text-slate-500">{detail}</p>
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
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-500/15 text-lime-600 shadow-sm">
          <Icon className="h-6 w-6 stroke-[2.2]" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-slate-900 font-['Manrope']">{title}</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>
        </div>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </div>
  );
}
