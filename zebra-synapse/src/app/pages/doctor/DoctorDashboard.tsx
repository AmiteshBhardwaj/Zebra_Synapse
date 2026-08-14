import { useRef, useLayoutEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { useAuth } from "../../../auth/AuthContext";
import { Activity, Users, LogOut, Settings, Stethoscope, Video } from "lucide-react";

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const mainRef = useRef<HTMLDivElement>(null);

  // Reset scroll to top whenever route/page changes or on initial login mount
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

  return (
    <div className="flex h-screen w-screen bg-[#090b10] text-white lg:flex-row overflow-hidden font-sans">
      {/* GPU Composited Instant-Retract Sidebar */}
      <aside
        className="group/sidebar sticky top-0 z-30 flex shrink-0 flex-col h-screen border-r border-slate-800/90 bg-[#0e1017] transform-gpu transition-[width] duration-200 ease-out will-change-[width] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:w-[52px] lg:hover:w-60 shadow-2xl"
      >
        {/* Supabase Top Brand Logo */}
        <div className="flex h-12 shrink-0 items-center border-b border-slate-800/90 px-2.5">
          <div className="flex items-center gap-2.5 overflow-hidden w-full cursor-pointer" onClick={() => navigate("/")}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ff9c61]/15 border border-[#ff9c61]/30 text-[#ff9c61]">
              <Activity className="h-4 w-4" strokeWidth={2} />
            </div>
            <div className="transition-opacity duration-150 overflow-hidden whitespace-nowrap opacity-0 delay-0 duration-100 group-hover/sidebar:opacity-100 group-hover/sidebar:delay-75 group-hover/sidebar:duration-150">
              <h2 className="text-xs font-semibold tracking-wide text-white leading-none">Zebra Synapse</h2>
              <p className="mt-0.5 text-[9px] uppercase tracking-wider text-white/40">Doctor Portal</p>
            </div>
          </div>
        </div>

        {/* Doctor Profile Banner */}
        <div
          className="border-b border-slate-800/90 transition-all duration-200 overflow-hidden max-h-0 p-0 opacity-0 border-0 group-hover/sidebar:max-h-24 group-hover/sidebar:p-2 group-hover/sidebar:opacity-100 group-hover/sidebar:border-b group-hover/sidebar:border-slate-800/90"
        >
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#141824] p-1.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-800/50">
              <Stethoscope className="w-3.5 h-3.5 text-[#ff9c61]" strokeWidth={1.5} />
            </div>
            <div className="transition-opacity duration-150 overflow-hidden whitespace-nowrap">
              <p className="text-xs font-semibold text-white truncate max-w-[9rem]">
                {profile?.full_name ?? "Doctor"}
              </p>
              <p className="text-[10px] text-white/50 truncate max-w-[9rem]">
                {profile?.license_number ? `Lic. ${profile.license_number}` : "Physician"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => navigate("/doctor")}
            title="My Patients"
            className={`w-full h-8 rounded-md flex items-center transition-colors duration-150 ${
              location.pathname === "/doctor"
                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm font-medium"
                : "text-white/55 hover:bg-slate-800/60 hover:text-white border border-transparent"
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center">
              <Users className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <span className="text-xs whitespace-nowrap transition-opacity overflow-hidden opacity-0 delay-0 duration-100 group-hover/sidebar:opacity-100 group-hover/sidebar:delay-75 group-hover/sidebar:duration-150">
              My Patients
            </span>
          </button>

          <button
            onClick={() => navigate("/doctor/teleconsult")}
            title="Teleconsultations"
            className={`w-full h-8 rounded-md flex items-center transition-colors duration-150 ${
              location.pathname === "/doctor/teleconsult"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 font-medium"
                : "text-white/55 hover:bg-slate-800/60 hover:text-white border border-transparent"
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center">
              <Video className="h-4 w-4 text-cyan-400" strokeWidth={1.8} />
            </span>
            <span className="text-xs whitespace-nowrap transition-opacity overflow-hidden opacity-0 delay-0 duration-100 group-hover/sidebar:opacity-100 group-hover/sidebar:delay-75 group-hover/sidebar:duration-150">
              Teleconsultations
            </span>
          </button>

          <button
            onClick={() => navigate("/doctor/settings")}
            title="Account settings"
            className={`w-full h-8 rounded-md flex items-center transition-colors duration-150 ${
              location.pathname === "/doctor/settings"
                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 font-medium"
                : "text-white/55 hover:bg-slate-800/60 hover:text-white border border-transparent"
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center">
              <Settings className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <span className="text-xs whitespace-nowrap transition-opacity overflow-hidden opacity-0 delay-0 duration-100 group-hover/sidebar:opacity-100 group-hover/sidebar:delay-75 group-hover/sidebar:duration-150">
              Account settings
            </span>
          </button>
        </nav>

        {/* Supabase Bottom Toolbar */}
        <div className="border-t border-slate-800/90 p-2 flex flex-col gap-1 shrink-0">
          <button
            onClick={handleLogout}
            title="Logout"
            className="w-full h-8 rounded-md flex items-center transition-colors duration-150 text-white/55 hover:bg-slate-800/60 hover:text-white border border-transparent"
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

      <main ref={mainRef} className="min-w-0 flex-1 h-screen overflow-y-auto bg-[#090b10]">
        <Outlet />
      </main>
    </div>
  );
}
