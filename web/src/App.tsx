import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import PersonnelPage from './pages/Personnel';
import ShiftsPage from './pages/Shifts';
import LeavePage from './pages/LeaveManagement';
import AnnouncementsPage from './pages/Announcements';
import MealsPage from './pages/Meals';
import RoutesPage from './pages/ServiceRoutes';
import LocationsPage from './pages/WorkLocations';
import AttendancePage from './pages/Attendance';

function Protected({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isManager } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Web paneli yalnızca Admin/Amir içindir.
  if (!isManager) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="personnel" element={<PersonnelPage />} />
        <Route path="shifts" element={<ShiftsPage />} />
        <Route path="leave" element={<LeavePage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="meals" element={<MealsPage />} />
        <Route path="routes" element={<RoutesPage />} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="attendance" element={<AttendancePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
