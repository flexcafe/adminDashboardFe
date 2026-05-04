import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { DashboardPage } from "../../pages/DashboardPage";
import { NotFoundPage } from "../../pages/NotFoundPage";
import { AppShell } from "../../widgets/layout/AppShell";
import { LoginPage } from "../../pages/LoginPage";
import { useAuth } from "@/core/presentation/hooks/useAuth";

function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

