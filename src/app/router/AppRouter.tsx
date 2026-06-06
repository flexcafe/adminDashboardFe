import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import {
  ADMIN_PAGE_PERMISSIONS,
  ADMIN_PERMISSION_ROUTE_ORDER,
  useAdminPermissions,
} from "@/features/adminPermissions/useAdminPermissions";
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
const AdminUsersPage = lazy(() =>
  import("../../pages/AdminUsersPage").then((module) => ({
    default: module.AdminUsersPage,
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

function UnauthorizedPage() {
  return (
    <section className="page">
      <div className="card">
        <h1 className="pageTitle">Access Denied</h1>
        <p className="pageDescription">
          Your current admin role does not have permission to open this page.
        </p>
      </div>
    </section>
  );
}

function PermissionRedirect() {
  const { isLoading } = useAuth();
  const { canAccess } = useAdminPermissions();

  if (isLoading) return <RouteFallback />;

  const firstAccessibleRoute = ADMIN_PERMISSION_ROUTE_ORDER.find((entry) =>
    canAccess(entry.permissions)
  );

  if (firstAccessibleRoute) {
    return <Navigate to={firstAccessibleRoute.path} replace />;
  }

  return <UnauthorizedPage />;
}

function RequirePermission({
  requiredPermissions,
  redirectToFirstAllowed = true,
  children,
}: {
  requiredPermissions: readonly string[];
  redirectToFirstAllowed?: boolean;
  children: React.ReactNode;
}) {
  const { isLoading } = useAuth();
  const { canAccess } = useAdminPermissions();
  const location = useLocation();

  if (isLoading) return <RouteFallback />;
  if (!canAccess(requiredPermissions)) {
    if (redirectToFirstAllowed) {
      const firstAccessibleRoute = ADMIN_PERMISSION_ROUTE_ORDER.find((entry) =>
        canAccess(entry.permissions)
      );

      if (firstAccessibleRoute && firstAccessibleRoute.path !== location.pathname) {
        return <Navigate to={firstAccessibleRoute.path} replace />;
      }
    }

    return <UnauthorizedPage />;
  }
  return <>{children}</>;
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
              <Route path="/" element={<PermissionRedirect />} />
              <Route
                path="/dashboard"
                element={
                  <RequirePermission requiredPermissions={ADMIN_PAGE_PERMISSIONS.dashboard}>
                    <VerificationFlowPage />
                  </RequirePermission>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path=":userId" element={<UserVerificationDetailPage />} />
              </Route>
              <Route
                path="/ai-assistant"
                element={
                  <RequirePermission
                    requiredPermissions={ADMIN_PAGE_PERMISSIONS.aiAssistant}
                    redirectToFirstAllowed={false}
                  >
                    <AIAssistantPage />
                  </RequirePermission>
                }
              />
              <Route path="/admin-chat" element={<RequirePermission requiredPermissions={ADMIN_PAGE_PERMISSIONS.adminChat}><AdminChatPage /></RequirePermission>} />
              <Route path="/categories" element={<RequirePermission requiredPermissions={ADMIN_PAGE_PERMISSIONS.categories}><CategoriesPage /></RequirePermission>} />
              <Route path="/slider-ads" element={<RequirePermission requiredPermissions={ADMIN_PAGE_PERMISSIONS.sliderAds}><SliderAdsPage /></RequirePermission>} />
              <Route path="/admin-users" element={<RequirePermission requiredPermissions={ADMIN_PAGE_PERMISSIONS.adminUsers}><AdminUsersPage /></RequirePermission>} />
              <Route path="/admin-roles" element={<RequirePermission requiredPermissions={ADMIN_PAGE_PERMISSIONS.adminRoles}><AdminRolesPage /></RequirePermission>} />
              <Route path="/fraud-reports" element={<RequirePermission requiredPermissions={ADMIN_PAGE_PERMISSIONS.fraudReports}><FraudReportsPage /></RequirePermission>} />
              <Route path="/facebook-follow" element={<RequirePermission requiredPermissions={ADMIN_PAGE_PERMISSIONS.facebookFollow}><FacebookFollowPage /></RequirePermission>} />
              <Route path="/points" element={<RequirePermission requiredPermissions={ADMIN_PAGE_PERMISSIONS.points}><PointsPage /></RequirePermission>} />
              <Route path="/notifications" element={<RequirePermission requiredPermissions={ADMIN_PAGE_PERMISSIONS.notifications}><NotificationsPage /></RequirePermission>} />
              <Route path="/suggestions" element={<RequirePermission requiredPermissions={ADMIN_PAGE_PERMISSIONS.suggestions}><SuggestionsPage /></RequirePermission>} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
