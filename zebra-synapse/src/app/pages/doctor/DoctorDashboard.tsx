import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { useAuth } from "../../../auth/AuthContext";
import { Activity, Users, LogOut, Settings, Stethoscope } from "lucide-react";

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, profile } = useAuth();

  // Pin state for sidebar (hover expansion is handled via GPU-accelerated CSS)
  const [isPinned, setIsPinned] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_10%_20%,_rgba(26,26,46,0.96),_rgba(10,10,15,0.98)_60%),radial-gradient(circle_at_top_right,_rgba(255,106,0,0.14),_transparent_26%),radial-gradient(circle_at_top_left,_rgba(108,91,212,0.16),_transparent_28%)] text-white lg:flex-row">
      {/* GPU Composited Instant-Retract Sidebar */}
      <aside
        className={`group/sidebar sticky top-0 z-30 flex shrink-0 flex-col h-screen border-r border-white/10 bg-[#121215] transform-gpu transition-[width] duration-200 ease-out will-change-[width] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
          isPinned ? "lg:w-60" : "lg:w-[52px] lg:hover:w-60"
        }`}
      >
        {/* Supabase Top Brand Logo */}
        <div className="flex h-12 shrink-0 items-center border-b border-white/10 px-2.5">
          <div className="flex items-center gap-2.5 overflow-hidden w-full">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ff9c61]/15 border border-[#ff9c61]/30 text-[#ff9c61]">
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
              <p className="mt-0.5 text-[9px] uppercase tracking-wider text-white/40">Doctor Portal</p>
            </div>
          </div>
        </div>

        {/* Doctor Profile Banner */}
        <div
          className={`border-b border-white/10 transition-all duration-200 overflow-hidden ${
            isPinned
              ? "max-h-24 p-2 opacity-100"
              : "max-h-0 p-0 opacity-0 border-0 group-hover/sidebar:max-h-24 group-hover/sidebar:p-2 group-hover/sidebar:opacity-100 group-hover/sidebar:border-b group-hover/sidebar:border-white/10"
          }`}
        >
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-1.5 backdrop-blur-xl">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04]">
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
                : "text-white/55 hover:bg-white/[0.06] hover:text-white border border-transparent"
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center">
              <Users className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <span
              className={`text-xs whitespace-nowrap transition-opacity overflow-hidden ${
                isPinned
                  ? "opacity-100"
                  : "opacity-0 delay-0 duration-100 group-hover/sidebar:opacity-100 group-hover/sidebar:delay-75 group-hover/sidebar:duration-150"
              }`}
            >
              My Patients
            </span>
          </button>

          <button
            onClick={() => navigate("/doctor/settings")}
            title="Account settings"
            className={`w-full h-8 rounded-md flex items-center transition-colors duration-150 ${
              location.pathname === "/doctor/settings"
                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 font-medium"
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
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto bg-transparent p-6 sm:p-8 lg:p-10">
        <Outlet />
      </main>
    </div>
  );
}
