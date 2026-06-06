import axios from "axios";
import { API_CONFIG, API_ENDPOINTS } from "@/core/infrastructure/api/constants";
import {
  clearAuthAndRedirectToLogin,
  getTimeUntilExpiration,
  isTokenExpired,
  isTokenExpiringSoon,
  tokenCookies,
} from "@/lib/cookies";

export type AdminUser = {
  id: string;
  nickname: string;
  phone: string;
  email: string;
  isActive: boolean;
  isBanned: boolean;
  adminRoleId?: string;
  adminRoleName: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateAdminUserPayload = {
  nickname: string;
  phone: string;
  email: string;
  password: string;
  adminRoleId: string;
};

export type ChangeAdminUserRolePayload = {
  adminRoleId: string;
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  code?: number;
  data?: T;
  error?: string | null;
};

const adminUsersApiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  withCredentials: true,
});

adminUsersApiClient.interceptors.response.use(
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
    throw new Error(response.message || response.error || fallback);
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

adminUsersApiClient.interceptors.request.use(async (config) => {
  const token = ensureAuthenticatedToken();
  config.headers = config.headers ?? {};
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
      root.users,
      root.items,
      root.rows,
      root.records,
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

const normalizeAdminUser = (item: Record<string, unknown>): AdminUser | null => {
  const id =
    toText(item.id) ||
    toText(item.userId) ||
    toText(item._id) ||
    toText(item.uuid);
  if (!id) return null;

  const roleObject =
    item.role && typeof item.role === "object"
      ? (item.role as Record<string, unknown>)
      : null;

  const roleId =
    toText(item.adminRoleId) ||
    toText(item.roleId) ||
    toText(item.adminRoleId) ||
    toText(roleObject?.id) ||
    toText(roleObject?.roleId) ||
    undefined;

  const roleName =
    toText(item.adminRoleName) ||
    toText(item.roleName) ||
    toText(item.currentRole) ||
    toText(item.role) ||
    toText(roleObject?.name) ||
    toText(roleObject?.roleName) ||
    "Unassigned";

  return {
    id,
    nickname:
      toText(item.nickname) ||
      toText(item.name) ||
      toText(item.fullName) ||
      toText(item.username) ||
      "Unnamed admin",
    phone: toText(item.phone) || toText(item.phoneNumber) || "-",
    email: toText(item.email) || toText(item.userEmail) || "-",
    isActive:
      typeof item.isActive === "boolean"
        ? item.isActive
        : true,
    isBanned:
      typeof item.isBanned === "boolean"
        ? item.isBanned
        : false,
    adminRoleId: roleId,
    adminRoleName: roleName,
    createdAt: toText(item.createdAt) || toText(item.created_at) || undefined,
    updatedAt: toText(item.updatedAt) || toText(item.updated_at) || undefined,
  };
};

export async function listAdminUsers(): Promise<AdminUser[]> {
  try {
    const response = await adminUsersApiClient.get<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_ADMIN_USERS.BASE
    );
    ensureSuccessResponse(response.data, "Failed to load admin users.");

    return toRecordArray(response.data?.data)
      .map((item) => normalizeAdminUser(item))
      .filter((item): item is AdminUser => !!item);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load admin users."));
  }
}

export async function createAdminUser(payload: CreateAdminUserPayload) {
  try {
    const response = await adminUsersApiClient.post<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_ADMIN_USERS.BASE,
      {
        nickname: payload.nickname,
        phone: payload.phone,
        email: payload.email,
        password: payload.password,
        adminRoleId: payload.adminRoleId,
      }
    );
    return ensureSuccessResponse(response.data, "Failed to create admin user.");
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to create admin user."));
  }
}

export async function changeAdminUserRole(
  userId: string,
  payload: ChangeAdminUserRolePayload
) {
  try {
    const response = await adminUsersApiClient.patch<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_ADMIN_USERS.CHANGE_ROLE(userId),
      {
        adminRoleId: payload.adminRoleId,
      }
    );
    return ensureSuccessResponse(
      response.data,
      "Failed to update admin user role."
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Failed to update admin user role.")
    );
  }
}

export async function demoteAdminUser(userId: string) {
  try {
    const response = await adminUsersApiClient.delete<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_ADMIN_USERS.DEMOTE(userId)
    );
    return ensureSuccessResponse(
      response.data,
      "Failed to demote admin user to client."
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Failed to demote admin user to client.")
    );
  }
}
