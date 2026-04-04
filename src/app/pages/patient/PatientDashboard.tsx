import { Outlet, useNavigate, useLocation } from "react-router";
import { Button } from "../../components/ui/button";
import {
  Activity,
  FileText,
  Calendar,
  Heart,
  Pill,
  TrendingUp,
  Apple,
  FlaskConical,
  Sparkles,
  LogOut,
  Home
} from "lucide-react";

export default function PatientDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
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

  const handleLogout = () => {
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
              <p className="text-xs text-muted-foreground">Patient Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
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
