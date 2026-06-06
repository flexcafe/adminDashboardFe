import axios from "axios";
import { API_CONFIG, API_ENDPOINTS } from "@/core/infrastructure/api/constants";
import {
  clearAuthAndRedirectToLogin,
  getTimeUntilExpiration,
  isTokenExpired,
  isTokenExpiringSoon,
  tokenCookies,
} from "@/lib/cookies";

// ── Types ──────────────────────────────────────────────────────────────────────

export type AdminRole = {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminRolePayload = {
  name: string;
  description?: string;
  permissions: string[];
  isActive?: boolean;
};

export type Permission = {
  id: string;
  name: string;
  key: string;
  group: string;
  description?: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  code?: number;
  data?: T;
  error?: string | null;
};

class AdminRolesApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminRolesApiError";
  }
}

const adminRolesApiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  withCredentials: true,
});

adminRolesApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearAuthAndRedirectToLogin();
      return Promise.reject(new Error("Authentication required."));
    }
    return Promise.reject(error);
  }
);

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; error?: string }
      | undefined;
    return data?.message || data?.error || error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

const ensureSuccessResponse = <T,>(response: ApiResponse<T>, fallback: string) => {
  if (response.success === false) {
    throw new AdminRolesApiError(response.message || response.error || fallback);
  }
  return response;
};

const ensureAuthenticatedToken = () => {
  const token = tokenCookies.getToken();
  if (!token) {
    clearAuthAndRedirectToLogin();
    throw new Error("Authentication required.");
  }
  if (isTokenExpired(token) || getTimeUntilExpiration(token) <= 0) {
    clearAuthAndRedirectToLogin();
    throw new Error("Your session has expired. Please log in again.");
  }
  if (isTokenExpiringSoon(token, 5)) {
    console.warn("JWT token will expire soon, consider refreshing");
  }
  return token;
};

adminRolesApiClient.interceptors.request.use(async (config) => {
  const token = ensureAuthenticatedToken();
  config.headers = config.headers ?? {};
  config.headers.Authorization = `Bearer ${token}`;

  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  return config;
});

// ── Normalization helpers ──────────────────────────────────────────────────────

const toText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
};

const toRecordArray = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object"
    );
  }

  if (value && typeof value === "object") {
    const root = value as Record<string, unknown>;
    const candidates = [
      root.items,
      root.rows,
      root.records,
      root.roles,
      root.permissions,
      root.data,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.filter(
          (item): item is Record<string, unknown> =>
            !!item && typeof item === "object"
        );
      }
    }
  }

  return [];
};

const normalizePermissionIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string" || typeof item === "number") {
        return toText(item);
      }
      if (item && typeof item === "object") {
        const permission = item as Record<string, unknown>;
        return (
          toText(permission.id) ||
          toText(permission.key) ||
          toText(permission.permissionId) ||
          toText(permission.permissionKey) ||
          toText(permission.name)
        );
      }
      return "";
    })
    .filter(Boolean);
};

const normalizePermission = (item: Record<string, unknown>): Permission | null => {
  const id =
    toText(item.id) ||
    toText(item.permissionId) ||
    toText(item._id) ||
    toText(item.key);
  if (!id) return null;

  return {
    id,
    name: toText(item.name) || toText(item.displayName) || id,
    key: toText(item.key) || toText(item.permissionKey) || id,
    group: toText(item.group) || toText(item.groupName) || "General",
    description: toText(item.description) || undefined,
  };
};

const normalizeAdminRole = (item: Record<string, unknown>): AdminRole | null => {
  const id =
    toText(item.id) ||
    toText(item.roleId) ||
    toText(item._id) ||
    toText(item.uuid);
  if (!id) return null;

  return {
    id,
    name: toText(item.name) || toText(item.roleName) || "Untitled role",
    description: toText(item.description) || undefined,
    permissions: normalizePermissionIds(item.permissions),
    isActive:
      typeof item.isActive === "boolean"
        ? item.isActive
        : typeof item.status === "string"
          ? item.status === "ACTIVE" || item.status === "active"
          : true,
    createdAt:
      toText(item.createdAt) ||
      toText(item.created_at) ||
      new Date().toISOString(),
    updatedAt:
      toText(item.updatedAt) ||
      toText(item.updated_at) ||
      new Date().toISOString(),
  };
};

