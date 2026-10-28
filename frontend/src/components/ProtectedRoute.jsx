import { Navigate } from "react-router-dom";
import { useAuth, roleHome } from "../context/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="screen center">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && profile && !roles.includes(profile.role)) {
    return <Navigate to={roleHome(profile.role)} replace />;
  }

  return children;
}
