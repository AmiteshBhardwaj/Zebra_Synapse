import { Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "../../../auth/AuthContext";
import { Button } from "../../components/ui/button";
import {
  Activity,
  Apple,
  Calendar,
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
    { path: "/patient/settings", icon: Settings, label: "Account settings" },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#0b0b0e] text-white lg:flex-row">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-12%] h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(245,116,44,0.3)_0%,_rgba(245,116,44,0)_68%)] blur-2xl" />
        <div className="absolute right-[-6%] top-[10%] h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(114,76,255,0.24)_0%,_rgba(114,76,255,0)_72%)] blur-3xl" />
        <div className="absolute bottom-[-20%] left-[28%] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.07)_0%,_rgba(255,255,255,0)_70%)] blur-3xl" />
      </div>

      <aside className="relative z-10 flex shrink-0 flex-col border-b border-white/10 bg-[#101014]/90 backdrop-blur-xl lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
        <div className="border-b border-white/10 px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff8a3d] to-[#f05a28] shadow-[0_12px_30px_rgba(240,90,40,0.28)]">
              <Activity className="h-5 w-5 text-white" strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-wide text-white">Zebra Synapse</h2>
              <p className="text-xs uppercase tracking-[0.28em] text-white/45">Patient Portal</p>
              {profile?.full_name ? (
                <p className="mt-1 max-w-[11rem] truncate text-xs text-white/60">
                  {profile.full_name}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-hidden px-4 py-4 sm:px-6 lg:overflow-y-auto lg:px-4">
          <div className="mb-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/40">Workspace</p>
            <p className="mt-2 text-sm leading-6 text-white/75">
              A calmer view of labs, prescriptions, and follow-up actions in one place.
            </p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1.5 lg:overflow-visible">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`min-w-[12.5rem] rounded-2xl px-4 py-3 text-left transition-all lg:w-full lg:min-w-0 ${
                    isActive
                      ? "bg-gradient-to-r from-[#f57c33] to-[#ec5e2c] text-white shadow-[0_12px_32px_rgba(236,94,44,0.32)]"
                      : "text-white/62 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        isActive ? "bg-white/15" : "bg-white/[0.04]"
                      }`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.7} />
                    </span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-white/10 p-4 sm:px-6 lg:px-4">
          <Button
            variant="outline"
            className="w-full justify-start border-white/12 bg-white/[0.03] text-white hover:bg-white/[0.07] hover:text-white"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      <main className="relative z-10 min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
