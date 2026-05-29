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

export type FraudReportStatus = "PENDING" | "CONFIRMED" | "DISMISSED";

export type FraudReport = {
  id: string;
  reporterUserId: string;
  reporterName: string;
  reportedUserId: string;
  reportedUserName: string;
  fraudType: string;
  reason: string;
  description: string;
  evidenceUrls: string[];
  status: FraudReportStatus;
  isReportedUserBanned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FraudReportsListResponse = {
  reports: FraudReport[];
  total: number;
  pendingCount: number;
  confirmedCount: number;
  dismissedCount: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  code?: number;
  data?: T;
  error?: string | null;
};

class FraudReportsApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FraudReportsApiError";
  }
}

const fraudReportsApiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  withCredentials: true,
});

fraudReportsApiClient.interceptors.response.use(
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
    throw new FraudReportsApiError(response.message || response.error || fallback);
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

fraudReportsApiClient.interceptors.request.use(async (config) => {
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

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => toText(item)).filter(Boolean);
  }
  return [];
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
      root.reports,
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

const normalizeFraudReport = (item: Record<string, unknown>): FraudReport | null => {
  const id =
    toText(item.id) ||
    toText(item.reportId) ||
    toText(item._id) ||
    toText(item.uuid);
  if (!id) return null;

  const rawStatus = toText(item.status).toUpperCase();
  const statusMap: Record<string, FraudReportStatus> = {
    PENDING: "PENDING",
    PENDING_REVIEW: "PENDING",
    CONFIRMED: "CONFIRMED",
    CONFIRMED_FRAUD: "CONFIRMED",
    DISMISSED: "DISMISSED",
    DISMISSED_REPORT: "DISMISSED",
    REJECTED: "DISMISSED",
  };
  const status = statusMap[rawStatus] ?? "PENDING";

  return {
    id,
    reporterUserId: toText(item.reporterUserId) || toText(item.reporterId) || "",
    reporterName: toText(item.reporterNickname) || toText(item.reporterName) || toText(item.reporter) || "Unknown",
    reportedUserId: toText(item.reportedUserId) || toText(item.reportedId) || "",
    reportedUserName: toText(item.reportedUserNickname) || toText(item.reportedUserName) || toText(item.reportedUser) || "Unknown",
    fraudType: toText(item.fraudType) || toText(item.type) || toText(item.reason) || "",
    reason: toText(item.reason) || toText(item.fraudReason) || "",
    description: toText(item.description) || toText(item.details) || "",
    evidenceUrls: toStringArray(item.evidenceUrls || item.evidence || item.attachments),
    status,
    isReportedUserBanned:
      typeof item.isReportedUserBanned === "boolean"
        ? item.isReportedUserBanned
        : item.banned === true || item.isBanned === true,
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
 * Fetch all fraud reports.
 * GET /api/v1/admin/dashboard/fraud-reports
 */
export async function listFraudReports(): Promise<FraudReportsListResponse> {
  try {
    const response = await fraudReportsApiClient.get<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_FRAUD_REPORTS.BASE
    );
    ensureSuccessResponse(response.data, "Failed to load fraud reports.");

    const rawData = response.data?.data as Record<string, unknown> | undefined;
    const reports = toRecordArray(rawData)
      .map((item) => normalizeFraudReport(item))
      .filter((item): item is FraudReport => !!item);

    return {
      reports,
      total: reports.length,
      pendingCount: reports.filter((r) => r.status === "PENDING").length,
      confirmedCount: reports.filter((r) => r.status === "CONFIRMED").length,
      dismissedCount: reports.filter((r) => r.status === "DISMISSED").length,
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load fraud reports."));
  }
}

/**
 * Response shape for ban/unban endpoints.
 */
export type BanUnbanResponse = {
  userId: string;
  isBanned: boolean;
};

/**
 * Ban a user reported for fraud.
 * POST /api/v1/admin/dashboard/fraud-reports/users/{userId}/ban
 */
export async function banUser(userId: string): Promise<BanUnbanResponse> {
  try {
    const response = await fraudReportsApiClient.post<ApiResponse<{ userId: string; isBanned: boolean }>>(
      API_ENDPOINTS.DASHBOARD_FRAUD_REPORTS.BAN_USER(userId)
    );
    const result = ensureSuccessResponse(response.data, "Failed to ban user.");
    return result.data ?? { userId, isBanned: true };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to ban user."));
  }
}

/**
 * Unban a previously banned user.
 * POST /api/v1/admin/dashboard/fraud-reports/users/{userId}/unban
 */
export async function unbanUser(userId: string): Promise<BanUnbanResponse> {
  try {
    const response = await fraudReportsApiClient.post<ApiResponse<{ userId: string; isBanned: boolean }>>(
      API_ENDPOINTS.DASHBOARD_FRAUD_REPORTS.UNBAN_USER(userId)
    );
    const result = ensureSuccessResponse(response.data, "Failed to unban user.");
    return result.data ?? { userId, isBanned: false };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to unban user."));
  }
}

/**
 * Payload for confirm/dismiss fraud report actions.
 */
export type ConfirmDismissPayload = {
  reporterMessage?: string;
};

/**
 * Confirm a fraud report as valid.
 * POST /api/v1/admin/dashboard/fraud-reports/{reportId}/confirm
 */
export async function confirmFraudReport(
  reportId: string,
  payload?: ConfirmDismissPayload
) {
  try {
    const response = await fraudReportsApiClient.post<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_FRAUD_REPORTS.CONFIRM(reportId),
      payload ?? {}
    );
    return ensureSuccessResponse(response.data, "Failed to confirm fraud report.");
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to confirm fraud report."));
  }
}

/**
 * Dismiss a fraud report as invalid.
 * POST /api/v1/admin/dashboard/fraud-reports/{reportId}/dismiss
 */
export async function dismissFraudReport(
  reportId: string,
  payload?: ConfirmDismissPayload
) {
  try {
    const response = await fraudReportsApiClient.post<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_FRAUD_REPORTS.DISMISS(reportId),
      payload ?? {}
    );
    return ensureSuccessResponse(response.data, "Failed to dismiss fraud report.");
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to dismiss fraud report."));
  }
}
