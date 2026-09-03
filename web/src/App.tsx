import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import PersonnelPage from './pages/Personnel';
import ShiftsPage from './pages/Shifts';
import ShiftPlanPage from './pages/ShiftPlan';
import BulkShiftAssignPage from './pages/BulkShiftAssign';
import LeavePage from './pages/LeaveManagement';
import HolidaysPage from './pages/Holidays';
import UsersPage from './pages/UsersPage';
import DepartmentsPage from './pages/Departments';
import AnnouncementsPage from './pages/Announcements';
import MealsPage from './pages/Meals';
import RoutesPage from './pages/ServiceRoutes';
import LocationsPage from './pages/WorkLocations';
import AttendancePage from './pages/Attendance';
import PayrollPage from './pages/Payroll';
import CandidatesPage from './pages/Candidates';
import ServiceAnalyticsPage from './pages/ServiceAnalytics';
import ReportsPage from './pages/Reports';
import EmployeeVoicePage from './pages/EmployeeVoice';
import ContactRequestsPage from './pages/ContactRequests';
import JobApplicationForm from './pages/JobApplicationForm';
import SelfLayout from './pages/self/SelfLayout';
import SelfLeave from './pages/self/SelfLeave';
import SelfAnnouncements from './pages/self/SelfAnnouncements';
import SelfMeals from './pages/self/SelfMeals';
import SelfPayroll from './pages/self/SelfPayroll';
import SelfService from './pages/self/SelfService';
import SelfVoice from './pages/self/SelfVoice';
import SelfDirectory from './pages/self/SelfDirectory';
import SelfAttendance from './pages/self/SelfAttendance';
import SelfCalculators from './pages/self/SelfCalculators';
import SelfContact from './pages/self/SelfContact';

function ManagerGuard({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isManager } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isManager) return <Navigate to="/me/leave" replace />;
  return children;
}

function AuthGuard({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function RoleRedirect() {
  const { isAuthenticated, isManager } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={isManager ? '/' : '/me/leave'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/basvuru" element={<JobApplicationForm />} />

      {/* Yönetici / Amir paneli */}
      <Route path="/" element={<ManagerGuard><Layout /></ManagerGuard>}>
        <Route index element={<Dashboard />} />
        <Route path="personnel" element={<PersonnelPage />} />
        <Route path="shifts" element={<ShiftsPage />} />
        <Route path="shift-plan" element={<ShiftPlanPage />} />
        <Route path="bulk-shift" element={<BulkShiftAssignPage />} />
        <Route path="leave" element={<LeavePage />} />
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="candidates" element={<CandidatesPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="meals" element={<MealsPage />} />
        <Route path="routes" element={<RoutesPage />} />
        <Route path="service-analytics" element={<ServiceAnalyticsPage />} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="holidays" element={<HolidaysPage />} />
        <Route path="voice" element={<EmployeeVoicePage />} />
        <Route path="contact-requests" element={<ContactRequestsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="users" element={<UsersPage />} />
      </Route>

      {/* Personel self-servis */}
      <Route path="/me" element={<AuthGuard><SelfLayout /></AuthGuard>}>
        <Route index element={<Navigate to="/me/leave" replace />} />
        <Route path="leave" element={<SelfLeave />} />
        <Route path="announcements" element={<SelfAnnouncements />} />
        <Route path="meals" element={<SelfMeals />} />
        <Route path="payroll" element={<SelfPayroll />} />
        <Route path="service" element={<SelfService />} />
        <Route path="voice" element={<SelfVoice />} />
        <Route path="directory" element={<SelfDirectory />} />
        <Route path="attendance" element={<SelfAttendance />} />
        <Route path="calc" element={<SelfCalculators />} />
        <Route path="contact" element={<SelfContact />} />
      </Route>

      <Route path="*" element={<RoleRedirect />} />
    </Routes>
  );
}
