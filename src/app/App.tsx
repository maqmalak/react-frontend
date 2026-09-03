import { Navigate, useLocation } from "react-router-dom";
import { AppProviders } from "./providers";
import { AppRoutes } from "./routes";
import { useAuth } from "@/hooks/useAuth";
import { FullPageLoader } from "@/pages/common/ComingSoonPage";

/** Redirects unauthenticated visitors to the login screen. */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageLoader />;
  // Already on the login page — render it instead of redirecting to ourselves
  // (redirecting here would cause an infinite navigation loop).
  if (!isAuthenticated && location.pathname !== "/login") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

/**
 * Application root.
 *
 * Frappe/ERPNext remains the system of record: authentication, permissions,
 * business logic and storage all live on the server. This React app is the
 * modern presentation layer over the REST/RPC/Socket.IO APIs.
 */
export default function App() {
  return (
    <AppProviders>
      <RequireAuth>
        <AppRoutes />
      </RequireAuth>
    </AppProviders>
  );
}
