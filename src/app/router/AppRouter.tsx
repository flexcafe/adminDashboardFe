import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "@/core/presentation/hooks/useAuth";

const LoginPage = lazy(() =>
  import("../../pages/LoginPage").then((module) => ({
    default: module.LoginPage,
  }))
);
const DashboardPage = lazy(() =>
  import("../../pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  }))
);
const NotFoundPage = lazy(() =>
  import("../../pages/NotFoundPage").then((module) => ({
    default: module.NotFoundPage,
  }))
);
const AppShell = lazy(() =>
  import("../../widgets/layout/AppShell").then((module) => ({
    default: module.AppShell,
  }))
);

function RouteFallback() {
  return (
    <section className="authPage">
      <div className="authCard">
        <h1 className="authTitle">Loading...</h1>
        <p className="authSubtitle">Preparing dashboard experience.</p>
      </div>
    </section>
  );
}

function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <RouteFallback />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
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
      </Suspense>
    </BrowserRouter>
  );
}

