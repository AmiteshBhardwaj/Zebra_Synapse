import { useRef, useLayoutEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "../../../auth/AuthContext";
import { DnaCanvas3D } from "../../components/DnaCanvas3D";
import {
  Activity,
  Apple,
  Calendar,
  FileText,
  FlaskConical,
  Home,
  LogOut,
  Pill,
  Settings,
  Sparkles,
  TrendingUp,
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
    { path: "/patient/appointments", icon: Calendar, label: "Appointments" },
    { path: "/patient/teleconsult", icon: Video, label: "Teleconsultation" },
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
    <div className="relative flex h-screen w-screen bg-[#06070a] text-slate-100 font-sans selection:bg-cyan-500/20 selection:text-cyan-300 lg:flex-row overflow-hidden">
      
      {/* 3D Bioluminescent Background Atmosphere (Identical to Landing Page) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[#04070d]" />

        {/* Multi-layered Volumetric Nebulae */}
        <div className="absolute inset-0 transition-opacity duration-300 pointer-events-none transform-gpu opacity-90">
          {/* Top-Left Bioluminescent Cyan Nebula */}
          <div className="absolute -top-[15%] -left-[10%] w-[65vw] h-[65vw] max-w-[850px] max-h-[850px] bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.16)_0%,rgba(14,165,233,0.05)_45%,transparent_75%)] blur-3xl rounded-full transform-gpu" />

          {/* Center-Right Electric Blue Halo */}
          <div className="absolute top-[25%] -right-[15%] w-[70vw] h-[70vw] max-w-[900px] max-h-[900px] bg-[radial-gradient(ellipse_at_center,rgba(3,105,161,0.18)_0%,rgba(99,102,241,0.06)_45%,transparent_75%)] blur-3xl rounded-full transform-gpu" />

          {/* Bottom-Left Deep Navy Ambient Glow */}
          <div className="absolute -bottom-[20%] left-[10%] w-[75vw] h-[75vw] max-w-[950px] max-h-[950px] bg-[radial-gradient(ellipse_at_center,rgba(2,132,199,0.14)_0%,rgba(15,23,42,0.08)_50%,transparent_80%)] blur-3xl rounded-full transform-gpu" />
        </div>

        {/* Sparse Clinical Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
      </div>

      {/* Live 3D WebGL Double Helix Layer */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-75">
        <DnaCanvas3D progress={0.22} />
      </div>

      {/* GPU Composited Cyber Glassmorphic Sidebar */}
      <aside
        className="group/sidebar sticky top-0 z-30 flex shrink-0 flex-col h-screen border-r border-slate-800/80 bg-[#060812]/85 backdrop-blur-2xl transform-gpu transition-[width] duration-200 ease-out will-change-[width] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden shadow-[5px_0_30px_rgba(0,0,0,0.6)] lg:w-[54px] lg:hover:w-60"
      >
        {/* Brand Header */}
        <div className="flex h-14 shrink-0 items-center border-b border-slate-800/80 px-2.5">
          <div className="flex items-center gap-2.5 overflow-hidden w-full cursor-pointer" onClick={() => navigate("/")}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-sky-600 text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.4)]">
              <Activity className="h-4 w-4 stroke-[2.5]" />
            </div>
            <div className="transition-opacity duration-150 overflow-hidden whitespace-nowrap opacity-0 delay-0 duration-100 group-hover/sidebar:opacity-100 group-hover/sidebar:delay-75 group-hover/sidebar:duration-150">
              <h2 className="text-xs font-mono font-bold tracking-wider text-slate-100 leading-none">Zebra Synapse</h2>
              <p className="mt-0.5 text-[9px] font-mono uppercase tracking-widest text-cyan-400/80">Patient Portal 3D</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {primaryMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                title={item.label}
                className={`w-full h-9 rounded-xl flex items-center transition-all duration-200 ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(56,189,248,0.25)] font-semibold"
                    : "text-slate-400 hover:bg-slate-900/70 hover:text-slate-100 border border-transparent"
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center">
                  <Icon className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <span className="text-xs whitespace-nowrap transition-opacity overflow-hidden opacity-0 delay-0 duration-100 group-hover/sidebar:opacity-100 group-hover/sidebar:delay-75 group-hover/sidebar:duration-150">
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Divider */}
          <div className="my-2 border-t border-slate-800/80" />

          {/* Account Settings */}
          <button
            onClick={() => navigate("/patient/settings")}
            title="Account settings"
            className={`w-full h-9 rounded-xl flex items-center transition-all duration-200 ${
              location.pathname === "/patient/settings"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(56,189,248,0.25)] font-semibold"
                : "text-slate-400 hover:bg-slate-900/70 hover:text-slate-100 border border-transparent"
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center">
              <Settings className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <span className="text-xs whitespace-nowrap transition-opacity overflow-hidden opacity-0 delay-0 duration-100 group-hover/sidebar:opacity-100 group-hover/sidebar:delay-75 group-hover/sidebar:duration-150">
              Account settings
            </span>
          </button>
        </nav>

        {/* Bottom Toolbar */}
        <div className="border-t border-slate-800/80 p-2 flex flex-col gap-1 shrink-0">
          <button
            onClick={handleLogout}
            title="Logout"
            className="w-full h-9 rounded-xl flex items-center transition-colors duration-150 text-slate-400 hover:bg-rose-500/15 hover:text-rose-300 hover:border-rose-500/30 border border-transparent"
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
      <main ref={mainRef} className="relative z-10 min-w-0 flex-1 h-screen overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
