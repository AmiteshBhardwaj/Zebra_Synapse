import { Outlet, useNavigate, useLocation } from "react-router";
import { useAuth } from "../../../auth/AuthContext";
import { Button } from "../../components/ui/button";
import { Activity, Users, LogOut, Stethoscope, Settings } from "lucide-react";
import {
  portalSecondaryButtonClass,
} from "../../components/patient/PortalTheme";

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, profile } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-[radial-gradient(circle_at_10%_20%,_rgba(26,26,46,0.96),_rgba(10,10,15,0.98)_60%),radial-gradient(circle_at_top_right,_rgba(255,106,0,0.14),_transparent_26%),radial-gradient(circle_at_top_left,_rgba(108,91,212,0.16),_transparent_28%)] text-white">
      <aside className="flex w-64 flex-col border-r border-white/10 bg-[#0b0b10]">
        <div className="border-b border-white/10 p-6">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-[#ff9c61]" strokeWidth={1.5} />
            <div>
              <h2 className="text-base font-medium text-white">Zebra Synapse</h2>
              <p className="text-xs text-white/50">Doctor Portal</p>
            </div>
          </div>
        </div>

        <div className="border-b border-white/10 p-6">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <Stethoscope className="w-5 h-5 text-[#ff9c61]" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{profile?.full_name ?? "Doctor"}</p>
              <p className="text-xs text-white/50">
                {profile?.license_number
                  ? `License ${profile.license_number}`
                  : "Physician"}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            <button
              onClick={() => navigate("/doctor")}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                location.pathname === "/doctor"
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20"
                  : "text-white/60 hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-sm">My Patients</span>
            </button>
            <button
              onClick={() => navigate("/doctor/settings")}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                location.pathname === "/doctor/settings"
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20"
                  : "text-white/60 hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              <Settings className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-sm">Account settings</span>
            </button>
          </div>
        </nav>

        <div className="border-t border-white/10 p-4">
          <Button
            variant="outline"
            className={`w-full justify-start ${portalSecondaryButtonClass}`}
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-transparent">
        <Outlet />
      </main>
    </div>
  );
}
