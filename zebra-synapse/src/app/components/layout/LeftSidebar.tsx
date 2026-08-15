import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Home,
  Calendar,
  MessageSquare,
  Bot,
  UtensilsCrossed,
  ClipboardList,
  BookOpen,
  TrendingUp,
  Video,
  FlaskConical,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Users,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../../../auth/AuthContext";
import { toast } from "sonner";

export type SidebarNavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
  hasSubmenu?: boolean;
  altPaths?: string[];
  exact?: boolean;
};

export const PATIENT_SIDEBAR_ITEMS: SidebarNavItem[] = [
  {
    path: "/patient",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    path: "/patient/appointments",
    label: "Calendar",
    icon: Calendar,
  },
  {
    path: "/patient/ai-chat",
    label: "AI Lab Assistant",
    icon: Bot,
    altPaths: ["/patient/lab-chat"],
  },
  {
    path: "/patient/diet",
    label: "Meal Plan",
    icon: ClipboardList,
    hasSubmenu: true,
    altPaths: ["/patient/nutrition", "/patient/diet-chat", "/patient/dietitian"],
  },
  {
    path: "/patient/teleconsult",
    label: "Teleconsult",
    icon: Video,
  },
  {
    path: "/patient/clinical-trials",
    label: "Clinical Trials",
    icon: FlaskConical,
  },
  {
    path: "/patient/settings",
    label: "Settings",
    icon: Settings,
  },
];

export const DOCTOR_SIDEBAR_ITEMS: SidebarNavItem[] = [
  {
    path: "/doctor",
    label: "Home",
    icon: Home,
    exact: true,
  },
  {
    path: "/doctor/patients",
    label: "Patients",
    icon: Users,
    altPaths: ["/doctor/patient"],
  },
  {
    path: "/doctor/teleconsult",
    label: "Teleconsultations",
    icon: Video,
    badge: "Live",
  },
  {
    path: "/doctor/settings",
    label: "Account Settings",
    icon: Settings,
  },
];

type LeftSidebarProps = {
  portalType?: "patient" | "doctor";
  customItems?: SidebarNavItem[];
};

export default function LeftSidebar({
  portalType = "patient",
  customItems,
}: LeftSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items =
    customItems ||
    (portalType === "doctor" ? DOCTOR_SIDEBAR_ITEMS : PATIENT_SIDEBAR_ITEMS);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Successfully logged out");
      navigate("/");
    } catch {
      navigate("/");
    }
  };

  const isItemActive = (item: SidebarNavItem) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    if (item.altPaths && item.altPaths.includes(location.pathname)) {
      return true;
    }
    if (location.pathname === item.path) {
      return true;
    }
    if (item.path !== "/patient" && item.path !== "/doctor" && location.pathname.startsWith(`${item.path}/`)) {
      return true;
    }
    return false;
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-4 sm:p-5 select-none">
      {/* Top Brand / Logo */}
      <div className="flex items-center justify-between pb-4 pt-1 px-1">
        <div
          onClick={() => {
            navigate(portalType === "doctor" ? "/doctor" : "/patient");
            setMobileOpen(false);
          }}
          className="flex items-center gap-3 cursor-pointer group"
        >
          {/* Zebra Synapse Logo */}
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-lime-400 border border-slate-700/40 shadow-sm transition-transform group-hover:scale-105">
            <Activity className="h-5 w-5 stroke-[2.3]" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold tracking-tight text-slate-900 font-['Manrope']">
                Zebra Synapse
              </span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 tracking-wider">
              {portalType === "doctor" ? "Doctor Portal" : "Clinical Nutrition & Diet"}
            </span>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto space-y-1 py-1.5 pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item, idx) => {
          const Icon = item.icon;
          const active = isItemActive(item);

          return (
            <button
              key={`${item.path}_${item.label}_${idx}`}
              type="button"
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              className={`group flex w-full items-center gap-3.5 px-3.5 py-2.5 rounded-[16px] text-sm font-semibold transition-all duration-150 ${
                active
                  ? "bg-[#9de438] text-slate-900 shadow-sm shadow-lime-500/20 font-bold"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center transition-colors ${
                  active ? "text-slate-900" : "text-slate-400 group-hover:text-slate-700"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.3 : 1.9} />
              </span>

              <span className="truncate text-[13px] font-medium leading-none">
                {item.label}
              </span>

              {/* Notification Pill Badge */}
              {item.badge !== undefined && (
                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#ff7a29] px-1.5 text-[11px] font-bold text-white shadow-sm shadow-orange-500/20">
                  {item.badge}
                </span>
              )}

              {/* Submenu Indicator Chevron */}
              {item.hasSubmenu && !item.badge && (
                <ChevronDown
                  className={`ml-auto h-4 w-4 transition-transform ${
                    active ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"
                  }`}
                  strokeWidth={2}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Section: Logout */}
      <div className="pt-2 shrink-0">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-[14px] px-3.5 py-2 text-[13px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
        >
          <LogOut className="h-4 w-4 stroke-[2]" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Header with Hamburger */}
      <div className="lg:hidden sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md">
        <div
          onClick={() => navigate(portalType === "doctor" ? "/doctor" : "/patient")}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-lime-400 border border-slate-700/40 shadow-sm">
            <Activity className="h-4 w-4 stroke-[2.3]" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 font-['Manrope']">
            Zebra Synapse
          </span>
        </div>

        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile Backdrop & Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-50 w-72 max-w-[85vw] bg-white h-full shadow-2xl overflow-y-auto">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop Persistent Leftbar */}
      <aside className="hidden lg:flex shrink-0 sticky top-0 h-screen w-[240px] xl:w-[250px] flex-col bg-white border-r border-slate-100/90 shadow-[2px_0_16px_rgba(0,0,0,0.015)] z-30">
        {sidebarContent}
      </aside>
    </>
  );
}
