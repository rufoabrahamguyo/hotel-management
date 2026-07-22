import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Register from './pages/Register';
import SelectProperty from './pages/SelectProperty';
import Dashboard from './pages/Dashboard';
import Guests from './pages/Guests';
import Rooms from './pages/Rooms';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import CreateStaff from './pages/admin/CreateStaff';
import Properties from './pages/admin/Properties';
import RoleRoute from './components/RoleRoute';
import SessionManager from './components/SessionManager';
import AppShellLayout from './layout/AppShellLayout';
import { appShellTheme } from './layout/appShellTheme';
import { useAuthStore } from './store/authstore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function ProtectedShell() {
  const token = useAuthStore((s) => s.token);
  const propertyId = useAuthStore((s) => s.propertyId);
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!propertyId) {
    return <Navigate to="/select-property" state={{ from: location }} replace />;
  }
  return <AppShellLayout />;
}

function RequirePendingAuth({ children }) {
  const token = useAuthStore((s) => s.token);
  const propertyId = useAuthStore((s) => s.propertyId);
  const location = useLocation();
  const switching = location.state?.switch === true;
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (propertyId && !switching) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/select-property"
        element={
          <RequirePendingAuth>
            <SelectProperty />
          </RequirePendingAuth>
        }
      />
      <Route element={<ProtectedShell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/admin/staff"
          element={
            <RoleRoute>
              <CreateStaff />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/properties"
          element={
            <RoleRoute>
              <Properties />
            </RoleRoute>
          }
        />
        <Route
          path="/guests"
          element={
            <RoleRoute>
              <Guests />
            </RoleRoute>
          }
        />
        <Route
          path="/rooms"
          element={
            <RoleRoute>
              <Rooms />
            </RoleRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <RoleRoute>
              <Reports />
            </RoleRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <RoleRoute>
              <Settings />
            </RoleRoute>
          }
        />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={appShellTheme}>
        <BrowserRouter>
          <SessionManager />
          <AppRoutes />
        </BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
