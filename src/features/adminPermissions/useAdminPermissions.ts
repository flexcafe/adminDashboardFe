import { useMemo } from "react";
import type { User } from "@/core/domain/entities/User";
import { useAuth } from "@/core/presentation/hooks/useAuth";

const ROOT_ONLY_PERMISSION = "__ROOT_ONLY__";

export const ADMIN_PAGE_PERMISSIONS = {
  dashboard: ["MANAGE_USERS"],
  aiAssistant: [ROOT_ONLY_PERMISSION],
  aiAssistantPopup: ["VIEW_ANALYTICS"],
  adminChat: ["MANAGE_SAFE_PAYMENTS", "MANAGE_TRANSACTIONS"],
  fraudReports: ["MANAGE_REPORTS"],
  contentModeration: ["MANAGE_REPORTS"],
  suggestions: ["MANAGE_SUGGESTIONS"],
  notifications: ["SEND_NOTIFICATIONS"],
  sliderAds: ["MANAGE_SLIDER_ADS"],
  categories: ["MANAGE_CATEGORIES"],
  points: ["MANAGE_POINT_CONFIG", "MANAGE_RANK_CONFIG", "MANAGE_WITHDRAWALS"],
  adminUsers: [ROOT_ONLY_PERMISSION],
  adminRoles: [ROOT_ONLY_PERMISSION],
  facebookFollow: [ROOT_ONLY_PERMISSION],
} as const;

export const ADMIN_PERMISSION_ROUTE_ORDER = [
  { path: "/dashboard", permissions: ADMIN_PAGE_PERMISSIONS.dashboard },
  { path: "/categories", permissions: ADMIN_PAGE_PERMISSIONS.categories },
  { path: "/slider-ads", permissions: ADMIN_PAGE_PERMISSIONS.sliderAds },
  { path: "/points", permissions: ADMIN_PAGE_PERMISSIONS.points },
  { path: "/admin-chat", permissions: ADMIN_PAGE_PERMISSIONS.adminChat },
  { path: "/fraud-reports", permissions: ADMIN_PAGE_PERMISSIONS.fraudReports },
  { path: "/content-moderation", permissions: ADMIN_PAGE_PERMISSIONS.contentModeration },
  { path: "/suggestions", permissions: ADMIN_PAGE_PERMISSIONS.suggestions },
  { path: "/notifications", permissions: ADMIN_PAGE_PERMISSIONS.notifications },
  { path: "/admin-users", permissions: ADMIN_PAGE_PERMISSIONS.adminUsers },
  { path: "/admin-roles", permissions: ADMIN_PAGE_PERMISSIONS.adminRoles },
  { path: "/facebook-follow", permissions: ADMIN_PAGE_PERMISSIONS.facebookFollow },
  { path: "/ai-assistant", permissions: ADMIN_PAGE_PERMISSIONS.aiAssistant },
] as const;

const normalizePermission = (value: string) => value.trim().toUpperCase();

const isRootAdminUser = (user: User | null) =>
  normalizePermission(String(user?.adminRoleName || "")) === "ROOT_ADMIN";

const extractUserPermissions = (user: User | null): string[] => {
  if (!user || !Array.isArray(user.permissions)) return [];

  return user.permissions
    .filter((value): value is string => typeof value === "string")
    .map(normalizePermission)
    .filter(Boolean);
};

export function useAdminPermissions() {
  const { user } = useAuth();

  const isRootAdmin = useMemo(() => isRootAdminUser(user), [user]);
  const permissions = useMemo(() => extractUserPermissions(user), [user]);
  const resolvedRoleName = String(user?.adminRoleName || "").trim();

  const hasPermission = (requiredPermission: string) => {
    if (isRootAdmin) return true;
    return permissions.includes(normalizePermission(requiredPermission));
  };

  const canAccess = (requiredPermissions?: readonly string[]) => {
    if (!requiredPermissions || requiredPermissions.length === 0) return true;
    if (isRootAdmin) return true;
    return requiredPermissions.some((permission) => hasPermission(permission));
  };

  return {
    permissions,
    resolvedRoleName,
    isRootAdmin,
    isLoading: false,
    hasPermission,
    canAccess,
  };
}