// ── API Functions ──────────────────────────────────────────────────────────────

/**
 * Fetch all available permissions for admin roles.
 * GET /api/v1/admin/dashboard/admin-roles/permissions
 */
export async function listPermissions(): Promise<Permission[]> {
  try {
    const response = await adminRolesApiClient.get<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_ADMIN_ROLES.PERMISSIONS
    );
    ensureSuccessResponse(response.data, "Failed to load permissions.");

    const rawData = response.data?.data;
    const permissionStringValues: string[] = [];

    if (Array.isArray(rawData)) {
      for (const entry of rawData) {
        if (typeof entry === "string" && entry.trim()) {
          permissionStringValues.push(entry.trim());
        }
      }
    }

    if (permissionStringValues.length === 0 && rawData && typeof rawData === "object") {
      const nestedPermissions = (rawData as Record<string, unknown>).permissions;
      if (Array.isArray(nestedPermissions)) {
        for (const entry of nestedPermissions) {
          if (typeof entry === "string" && entry.trim()) {
            permissionStringValues.push(entry.trim());
          }
        }
      }
    }

    if (permissionStringValues.length > 0) {
      return permissionStringValues.map((key) => {
        const name = key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        const prefix = key.split("_")[0] || "General";
        const group =
          prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
        return { id: key, name, key, group };
      });
    }

    const records = toRecordArray(rawData);
    const items =
      records.length > 0
        ? records
        : rawData && typeof rawData === "object"
          ? toRecordArray((rawData as Record<string, unknown>).permissions)
          : [];

    return items
      .map((item) => normalizePermission(item))
      .filter((item): item is Permission => !!item);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load permissions."));
  }
}

/**
 * Fetch all admin roles.
 * GET /api/v1/admin/dashboard/admin-roles
 */
export async function listAdminRoles(): Promise<AdminRole[]> {
  try {
    const response = await adminRolesApiClient.get<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_ADMIN_ROLES.BASE
    );
    ensureSuccessResponse(response.data, "Failed to load admin roles.");

    return toRecordArray(response.data?.data)
      .map((item) => normalizeAdminRole(item))
      .filter((item): item is AdminRole => !!item);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load admin roles."));
  }
}

/**
 * Create a new admin role.
 * POST /api/v1/admin/dashboard/admin-roles
 */
export async function createAdminRole(payload: AdminRolePayload) {
  try {
    const createPayload = {
      name: payload.name,
      description: payload.description,
      permissions: payload.permissions,
    };

    const response = await adminRolesApiClient.post<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_ADMIN_ROLES.BASE,
      createPayload
    );
    return ensureSuccessResponse(response.data, "Failed to create admin role.");
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to create admin role."));
  }
}

/**
 * Update an existing admin role.
 * PUT /api/v1/admin/dashboard/admin-roles/:roleId
 */
export async function updateAdminRole(roleId: string, payload: AdminRolePayload) {
  try {
    const response = await adminRolesApiClient.put<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_ADMIN_ROLES.BY_ID(roleId),
      payload
    );
    return ensureSuccessResponse(response.data, "Failed to update admin role.");
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update admin role."));
  }
}

/**
 * Delete an admin role.
 * DELETE /api/v1/admin/dashboard/admin-roles/:roleId
 */
export async function deleteAdminRole(roleId: string) {
  try {
    const response = await adminRolesApiClient.delete<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_ADMIN_ROLES.BY_ID(roleId)
    );
    return ensureSuccessResponse(response.data, "Failed to delete admin role.");
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to delete admin role."));
  }
}

