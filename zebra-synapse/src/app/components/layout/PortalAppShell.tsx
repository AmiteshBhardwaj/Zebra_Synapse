import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Activity, ArrowUpRight, LogOut, Menu, type LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";

type NavItem = {
  path: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  exact?: boolean;
};

type PortalAppShellProps = {
  portalLabel: string;
  workspaceTitle: string;
  workspaceDescription: string;
  profileName?: string | null;
  profileMeta?: string | null;
  navItems: NavItem[];
  onSignOut: () => void | Promise<void>;
  children: ReactNode;
};

function isNavItemActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.path;
  if (item.path === "/patient" || item.path === "/doctor") return pathname === item.path;
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

function NavList({
  items,
  pathname,
  onNavigate,
  compact = false,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate: (path: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", compact && "space-y-2")}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = isNavItemActive(pathname, item);

        return (
          <button
            key={item.path}
            type="button"
            onClick={() => onNavigate(item.path)}
            className={cn(
              "group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all duration-200",
              active
                ? "border-[#ff8a4c]/30 bg-[linear-gradient(135deg,rgba(255,122,51,0.18),rgba(96,212,255,0.08))] text-white shadow-[0_16px_36px_rgba(10,18,32,0.32)]"
                : "border-transparent text-[#94a8c5] hover:border-white/8 hover:bg-white/[0.035] hover:text-white",
            )}
          >
            <span
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors",
                active
                  ? "border-white/10 bg-white/10 text-white"
                  : "border-white/8 bg-white/[0.03] text-[#7fdcff] group-hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{compact ? (item.shortLabel ?? item.label) : item.label}</p>
            </div>
            {active ? <ArrowUpRight className="h-4 w-4 text-[#ffd0a8]" strokeWidth={1.8} /> : null}
          </button>
        );
      })}
    </div>
  );
}

export default function PortalAppShell({
  portalLabel,
  workspaceTitle,
  workspaceDescription,
  profileName,
  profileMeta,
  navItems,
  onSignOut,
  children,
}: PortalAppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const isExpanded = isPinned || isHovered;

  const currentItem = useMemo(
    () => navItems.find((item) => isNavItemActive(location.pathname, item)) ?? navItems[0],
    [location.pathname, navItems],
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="clinical-grid absolute inset-0 opacity-[0.045]" />
        <div className="absolute left-[-10%] top-[-8%] h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(255,122,51,0.22),_rgba(255,122,51,0)_70%)] blur-3xl" />
        <div className="absolute right-[-8%] top-[10%] h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(96,212,255,0.18),_rgba(96,212,255,0)_72%)] blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        <aside
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={cn(
            "group hidden shrink-0 border-r border-white/8 bg-[rgba(7,14,25,0.85)] px-4 py-5 backdrop-blur-2xl transition-all duration-300 ease-in-out lg:flex lg:flex-col",
            isExpanded ? "w-[280px]" : "w-[72px]"
          )}
        >
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ff7a33,#56d9ff)] shadow-[0_18px_36px_rgba(10,18,32,0.4)]">
                <Activity className="h-5 w-5 text-white" strokeWidth={1.9} />
              </div>
              <div className={cn("transition-all duration-300 overflow-hidden whitespace-nowrap", isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 hidden")}>
                <p className="text-[10px] uppercase tracking-[0.34em] text-[#7fdcff]">{portalLabel}</p>
                <h2 className="text-base font-semibold text-white">Zebra Synapse</h2>
              </div>
            </div>

            {isExpanded && (
              <div className="mt-4 rounded-[20px] border border-white/8 bg-[#0f1828]/80 p-3">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/38">Workspace</p>
                <p className="mt-1.5 text-sm font-semibold text-white">{workspaceTitle}</p>
                <p className="mt-1 text-xs leading-5 text-[#92a8c7]">{workspaceDescription}</p>
              </div>
            )}
          </div>

          <div className="mt-5 flex-1 overflow-y-auto pr-1">
            <NavList items={navItems} pathname={location.pathname} onNavigate={navigate} compact={!isExpanded} />
          </div>

          <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-3">
            {isExpanded && (
              <>
                <p className="text-xs font-semibold text-white truncate">{profileName ?? "Workspace user"}</p>
                {profileMeta ? <p className="mt-0.5 text-xs text-[#92a8c7] truncate">{profileMeta}</p> : null}
              </>
            )}
            <Button
              variant="outline"
              className={cn(
                "h-10 border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:text-white transition-all",
                isExpanded ? "w-full justify-start rounded-xl mt-3 px-3" : "w-10 h-10 justify-center rounded-xl p-0 mx-auto"
              )}
              onClick={onSignOut}
              title={!isExpanded ? "Logout" : undefined}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {isExpanded && <span className="ml-2 text-xs">Logout</span>}
            </Button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-white/8 bg-[rgba(8,15,27,0.7)] backdrop-blur-2xl">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 rounded-2xl border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:text-white lg:hidden"
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="left"
                    className="border-white/10 bg-[#09111f]/95 p-0 text-white backdrop-blur-2xl"
                  >
                    <SheetHeader className="border-b border-white/8 px-5 py-5 text-left">
                      <SheetTitle className="text-white">Zebra Synapse</SheetTitle>
                      <SheetDescription className="text-[#92a8c7]">{portalLabel}</SheetDescription>
                    </SheetHeader>
                    <div className="space-y-6 p-5">
                      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-[#7fdcff]">{portalLabel}</p>
                        <p className="mt-3 text-lg font-semibold text-white">{workspaceTitle}</p>
                        <p className="mt-2 text-sm leading-6 text-[#92a8c7]">{workspaceDescription}</p>
                      </div>
                      <NavList items={navItems} pathname={location.pathname} onNavigate={navigate} compact />
                      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-sm font-semibold text-white">{profileName ?? "Workspace user"}</p>
                        {profileMeta ? <p className="mt-1 text-sm text-[#92a8c7]">{profileMeta}</p> : null}
                        <Button
                          variant="outline"
                          className="mt-4 h-11 w-full justify-start rounded-2xl border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:text-white"
                          onClick={onSignOut}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Logout
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>

                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.34em] text-[#7fdcff]">{portalLabel}</p>
                  <div className="flex items-center gap-2">
                    <h1 className="truncate text-lg font-semibold text-white">{currentItem?.label ?? workspaceTitle}</h1>
                    <span className="hidden rounded-full border border-[#60d4ff]/20 bg-[#60d4ff]/10 px-2.5 py-1 text-[11px] font-medium text-[#9be8ff] sm:inline-flex">
                      Live workspace
                    </span>
                  </div>
                </div>
              </div>

              <div className="hidden items-center gap-3 sm:flex">
                {profileMeta ? <p className="text-sm text-[#92a8c7]">{profileMeta}</p> : null}
                <div className="flex h-11 min-w-0 items-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white">
                  {profileName ?? "Workspace user"}
                </div>
              </div>
            </div>
          </header>

          <main className="relative z-10">
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
