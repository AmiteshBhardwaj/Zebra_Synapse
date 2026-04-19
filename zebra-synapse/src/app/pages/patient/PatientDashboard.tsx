import { Outlet, useNavigate } from "react-router";
import { useAuth } from "../../../auth/AuthContext";
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
import PortalAppShell from "../../components/layout/PortalAppShell";

export default function PatientDashboard() {
  const navigate = useNavigate();
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
    <PortalAppShell
      portalLabel="Patient Portal"
      workspaceTitle="Clinical intelligence cockpit"
      workspaceDescription="Track uploads, latest biomarkers, and practical follow-up actions from one calmer patient workspace."
      profileName={profile?.full_name}
      profileMeta="Secure patient workspace"
      navItems={menuItems}
      onSignOut={handleLogout}
    >
      <Outlet />
    </PortalAppShell>
  );
}
