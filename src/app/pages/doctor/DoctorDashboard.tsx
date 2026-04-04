import { Outlet, useNavigate, useLocation } from "react-router";
import { useAuth } from "../../../auth/AuthContext";
import { Button } from "../../components/ui/button";
import { Activity, Users, LogOut, Stethoscope, Settings } from "lucide-react";

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, profile } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-foreground" strokeWidth={1.5} />
            <div>
              <h2 className="text-base">Zebra Synapse</h2>
              <p className="text-xs text-muted-foreground">Doctor Portal</p>
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-foreground" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm">{profile?.full_name ?? "Doctor"}</p>
              <p className="text-xs text-muted-foreground">
                {profile?.license_number
                  ? `License ${profile.license_number}`
                  : "Physician"}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            <button
              onClick={() => navigate("/doctor")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                location.pathname === "/doctor"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-sm">My Patients</span>
            </button>
            <button
              onClick={() => navigate("/doctor/settings")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                location.pathname === "/doctor/settings"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <Settings className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-sm">Account settings</span>
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
