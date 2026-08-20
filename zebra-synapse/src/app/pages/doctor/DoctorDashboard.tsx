import { useRef, useLayoutEffect, useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { useAuth } from "../../../auth/AuthContext";
import {
  Home,
  Users,
  Calendar,
  Video,
  Settings,
  LogOut,
  MessageSquare,
  Sparkles,
} from "lucide-react";

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const mainRef = useRef<HTMLDivElement>(null);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  // Auto-expand sidebar when cursor moves to the extreme left edge of the screen
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientX <= 20) {
        setIsSidebarHovered(true);
      } else if (e.clientX > (isSidebarHovered ? 275 : 85)) {
        setIsSidebarHovered(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isSidebarHovered]);

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
      id: "home",
      label: "Home",
      icon: Home,
      path: "/doctor",
      active: location.pathname === "/doctor",
    },
    {
      id: "patients",
      label: "Patients",
      icon: Users,
      path: "/doctor/patients",
      active:
        location.pathname === "/doctor/patients" ||
        location.pathname.startsWith("/doctor/patient/"),
    },
    {
      id: "appointments",
      label: "Appointments",
      icon: Calendar,
      path: "/doctor/appointments",
      active: location.pathname === "/doctor/appointments",
    },
    {
      id: "teleconsult",
      label: "Teleconsultations",
      icon: Video,
      path: "/doctor/teleconsult",
      active: location.pathname === "/doctor/teleconsult",
    },
    {
      id: "messages",
      label: "Patient Messages",
      icon: MessageSquare,
      path: "/doctor/messages",
      active:
        location.pathname === "/doctor/messages" ||
        location.pathname === "/doctor/chat",
    },
    {
      id: "settings",
      label: "Account Settings",
      icon: Settings,
      path: "/doctor/settings",
      active: location.pathname === "/doctor/settings",
    },
  ];

  return (
    <div className="flex h-screen w-screen bg-[#E5ECF9] font-poppins text-[#111111] overflow-hidden p-2.5 md:p-3.5 gap-2.5 md:gap-3.5">
      {/* Zero-gap Hover Hit Zone container extending to the screen's left, top and bottom edges */}
      <div
        className="relative h-full shrink-0 flex items-stretch z-20 -ml-2.5 md:-ml-3.5 pl-2.5 md:pl-3.5 -my-2.5 md:-my-3.5 py-2.5 md:py-3.5"
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        {/* Curved Deep Indigo Sidebar - Auto Expands on Cursor Hover/Proximity & Retracts */}
        <aside
          className={`group/sidebar shrink-0 bg-[#3E36B0] rounded-[24px] flex flex-col py-5 justify-between shadow-xl shadow-[#3E36B0]/20 select-none transform-gpu transition-[width] duration-300 ease-out will-change-[width] overflow-hidden ${
            isSidebarHovered ? "w-60 md:w-64" : "w-[68px] md:w-[72px]"
          } hover:w-60 md:hover:w-64`}
        >
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
              <div
                className={`ml-3 transition-opacity duration-150 overflow-hidden whitespace-nowrap ${
                  isSidebarHovered
                    ? "opacity-100 delay-75 duration-150"
                    : "opacity-0 delay-0 duration-100 group-hover/sidebar:opacity-100 group-hover/sidebar:delay-75 group-hover/sidebar:duration-150"
                }`}
              >
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
                      className={`text-xs font-semibold whitespace-nowrap transition-opacity overflow-hidden pr-3 ${
                        isSidebarHovered
                          ? "opacity-100 delay-75 duration-150"
                          : "opacity-0 delay-0 duration-100 group-hover/sidebar:opacity-100 group-hover/sidebar:delay-75 group-hover/sidebar:duration-150"
                      } ${item.active ? "text-[#3E36B0]" : "text-white"}`}
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
              <span
                className={`text-xs font-semibold whitespace-nowrap transition-opacity overflow-hidden pr-3 text-white ${
                  isSidebarHovered
                    ? "opacity-100 delay-75 duration-150"
                    : "opacity-0 delay-0 duration-100 group-hover/sidebar:opacity-100 group-hover/sidebar:delay-75 group-hover/sidebar:duration-150"
                }`}
              >
                Logout
              </span>
            </button>
          </div>
        </aside>
      </div>

      {/* Main Content Area in Crisp Rounded White Canvas */}
      <div className="flex-1 min-w-0 bg-[#F4F6FC] rounded-[24px] flex flex-col overflow-hidden shadow-2xl border border-white/60">
        {/* Scrollable View Container */}
        <main ref={mainRef} className="flex-1 overflow-y-auto bg-[#F4F6FC] p-2.5 md:p-3.5 lg:p-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

