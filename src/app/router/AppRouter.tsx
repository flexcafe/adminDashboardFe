import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import { AdminNotificationsProvider } from "@/features/adminNotifications/AdminNotificationsContext";
import { SuggestionsProvider } from "@/features/suggestions/SuggestionsContext";

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
const AIAssistantPage = lazy(() =>
  import("../../pages/AIAssistantPage").then((module) => ({
    default: module.AIAssistantPage,
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
const AdminRolesPage = lazy(() =>
  import("../../pages/AdminRolesPage").then((module) => ({
    default: module.AdminRolesPage,
  }))
);
const FraudReportsPage = lazy(() =>
  import("../../pages/FraudReportsPage").then((module) => ({
    default: module.FraudReportsPage,
  }))
);
const SuggestionsPage = lazy(() =>
  import("../../pages/SuggestionsPage").then((module) => ({
    default: module.SuggestionsPage,
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
                  <SuggestionsProvider>
                    <AppShell />
                  </SuggestionsProvider>
                </AdminNotificationsProvider>
              }
            >
              <Route path="/" element={<Navigate to="/fraud-reports" replace />} />
              <Route
                path="/dashboard"
                element={<VerificationFlowPage />}
              >
                <Route index element={<DashboardPage />} />
                <Route path=":userId" element={<UserVerificationDetailPage />} />
              </Route>
              <Route path="/ai-assistant" element={<AIAssistantPage />} />
              <Route path="/admin-chat" element={<AdminChatPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/slider-ads" element={<SliderAdsPage />} />
              <Route path="/admin-roles" element={<AdminRolesPage />} />
              <Route path="/fraud-reports" element={<FraudReportsPage />} />
              <Route path="/facebook-follow" element={<FacebookFollowPage />} />
              <Route path="/points" element={<PointsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/suggestions" element={<SuggestionsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
