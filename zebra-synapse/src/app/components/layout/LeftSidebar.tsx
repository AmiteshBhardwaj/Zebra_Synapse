import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Calendar,
  MessageSquare,
  UtensilsCrossed,
  ClipboardList,
  BookOpen,
  TrendingUp,
  Dumbbell,
  HeartPulse,
  Video,
  FlaskConical,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Users,
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
    label: "Messages",
    icon: MessageSquare,
    badge: 6,
    altPaths: ["/patient/lab-chat"],
  },
  {
    path: "/patient/diet",
    label: "Healthy Menu",
    icon: UtensilsCrossed,
    altPaths: ["/patient/nutrition"],
  },
  {
    path: "/patient/diet",
    label: "Meal Plan",
    icon: ClipboardList,
    hasSubmenu: true,
  },
  {
    path: "/patient/medical-records",
    label: "Food Diary",
    icon: BookOpen,
  },
  {
    path: "/patient/disease-prediction",
    label: "Progress",
    icon: TrendingUp,
  },
  {
    path: "/patient/exercise",
    label: "Exercises",
    icon: Dumbbell,
  },
  {
    path: "/patient/wellness-tips",
    label: "Health Insights",
    icon: HeartPulse,
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
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    path: "/doctor",
    label: "My Patients",
    icon: Users,
    exact: true,
  },
  {
    path: "/doctor/teleconsult",
    label: "Teleconsultations",
    icon: Video,
    badge: "Live",
  },
  {
    path: "/doctor/settings",
    label: "Settings",
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

  const handleClaimPromo = () => {
    toast.success("🎉 1-Month Free Access Claimed!", {
      description: "Enjoy full AI biomarker insights, custom meal plans, and telehealth access.",
    });
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
          {/* Nutrigo Double Leaf / Organic Bowl Logo */}
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f4f8f1] border border-lime-100 shadow-sm transition-transform group-hover:scale-105">
            <svg
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
            >
              {/* Upper Lime Leaf/Crescent */}
              <path
                d="M6 14C6 9.58172 9.58172 6 14 6H26C26 10.4183 22.4183 14 18 14H6Z"
                fill="#9de438"
              />
              {/* Lower Amber Bowl/Crescent */}
              <path
                d="M6 18C6 18 8 26 16 26C24 26 26 18 26 18H6Z"
                fill="#f59e0b"
              />
            </svg>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold tracking-tight text-slate-900 font-['Manrope']">
                Nutrigo
              </span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 tracking-wider">
              {portalType === "doctor" ? "Doctor Portal" : "Health & Nutrition"}
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

      {/* Bottom Section: Promo Card + Logout */}
      <div className="pt-2 space-y-2 shrink-0">
        {/* Yellow Promotional / Upgrade Card */}
        <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-b from-[#ffea75] via-[#ffd645] to-[#fec730] p-3.5 text-slate-900 shadow-[0_4px_16px_rgba(254,199,48,0.2)] border border-amber-200/50">
          {/* 3D Vegetables Graphic */}
          <div className="flex items-center justify-center pt-0.5 pb-1.5">
            <div className="relative h-16 w-28 flex items-center justify-center">
              <img
                src="/nutrigo_promo_vegetables.jpg"
                alt="Nutrigo fresh vegetables"
                className="h-16 w-auto object-contain drop-shadow-md transition-transform hover:scale-105"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.parentElement?.querySelector(".promo-fallback");
                  if (fallback) fallback.classList.remove("hidden");
                }}
              />
              <div className="promo-fallback hidden flex items-center justify-center text-3xl gap-1">
                <span>🥕</span>
                <span>🥬</span>
              </div>
            </div>
          </div>

          {/* Card Description */}
          <p className="text-[11.5px] font-medium leading-[1.3] text-slate-900 text-left px-0.5">
            Start your health journey with a{" "}
            <span className="font-bold text-slate-950">FREE 1-month</span> access to Nutrigo!
          </p>

          {/* Claim Now Button */}
          <button
            type="button"
            onClick={handleClaimPromo}
            className="mt-2.5 w-full rounded-full bg-[#9de438] hover:bg-[#8ed024] py-2 px-3 text-[11.5px] font-bold text-slate-950 shadow-sm border border-black/5 active:scale-95 transition-all text-center cursor-pointer"
          >
            Claim Now!
          </button>
        </div>

        {/* Logout Button */}
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
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[#f4f8f1] border border-lime-100 shadow-sm">
            <svg
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
            >
              <path
                d="M6 14C6 9.58172 9.58172 6 14 6H26C26 10.4183 22.4183 14 18 14H6Z"
                fill="#9de438"
              />
              <path
                d="M6 18C6 18 8 26 16 26C24 26 26 18 26 18H6Z"
                fill="#f59e0b"
              />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 font-['Manrope']">
            Nutrigo
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
