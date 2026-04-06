import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "../ui/badge";
import { cn } from "../ui/utils";

export const portalShellClass =
  "min-h-full overflow-x-clip bg-[radial-gradient(circle_at_top_left,_rgba(255,106,0,0.14),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(108,91,212,0.16),_transparent_28%),linear-gradient(180deg,#121212_0%,#0d0d0d_100%)] px-4 py-5 text-white sm:px-5 sm:py-6 lg:px-8 lg:py-8 xl:px-10";

export const portalContentClass = "mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6 lg:gap-8";

export const portalPanelClass =
  "rounded-[1.5rem] border border-white/8 bg-[rgba(255,255,255,0.03)] text-white shadow-[0_22px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#ff6a00]/30 hover:shadow-[0_28px_80px_rgba(255,106,0,0.12)]";

export const portalMutedPanelClass =
  "rounded-[1.25rem] border border-white/7 bg-[#1a1a1a]/80 backdrop-blur-md";

export const portalInsetClass =
  "rounded-[1.15rem] border border-white/6 bg-[#111111]/80 backdrop-blur-sm";

export const portalPrimaryButtonClass =
  "border-0 bg-gradient-to-r from-[#FF6A00] to-[#FF8C42] text-white shadow-[0_14px_34px_rgba(255,106,0,0.32)] hover:from-[#ff7b1f] hover:to-[#ff9b58] hover:shadow-[0_18px_44px_rgba(255,106,0,0.4)]";

export const portalSecondaryButtonClass =
  "border-white/12 bg-white/[0.03] text-white hover:border-white/20 hover:bg-white/[0.08] hover:text-white";

export const portalDangerButtonClass =
  "border-[#FF4D4D]/30 bg-[#FF4D4D]/12 text-[#ffd1d1] hover:border-[#FF4D4D]/50 hover:bg-[#FF4D4D]/18 hover:text-white";

export const portalInputClass =
  "h-11 rounded-xl border border-white/10 bg-[#1F1F1F] px-4 text-white placeholder:text-[#6B7280] focus-visible:border-[#FF6A00] focus-visible:ring-[3px] focus-visible:ring-[#FF6A00]/20";

export const portalSelectTriggerClass =
  "h-11 rounded-xl border-white/10 bg-[#1F1F1F] text-white data-[placeholder]:text-[#6B7280] focus-visible:border-[#FF6A00] focus-visible:ring-[#FF6A00]/20";

export const portalSelectContentClass =
  "border-white/10 bg-[#171717] text-white shadow-[0_18px_48px_rgba(0,0,0,0.5)]";

export const portalSelectItemClass =
  "rounded-lg text-white focus:bg-white/[0.08] focus:text-white";

export const portalDialogClass =
  "border-white/10 bg-[#171717]/95 text-white shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl";

export const portalTableWrapClass =
  "overflow-hidden rounded-[1.2rem] border border-white/8 bg-[#121212]/90";

export const portalTableClass = "text-sm text-[#E5E7EB]";

export const portalTableHeadClass =
  "h-12 border-b border-white/8 bg-white/[0.04] px-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#A1A1AA]";

export const portalTableCellClass = "px-4 py-4 align-top text-[#E5E7EB]";

export function portalTableRowClass(index: number) {
  return cn(
    "border-white/6 transition-colors hover:bg-white/[0.05]",
    index % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent",
  );
}

export function statusPillClass(status: string) {
  switch (status.toLowerCase()) {
    case "confirmed":
    case "normal":
      return "border-emerald-500/25 bg-emerald-500/12 text-emerald-200";
    case "completed":
      return "border-white/12 bg-white/[0.06] text-[#d4d4d8]";
    case "high":
      return "border-[#FF4D4D]/25 bg-[#FF4D4D]/12 text-[#ffd1d1]";
    case "low":
      return "border-blue-500/25 bg-blue-500/12 text-blue-200";
    case "borderline":
    case "moderate":
      return "border-[#FFC857]/25 bg-[#FFC857]/12 text-[#ffe6a3]";
    default:
      return "border-white/12 bg-white/[0.06] text-[#d4d4d8]";
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
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#141414]/95 px-5 py-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:px-6 lg:px-8 lg:py-7">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-0 h-44 w-44 rounded-full bg-[radial-gradient(circle,_rgba(255,106,0,0.24)_0%,_rgba(255,106,0,0)_72%)] blur-2xl" />
        <div className="absolute right-0 top-3 h-56 w-56 rounded-full bg-[radial-gradient(circle,_rgba(108,91,212,0.18)_0%,_rgba(108,91,212,0)_72%)] blur-3xl" />
      </div>
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-[#FF6A00]/25 bg-[#FF6A00]/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ffb07a]">
              {eyebrow}
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <Icon className="h-5 w-5 text-[#ff9c61]" />
            </span>
          </div>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#A1A1AA] md:text-base">
            {description}
          </p>
          {meta?.length ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {meta.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">{item.label}</p>
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
          <Icon className="h-6 w-6 text-[#ff9c61]" strokeWidth={1.7} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="max-w-2xl text-sm leading-7 text-[#A1A1AA]">{description}</p>
        </div>
        {action ? <div>{action}</div> : null}
      </div>
    </div>
  );
}
