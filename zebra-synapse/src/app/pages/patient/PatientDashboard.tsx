import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "../../../auth/AuthContext";
import {
  Activity,
  Apple,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  FlaskConical,
  Heart,
  Home,
  LogOut,
  Pill,
  Settings,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export default function PatientDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, profile } = useAuth();

  // Pin state for sidebar (hover expansion is handled via GPU-accelerated CSS)
  const [isPinned, setIsPinned] = useState(false);

  const primaryMenuItems = [
    { path: "/patient", icon: Home, label: "Health Overview" },
    { path: "/patient/medical-records", icon: FileText, label: "Medical Records" },
    { path: "/patient/appointments", icon: Calendar, label: "Appointments" },
    { path: "/patient/vitals", icon: Heart, label: "Vitals" },
    { path: "/patient/prescription", icon: Pill, label: "Prescription" },
    { path: "/patient/disease-prediction", icon: TrendingUp, label: "Disease Prediction" },
    { path: "/patient/nutrition", icon: Apple, label: "Nutrition" },
    { path: "/patient/clinical-trials", icon: FlaskConical, label: "Clinical Trials" },
    { path: "/patient/wellness-tips", icon: Sparkles, label: "Wellness Tips" },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#0b0b0e] text-white lg:flex-row">
      {/* Background Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-12%] h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(245,116,44,0.3)_0%,_rgba(245,116,44,0)_68%)] blur-2xl" />
        <div className="absolute right-[-6%] top-[10%] h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(114,76,255,0.24)_0%,_rgba(114,76,255,0)_72%)] blur-3xl" />
        <div className="absolute bottom-[-20%] left-[28%] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.07)_0%,_rgba(255,255,255,0)_70%)] blur-3xl" />
      </div>

      {/* GPU Composited Instant-Retract Sidebar */}
      <aside
        className={`group/sidebar sticky top-0 z-30 flex shrink-0 flex-col h-screen border-r border-white/10 bg-[#121215] transform-gpu transition-[width] duration-200 ease-out will-change-[width] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
          isPinned ? "lg:w-60" : "lg:w-[52px] lg:hover:w-60"
        }`}
      >
        {/* Supabase Top Brand Logo */}
        <div className="flex h-12 shrink-0 items-center border-b border-white/10 px-2.5">
          <div className="flex items-center gap-2.5 overflow-hidden w-full">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff8a3d] to-[#f05a28] text-white shadow-md">
              <Activity className="h-4 w-4" strokeWidth={2} />
            </div>
            <div
              className={`transition-opacity duration-150 overflow-hidden whitespace-nowrap ${
                isPinned
                  ? "opacity-100"
                  : "opacity-0 delay-0 duration-100 group-hover/sidebar:opacity-100 group-hover/sidebar:delay-75 group-hover/sidebar:duration-150"
              }`}
            >
              <h2 className="text-xs font-semibold tracking-wide text-white leading-none">Zebra Synapse</h2>
              <p className="mt-0.5 text-[9px] uppercase tracking-wider text-white/40">Patient Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {primaryMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                title={item.label}
                className={`w-full h-8 rounded-md flex items-center transition-colors duration-150 ${
                  isActive
                    ? "bg-[#ff8a3d]/20 text-[#ff9c61] border border-[#ff8a3d]/30 font-medium"
                    : "text-white/55 hover:bg-white/[0.06] hover:text-white border border-transparent"
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                  <Icon className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <span
                  className={`text-xs whitespace-nowrap transition-opacity overflow-hidden ${
                    isPinned
                      ? "opacity-100"
                      : "opacity-0 delay-0 duration-100 group-hover/sidebar:opacity-100 group-hover/sidebar:delay-75 group-hover/sidebar:duration-150"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Supabase-style Divider */}
          <div className="my-2 border-t border-white/10" />

          {/* Account Settings */}
          <button
            onClick={() => navigate("/patient/settings")}
            title="Account settings"
            className={`w-full h-8 rounded-md flex items-center transition-colors duration-150 ${
              location.pathname === "/patient/settings"
                ? "bg-[#ff8a3d]/20 text-[#ff9c61] border border-[#ff8a3d]/30 font-medium"
                : "text-white/55 hover:bg-white/[0.06] hover:text-white border border-transparent"
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center">
              <Settings className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <span
              className={`text-xs whitespace-nowrap transition-opacity overflow-hidden ${
                isPinned
                  ? "opacity-100"
                  : "opacity-0 delay-0 duration-100 group-hover/sidebar:opacity-100 group-hover/sidebar:delay-75 group-hover/sidebar:duration-150"
              }`}
            >
              Account settings
            </span>
          </button>
        </nav>

        {/* Supabase Bottom Toolbar */}
        <div className="border-t border-white/10 p-2 flex flex-col gap-1 shrink-0">
          <button
            onClick={handleLogout}
            title="Logout"
            className="w-full h-8 rounded-md flex items-center transition-colors duration-150 text-white/55 hover:bg-white/[0.06] hover:text-white border border-transparent"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center">
              <LogOut className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <span
              className={`text-xs whitespace-nowrap transition-opacity overflow-hidden ${
                isPinned
                  ? "opacity-100"
                  : "opacity-0 delay-0 duration-100 group-hover/sidebar:opacity-100 group-hover/sidebar:delay-75 group-hover/sidebar:duration-150"
              }`}
            >
              Logout
            </span>
          </button>

          {/* Pin Toggle Button */}
          <button
            onClick={() => setIsPinned(!isPinned)}
            title={isPinned ? "Collapse sidebar" : "Expand & pin sidebar"}
            className="hidden lg:flex w-full h-8 rounded-md items-center transition-colors duration-150 text-white/40 hover:bg-white/[0.06] hover:text-white border border-transparent"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center">
              {isPinned ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </span>
            <span
              className={`text-xs whitespace-nowrap transition-opacity overflow-hidden ${
                isPinned
                  ? "opacity-100"
                  : "opacity-0 delay-0 duration-100 group-hover/sidebar:opacity-100 group-hover/sidebar:delay-75 group-hover/sidebar:duration-150"
              }`}
            >
              {isPinned ? "Collapse" : "Expand"}
            </span>
          </button>
        </div>
      </aside>

      {/* Main Page Content */}
      <main className="relative z-10 min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
