import { createBrowserRouter } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { CitizenLoginPage } from "./pages/auth/CitizenLoginPage";
import { DashboardRedirect } from "./pages/DashboardRedirect";
import { CommissionerDashboard } from "./pages/dashboards/CommissionerDashboard";
import { PrivateSecretaryDashboard } from "./pages/dashboards/PrivateSecretaryDashboard";
import { LegalDashboard } from "./pages/dashboards/LegalDashboard";
import { RegistrarDashboard } from "./pages/dashboards/RegistrarDashboard";
import { StationeryDashboard } from "./pages/dashboards/StationeryDashboard";
import { AdminDashboard } from "./pages/dashboards/AdminDashboard";
import { CaseListPage } from "./pages/cases/CaseListPage";
import { CaseDetailPage } from "./pages/cases/CaseDetailPage";
import { CaseCreatePage } from "./pages/cases/CaseCreatePage";
import { ComplaintsListPage } from "./pages/complaints/ComplaintsListPage";
import { ComplaintDetailPage } from "./pages/complaints/ComplaintDetailPage";
import { ComplaintCreatePage } from "./pages/complaints/ComplaintCreatePage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminAuditLogsPage } from "./pages/admin/AdminAuditLogsPage";
import { AdminNotificationsPage } from "./pages/admin/AdminNotificationsPage";
import { AdminReportsPage } from "./pages/admin/AdminReportsPage";
import { AdminSettingsPage } from "./pages/admin/AdminSettingsPage";
import { DisabilityTypeCreatePage } from "./pages/disabilityTypes/DisabilityTypeCreatePage";
import { IssueRegisterPage } from "./pages/issueRegister/IssueRegisterPage";
import { RegistrationPage } from "./pages/public/RegistrationPage";
import { ProfilePage } from "./pages/public/ProfilePage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";

export const router = createBrowserRouter([
  { path: "/", element: <DashboardRedirect /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/login/citizen", element: <CitizenLoginPage /> },
  { path: "/register", element: <RegistrationPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/profile", element: <ProfilePage /> },
  { path: "/dashboard", element: <DashboardRedirect /> },
  { path: "/dashboard/commissioner", element: <CommissionerDashboard /> },
  {
    path: "/dashboard/private-secretary",
    element: <PrivateSecretaryDashboard />,
  },
  { path: "/dashboard/legal", element: <LegalDashboard /> },
  { path: "/dashboard/registrar", element: <RegistrarDashboard /> },
  { path: "/dashboard/stationery", element: <StationeryDashboard /> },
  { path: "/dashboard/admin", element: <AdminDashboard /> },
  { path: "/admin/users", element: <AdminUsersPage /> },
  { path: "/admin/audit-logs", element: <AdminAuditLogsPage /> },
  { path: "/admin/notifications", element: <AdminNotificationsPage /> },
  { path: "/admin/reports", element: <AdminReportsPage /> },
  { path: "/admin/settings", element: <AdminSettingsPage /> },
  { path: "/admin/disability-types", element: <DisabilityTypeCreatePage /> },
  { path: "/cases", element: <CaseListPage /> },
  { path: "/cases/new", element: <CaseCreatePage /> },
  { path: "/cases/:caseYear/:caseId", element: <CaseDetailPage /> },
  { path: "/issue-register", element: <IssueRegisterPage /> },
  { path: "/complaints", element: <ComplaintsListPage /> },
  { path: "/complaints/new", element: <ComplaintCreatePage /> },
  { path: "/complaints/:complaintId", element: <ComplaintDetailPage /> },
]);
