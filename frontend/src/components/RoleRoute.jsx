import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authstore';
import { canAccessRoute } from '../auth/permissions';

/**
 * Requires login with a role that may access the current route.
 */
export default function RoleRoute({ children }) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const raw = typeof user?.role === 'string' ? user.role.trim() : '';

  if (!raw) {
    return <Navigate to="/dashboard" state={{ accessDenied: 'no-role' }} replace />;
  }

  if (!canAccessRoute(location.pathname, user)) {
    return <Navigate to="/dashboard" state={{ accessDenied: 'forbidden' }} replace />;
  }

  return children;
}
