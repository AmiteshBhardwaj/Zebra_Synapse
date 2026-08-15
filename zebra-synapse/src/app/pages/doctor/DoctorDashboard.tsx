import { useRef, useLayoutEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { useAuth } from "../../../auth/AuthContext";
import {
  LayoutGrid,
  Calendar as CalendarIcon,
  Video,
  Settings,
  LogOut,
  Search,
  Bell,
  MessageSquare,
  Stethoscope,
  ChevronDown,
  Sparkles,
} from "lucide-react";

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const mainRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Reset scroll to top whenever route/page changes
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const navItems = [
    {
      id: "overview",
      label: "Dashboard",
      icon: LayoutGrid,
      path: "/doctor",
      active: location.pathname === "/doctor" || location.pathname.startsWith("/doctor/patient"),
    },
    {
      id: "teleconsult",
      label: "Teleconsultations",
      icon: Video,
      path: "/doctor/teleconsult",
      active: location.pathname === "/doctor/teleconsult",
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      path: "/doctor/settings",
      active: location.pathname === "/doctor/settings",
    },
  ];

  const doctorName = profile?.full_name || "Doctor";
  const doctorInitial = doctorName.replace(/^Dr\.?\s*/i, "").charAt(0).toUpperCase() || "D";

  return (
    <div className="flex h-screen w-screen bg-[#E5ECF9] font-poppins text-[#111111] overflow-hidden p-2.5 md:p-3.5 gap-2.5 md:gap-3.5">
      {/* Curved Deep Indigo Sidebar matching mockup - Auto Expands on Cursor Hover & Retracts */}
      <aside className="group/sidebar w-[68px] md:w-[72px] hover:w-60 md:hover:w-64 shrink-0 bg-[#3E36B0] rounded-[24px] flex flex-col py-5 justify-between shadow-xl shadow-[#3E36B0]/20 z-20 select-none transform-gpu transition-[width] duration-300 ease-out will-change-[width] overflow-hidden">
        {/* Top Logo / Brand mark */}
        <div className="flex flex-col gap-6 w-full">
          <div
            onClick={() => navigate("/doctor")}
            className="flex items-center px-3 md:px-3.5 w-full cursor-pointer overflow-hidden"
            title="Zebra Synapse Doctor Portal"
          >
            <div className="w-11 h-11 shrink-0 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all transform active:scale-95 shadow-sm">
              <Sparkles className="w-5 h-5 text-[#A8DEF7]" />
            </div>
            <div className="ml-3 transition-opacity duration-150 overflow-hidden whitespace-nowrap opacity-0 delay-0 group-hover/sidebar:opacity-100 group-hover/sidebar:delay-75 group-hover/sidebar:duration-150">
              <h2 className="text-sm font-bold tracking-tight text-white leading-tight font-['Manrope',sans-serif]">
                Zebra Synapse
              </h2>
              <p className="text-[10px] font-semibold text-[#A8DEF7]/90 tracking-wider uppercase">
                Doctor Portal
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-2.5 w-full px-2.5 md:px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  title={item.label}
                  className={`w-full h-11 rounded-2xl flex items-center transition-all duration-200 group/nav overflow-hidden ${
                    item.active
                      ? "bg-white text-[#3E36B0] shadow-md shadow-black/10 font-bold"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <span className="w-11 h-11 shrink-0 flex items-center justify-center">
                    <Icon className="w-5 h-5" strokeWidth={item.active ? 2.5 : 2} />
                  </span>
                  <span
                    className={`text-xs font-semibold whitespace-nowrap transition-opacity overflow-hidden opacity-0 delay-0 duration-100 group-hover/sidebar:opacity-100 group-hover/sidebar:delay-75 group-hover/sidebar:duration-150 pr-3 ${
                      item.active ? "text-[#3E36B0]" : "text-white"
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions (Logout) */}
        <div className="flex flex-col gap-2.5 w-full px-2.5 md:px-3">
          <button
            onClick={handleLogout}
            title="Logout"
            className="w-full h-11 rounded-2xl flex items-center text-white/70 hover:text-white hover:bg-white/10 transition-all group/nav overflow-hidden"
          >
            <span className="w-11 h-11 shrink-0 flex items-center justify-center">
              <LogOut className="w-5 h-5" strokeWidth={2} />
            </span>
            <span className="text-xs font-semibold whitespace-nowrap transition-opacity overflow-hidden opacity-0 delay-0 duration-100 group-hover/sidebar:opacity-100 group-hover/sidebar:delay-75 group-hover/sidebar:duration-150 pr-3 text-white">
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area in Crisp Rounded White Canvas */}
      <div className="flex-1 min-w-0 bg-[#F4F6FC] rounded-[24px] flex flex-col overflow-hidden shadow-2xl border border-white/60">
        {/* Top Header Bar */}
        <header className="h-16 shrink-0 px-6 flex items-center justify-between border-b border-[#E8EEF8] bg-white/80 backdrop-blur-md z-10">
          {/* Universal Search Input */}
          <div className="relative w-72 md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients, vitals, reports..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                // Dispatch custom search event for active subviews if needed
                window.dispatchEvent(new CustomEvent("doc-search", { detail: e.target.value }));
              }}
              className="w-full h-10 pl-10 pr-4 rounded-full bg-[#F4F6FC] border border-transparent focus:border-[#3E36B0]/30 focus:bg-white text-xs md:text-sm text-[#111111] placeholder:text-slate-400 focus:outline-none transition-all"
            />
          </div>

          {/* Right Header Controls (Chat, Bell, Doctor Pill) */}
          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={() => navigate("/doctor/teleconsult")}
              className="w-9 h-9 rounded-full bg-[#F4F6FC] hover:bg-[#E8EEF8] flex items-center justify-center text-slate-600 hover:text-[#3E36B0] transition-colors relative"
              title="Teleconsultations"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            <button
              className="w-9 h-9 rounded-full bg-[#F4F6FC] hover:bg-[#E8EEF8] flex items-center justify-center text-slate-600 hover:text-[#3E36B0] transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#F62088] ring-2 ring-white" />
            </button>

            {/* Doctor Profile Badge matching mockup */}
            <div
              onClick={() => navigate("/doctor/settings")}
              className="flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-full bg-[#F4F6FC] hover:bg-[#E8EEF8] border border-slate-200/60 cursor-pointer transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#3E36B0] to-[#8075FF] text-white flex items-center justify-center text-xs font-semibold shadow-inner">
                {doctorInitial}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-[#111111] leading-tight">
                  {profile?.full_name ? (profile.full_name.startsWith("Dr.") ? profile.full_name : `Dr. ${profile.full_name}`) : "Dr. Kim"}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">Physician</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </div>
          </div>
        </header>

        {/* Scrollable View Container */}
        <main ref={mainRef} className="flex-1 overflow-y-auto bg-[#F4F6FC] p-4 md:p-6 [scrollbar-width:thin]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

