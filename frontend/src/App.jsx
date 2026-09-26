import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth, roleHome } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserDashboard from "./pages/UserDashboard";
import ScanClaimPage from "./pages/ScanClaimPage";
import RvmSimulatorPage from "./pages/RvmSimulatorPage";
import {
  AdminHome,
  AdminUsers,
  AdminRvms,
  AdminPricing,
  AdminTransactions,
  AdminAccounts,
  AdminCatalog,
  AdminCollection,
  AdminAudit,
} from "./pages/AdminPages";
import { EprHome, EprRvms, EprMedia, EprReports } from "./pages/EprPages";

function HomeRedirect() {
  const { user, profile, loading } = useAuth();
  if (loading) {
    return (
      <div className="screen center">
        <p className="muted">Loading…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={roleHome(profile?.role)} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={["USER", "ADMIN"]}>
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/scan"
            element={
              <ProtectedRoute roles={["USER", "ADMIN"]}>
                <ScanClaimPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/history"
            element={
              <ProtectedRoute roles={["USER", "ADMIN"]}>
                <UserDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <AdminHome />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/users" element={<ProtectedRoute roles={["ADMIN"]}><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/rvms" element={<ProtectedRoute roles={["ADMIN"]}><AdminRvms /></ProtectedRoute>} />
          <Route path="/admin/pricing" element={<ProtectedRoute roles={["ADMIN"]}><AdminPricing /></ProtectedRoute>} />
          <Route path="/admin/transactions" element={<ProtectedRoute roles={["ADMIN"]}><AdminTransactions /></ProtectedRoute>} />
          <Route path="/admin/accounts" element={<ProtectedRoute roles={["ADMIN"]}><AdminAccounts /></ProtectedRoute>} />
          <Route path="/admin/catalog" element={<ProtectedRoute roles={["ADMIN"]}><AdminCatalog /></ProtectedRoute>} />
          <Route path="/admin/collection" element={<ProtectedRoute roles={["ADMIN"]}><AdminCollection /></ProtectedRoute>} />
          <Route path="/admin/audit" element={<ProtectedRoute roles={["ADMIN"]}><AdminAudit /></ProtectedRoute>} />

          <Route path="/epr" element={<ProtectedRoute roles={["EPR", "ADMIN"]}><EprHome /></ProtectedRoute>} />
          <Route path="/epr/rvms" element={<ProtectedRoute roles={["EPR", "ADMIN"]}><EprRvms /></ProtectedRoute>} />
          <Route path="/epr/media" element={<ProtectedRoute roles={["EPR", "ADMIN"]}><EprMedia /></ProtectedRoute>} />
          <Route path="/epr/reports" element={<ProtectedRoute roles={["EPR", "ADMIN"]}><EprReports /></ProtectedRoute>} />

          <Route
            path="/rvm-simulator"
            element={
              <ProtectedRoute roles={["ADMIN", "EPR"]}>
                <RvmSimulatorPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
