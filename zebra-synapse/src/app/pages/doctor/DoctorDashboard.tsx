import { Outlet, useNavigate } from "react-router";
import { useAuth } from "../../../auth/AuthContext";
import { Users, Settings } from "lucide-react";
import PortalAppShell from "../../components/layout/PortalAppShell";

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <PortalAppShell
      portalLabel="Doctor Portal"
      workspaceTitle="Patient review command center"
      workspaceDescription="Scan the roster, catch risk shifts early, and open structured patient detail without jumping between disconnected views."
      profileName={profile?.full_name ?? "Doctor"}
      profileMeta={profile?.license_number ? `License ${profile.license_number}` : "Physician"}
      navItems={[
        { path: "/doctor", icon: Users, label: "My Patients" },
        { path: "/doctor/settings", icon: Settings, label: "Account settings" },
      ]}
      onSignOut={handleLogout}
    >
      <Outlet />
    </PortalAppShell>
  );
}
