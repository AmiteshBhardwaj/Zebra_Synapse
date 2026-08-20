import { createBrowserRouter } from "react-router";
import WelcomePage from "./pages/WelcomePage";
import DualLogin from "./pages/auth/DualLogin";
import PatientLogin from "./pages/auth/PatientLogin";
import PatientSignup from "./pages/auth/PatientSignup";
import DoctorLogin from "./pages/auth/DoctorLogin";
import DoctorSignup from "./pages/auth/DoctorSignup";
import PatientHome from "./pages/patient/PatientHome";
import MedicalRecords from "./pages/patient/MedicalRecordsInsights";
import Appointments from "./pages/patient/Appointments";
import Prescription from "./pages/patient/Prescription";
import DiseasePrediction from "./pages/patient/DiseasePredictionInsights";
import Diet from "./pages/patient/DietInsights";
import Nutrition from "./pages/patient/NutritionInsights";
import ExercisePlan from "./pages/patient/ExercisePlanInsights";
import LifestylePlan from "./pages/patient/LifestyleInsights";
import ClinicalTrials from "./pages/patient/ClinicalTrialsInsights";
import WellnessTips from "./pages/patient/WellnessTipsInsights";
import ProfileSettings from "./pages/ProfileSettings";
import PatientsList from "./pages/doctor/PatientsList";
import DoctorPatientsDirectory from "./pages/doctor/DoctorPatientsDirectory";
import PatientDetail from "./pages/doctor/PatientDetail";
import RequirePatientPortal from "./layouts/RequirePatientPortal";
import RequireDoctorPortal from "./layouts/RequireDoctorPortal";

import PatientTeleconsult from "./pages/patient/PatientTeleconsult";
import DoctorTeleconsult from "./pages/doctor/DoctorTeleconsult";
import DoctorAppointments from "./pages/doctor/DoctorAppointments";

import PatientLabChat from "./pages/patient/PatientLabChat";
import PatientDietFitness from "./pages/patient/PatientDietFitness";
import PatientDoctorChat from "./pages/patient/PatientDoctorChat";
import DoctorPatientChat from "./pages/doctor/DoctorPatientChat";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: WelcomePage,
  },
  {
    path: "/login",
    Component: WelcomePage,
  },
  {
    path: "/login/patient",
    Component: PatientLogin,
  },
  {
    path: "/login/doctor",
    Component: DoctorLogin,
  },
  {
    path: "/signup/patient",
    Component: PatientSignup,
  },
  {
    path: "/signup/doctor",
    Component: DoctorSignup,
  },
  {
    path: "/auth/duallogin",
    Component: DualLogin,
  },
  {
    path: "/patient",
    Component: RequirePatientPortal,
    children: [
      { index: true, Component: PatientHome },
      { path: "records", Component: MedicalRecords },
      { path: "medical-records", Component: MedicalRecords },
      { path: "lab-chat", Component: PatientLabChat },
      { path: "diet-chat", Component: PatientDietFitness },
      { path: "ai-chat", Component: PatientLabChat },
      { path: "appointments", Component: Appointments },
      { path: "teleconsult", Component: PatientTeleconsult },
      { path: "messages", Component: PatientDoctorChat },
      { path: "chat", Component: PatientDoctorChat },
      { path: "prescription", Component: Prescription },
      { path: "predictions", Component: DiseasePrediction },
      { path: "disease-prediction", Component: DiseasePrediction },
      { path: "lifestyle", Component: PatientDietFitness },
      { path: "diet-fitness", Component: PatientDietFitness },
      { path: "diet", Component: PatientDietFitness },
      { path: "nutrition", Component: PatientDietFitness },
      { path: "exercise", Component: PatientDietFitness },
      { path: "workout", Component: PatientDietFitness },
      { path: "clinical-trials", Component: ClinicalTrials },
      { path: "wellness-tips", Component: WellnessTips },
      { path: "settings", Component: ProfileSettings },
    ],
  },
  {
    path: "/doctor",
    Component: RequireDoctorPortal,
    children: [
      { index: true, Component: PatientsList },
      { path: "patients", Component: DoctorPatientsDirectory },
      { path: "appointments", Component: DoctorAppointments },
      { path: "teleconsult", Component: DoctorTeleconsult },
      { path: "messages", Component: DoctorPatientChat },
      { path: "chat", Component: DoctorPatientChat },
      { path: "settings", Component: ProfileSettings },
      { path: "patient/:patientId", Component: PatientDetail },
    ],
  },
]);
