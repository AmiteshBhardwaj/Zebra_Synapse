import React from "react";
import { useAuth } from "../../../auth/AuthContext";
import { usePatientLabReports } from "../../../hooks/usePatientLabReports";
import { usePatientLabPanels } from "../../../hooks/usePatientLabPanels";
import { useActiveReport } from "../../../hooks/useActiveReport";
import { Patient3DHealthDashboard } from "../../components/patient/Patient3DHealthDashboard";

export default function PatientHome() {
  const { profile } = useAuth();
  const { uploads, uploadLabReport } = usePatientLabReports();
  const { panels, refetch: refetchPanels } = usePatientLabPanels();
  const { selectedReportId, setSelectedReportId, activePanel } = useActiveReport(panels);

  return (
    <Patient3DHealthDashboard
      profile={profile}
      uploads={uploads}
      panels={panels}
      activePanel={activePanel}
      selectedReportId={selectedReportId}
      onSelectReportId={setSelectedReportId}
      onUploadReport={uploadLabReport}
      onRefreshPanels={refetchPanels}
    />
  );
}
