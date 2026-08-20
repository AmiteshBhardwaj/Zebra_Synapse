import { useRef, useLayoutEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "../../../auth/AuthContext";
import {
  Activity,
  Apple,
  Bot,
  Calendar,
  Dumbbell,
  FileText,
  FlaskConical,
  Flame,
  Home,
  LogOut,
  MessageSquare,
  Pill,
  Settings,
  Sparkles,
  TrendingUp,
  Utensils,
  UtensilsCrossed,
  Video,
} from "lucide-react";

export default function PatientDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const mainRef = useRef<HTMLDivElement>(null);

  // Reset scroll to top whenever route/page changes or on initial login mount
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  const primaryMenuItems = [
    { path: "/patient", icon: Home, label: "Health Overview" },
    { path: "/patient/medical-records", icon: FileText, label: "Medical Records" },
    { path: "/patient/ai-chat", icon: Bot, label: "AI Lab Assistant" },
    { path: "/patient/appointments", icon: Calendar, label: "Appointments" },
    { path: "/patient/teleconsult", icon: Video, label: "Teleconsultation", altPaths: ["/patient/messages", "/patient/chat"] },
    { path: "/patient/prescription", icon: Pill, label: "Prescription" },
    { path: "/patient/disease-prediction", icon: TrendingUp, label: "Disease Prediction" },
    { path: "/patient/diet-fitness", icon: UtensilsCrossed, label: "Diet & Fitness", altPaths: ["/patient/lifestyle", "/patient/diet", "/patient/nutrition", "/patient/exercise", "/patient/workout", "/patient/diet-chat"] },
    { path: "/patient/clinical-trials", icon: FlaskConical, label: "Clinical Trials" },
    { path: "/patient/wellness-tips", icon: Sparkles, label: "Wellness Tips" },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="relative flex h-screen w-screen bg-[#f6f8f5] text-slate-900 font-sans selection:bg-lime-500/20 selection:text-lime-900 lg:flex-row overflow-hidden">
      {/* GPU Composited Rich Blue Sidebar */}
      <aside
        className="group/sidebar sticky top-0 z-30 flex shrink-0 flex-col h-screen border-r border-blue-900/50 bg-gradient-to-b from-[#03102d] via-[#082260] to-[#0047cc] transform-gpu transition-[width] duration-200 ease-out will-change-[width] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden shadow-[5px_0_30px_rgba(3,16,45,0.7)] lg:w-[54px] lg:hover:w-60"
      >
        {/* Brand Header */}
        <div className="flex h-14 shrink-0 items-center border-b border-blue-800/40 px-2.5">
          <div className="flex items-center gap-2.5 overflow-hidden w-full cursor-pointer" onClick={() => navigate("/")}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 via-blue-600 to-indigo-700 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              <Activity className="h-4 w-4 stroke-[2.5]" />
            </div>
            <div className="transition-opacity duration-150 overflow-hidden whitespace-nowrap opacity-0 delay-0 duration-100 group-hover/sidebar:opacity-100 group-hover/sidebar:delay-75 group-hover/sidebar:duration-150">
              <h2 className="text-xs font-mono font-bold tracking-wider text-white leading-none">Zebra Synapse</h2>
              <p className="mt-0.5 text-[9px] font-mono uppercase tracking-widest text-blue-200/90">Patient Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {primaryMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.altPaths && item.altPaths.includes(location.pathname));

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                title={item.label}
                className={`w-full h-9 rounded-xl flex items-center transition-all duration-200 ${
                  isActive
                    ? "bg-white/20 text-white border border-white/35 shadow-[0_0_14px_rgba(255,255,255,0.25)] font-bold backdrop-blur-xs"
                    : "text-blue-100/75 hover:bg-white/12 hover:text-white border border-transparent"
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center">
                  <Icon className="h-4 w-4" strokeWidth={isActive ? 2.2 : 1.8} />
                </span>
                <span className="text-xs whitespace-nowrap transition-opacity overflow-hidden opacity-0 delay-0 duration-100 group-hover/sidebar:opacity-100 group-hover/sidebar:delay-75 group-hover/sidebar:duration-150">
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Divider */}
          <div className="my-2 border-t border-blue-800/40" />

          {/* Account Settings */}
          <button
            onClick={() => navigate("/patient/settings")}
            title="Account settings"
            className={`w-full h-9 rounded-xl flex items-center transition-all duration-200 ${
              location.pathname === "/patient/settings"
                ? "bg-white/20 text-white border border-white/35 shadow-[0_0_14px_rgba(255,255,255,0.25)] font-bold backdrop-blur-xs"
                : "text-blue-100/75 hover:bg-white/12 hover:text-white border border-transparent"
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center">
              <Settings className="h-4 w-4" strokeWidth={location.pathname === "/patient/settings" ? 2.2 : 1.8} />
            </span>
            <span className="text-xs whitespace-nowrap transition-opacity overflow-hidden opacity-0 delay-0 duration-100 group-hover/sidebar:opacity-100 group-hover/sidebar:delay-75 group-hover/sidebar:duration-150">
              Account settings
            </span>
          </button>
        </nav>

        {/* Bottom Toolbar */}
        <div className="border-t border-blue-800/40 p-2 flex flex-col gap-1 shrink-0">
          <button
            onClick={handleLogout}
            title="Logout"
            className="w-full h-9 rounded-xl flex items-center transition-colors duration-150 text-blue-100/75 hover:bg-rose-500/25 hover:text-white hover:border-rose-400/40 border border-transparent"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center">
              <LogOut className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <span className="text-xs whitespace-nowrap transition-opacity overflow-hidden opacity-0 delay-0 duration-100 group-hover/sidebar:opacity-100 group-hover/sidebar:delay-75 group-hover/sidebar:duration-150">
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* Main Page Content */}
      <main ref={mainRef} className="relative z-10 min-w-0 flex-1 h-screen overflow-y-auto bg-[#f6f8f5]">
        <Outlet />
      </main>
    </div>
  );
}
