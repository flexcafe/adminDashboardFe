import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import { AdminNotificationsProvider } from "@/features/adminNotifications/AdminNotificationsContext";

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
const AdminChatPage = lazy(() =>
  import("../../pages/AdminChatPage").then((module) => ({
    default: module.AdminChatPage,
  }))
);
const CategoriesPage = lazy(() =>
  import("../../pages/CategoriesPage").then((module) => ({
    default: module.CategoriesPage,
  }))
);
const VerificationFlowPage = lazy(() =>
  import("../../pages/VerificationFlowPage").then((module) => ({
    default: module.VerificationFlowPage,
  }))
);
const UserVerificationDetailPage = lazy(() =>
  import("../../pages/UserVerificationDetailPage").then((module) => ({
    default: module.UserVerificationDetailPage,
  }))
);
const PointsPage = lazy(() =>
  import("../../pages/PointsPage").then((module) => ({
    default: module.PointsPage,
  }))
);
const NotificationsPage = lazy(() =>
  import("../../pages/NotificationsPage").then((module) => ({
    default: module.NotificationsPage,
  }))
);
const FacebookFollowPage = lazy(() =>
  import("../../pages/FacebookFollowPage").then((module) => ({
    default: module.FacebookFollowPage,
  }))
);
const SliderAdsPage = lazy(() =>
  import("../../pages/SliderAdsPage").then((module) => ({
    default: module.SliderAdsPage,
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
  return <LoadingScreen />;
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
          <Route
            path="/loading-preview"
            element={
              <LoadingScreen
                title="Loading Preview"
                subtitle="Use this route to review the logo spinner animation."
              />
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route
              element={
                <AdminNotificationsProvider>
                  <AppShell />
                </AdminNotificationsProvider>
              }
            >
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<VerificationFlowPage />}>
                <Route index element={<DashboardPage />} />
                <Route path=":userId" element={<UserVerificationDetailPage />} />
              </Route>
              <Route path="/admin-chat" element={<AdminChatPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/slider-ads" element={<SliderAdsPage />} />
              <Route path="/facebook-follow" element={<FacebookFollowPage />} />
              <Route path="/points" element={<PointsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
