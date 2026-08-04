import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

/**
 * Gate for role-restricted route trees. There is no PUBLIC role in this
 * system, so anything outside /login always requires a valid token.
 */
export default function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    const home = role === "ADMIN" ? "/admin" : role === "TEACHER" ? "/teacher" : "/student";
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
}
