import axios from "axios";
import { API_CONFIG, API_ENDPOINTS } from "@/core/infrastructure/api/constants";
import {
  clearAuthAndRedirectToLogin,
  getTimeUntilExpiration,
  isTokenExpired,
  tokenCookies,
} from "@/lib/cookies";

export type ContentReportStatus = "PENDING" | "ACTIONED" | "DISMISSED";
export type ContentTargetType =
  | "LISTING"
  | "CHAT_MESSAGE"
  | "REVIEW"
  | "USER_PROFILE";

export type ContentReport = {
  id: string;
  reporterId: string;
  reporterNickname: string;
  reportedUserId: string;
  reportedUserNickname: string;
  targetType: ContentTargetType;
  targetId: string;
  reason: string;
  details: string;
  status: ContentReportStatus;
  adminNote: string;
  createdAt: string;
  updatedAt: string;
};

export type FilterKeyword = {
  id: string;
  keyword: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ActionContentReportPayload = {
  ejectUser?: boolean;
  adminNote?: string;
  reporterMessage?: string;
};

export type DismissContentReportPayload = {
  adminNote?: string;
  reporterMessage?: string;
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string | null;
};

const moderationApiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  withCredentials: true,
});

moderationApiClient.interceptors.request.use((config) => {
  const token = tokenCookies.getToken();
  if (
    !token ||
    isTokenExpired(token) ||
    getTimeUntilExpiration(token) <= 0
  ) {
    clearAuthAndRedirectToLogin();
    throw new Error("Your session has expired. Please log in again.");
  }

  config.headers = config.headers ?? {};
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

moderationApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearAuthAndRedirectToLogin();
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

const ensureSuccess = <T,>(response: ApiResponse<T>, fallback: string) => {
  if (response.success === false) {
    throw new Error(response.message || response.error || fallback);
  }
  return response.data;
};

const toText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return "";
};

const toRecords = (value: unknown, keys: string[]) => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object"
    );
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of keys) {
      if (Array.isArray(record[key])) {
        return (record[key] as unknown[]).filter(
          (item): item is Record<string, unknown> =>
            !!item && typeof item === "object"
        );
      }
    }
  }
  return [];
};

const normalizeReport = (
  item: Record<string, unknown>
): ContentReport | null => {
  const id = toText(item.id || item.reportId || item._id);
  if (!id) return null;
  const status = toText(item.status).toUpperCase();
  const targetType = toText(item.targetType).toUpperCase();

  return {
    id,
    reporterId: toText(item.reporterId),
    reporterNickname:
      toText(item.reporterNickname || item.reporterName) || "Unknown",
    reportedUserId: toText(item.reportedUserId),
    reportedUserNickname:
      toText(item.reportedUserNickname || item.reportedUserName) || "Unknown",
    targetType: (
      ["LISTING", "CHAT_MESSAGE", "REVIEW", "USER_PROFILE"].includes(targetType)
        ? targetType
        : "LISTING"
    ) as ContentTargetType,
    targetId: toText(item.targetId),
    reason: toText(item.reason) || "OTHER",
    details: toText(item.details),
    status: (
      ["PENDING", "ACTIONED", "DISMISSED"].includes(status)
        ? status
        : "PENDING"
    ) as ContentReportStatus,
    adminNote: toText(item.adminNote),
    createdAt: toText(item.createdAt || item.created_at),
    updatedAt: toText(item.updatedAt || item.updated_at),
  };
};

const normalizeKeyword = (
  item: Record<string, unknown>
): FilterKeyword | null => {
  const id = toText(item.id || item.keywordId || item._id);
  const keyword = toText(item.keyword);
  if (!id || !keyword) return null;
  return {
    id,
    keyword,
    isActive: item.isActive !== false,
    createdAt: toText(item.createdAt || item.created_at),
    updatedAt: toText(item.updatedAt || item.updated_at),
  };
};

export async function listContentReports(status?: ContentReportStatus) {
  try {
    const response = await moderationApiClient.get<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_CONTENT_MODERATION.CONTENT_REPORTS,
      { params: status ? { status } : undefined }
    );
    const data = ensureSuccess(response.data, "Failed to load content reports.");
    return toRecords(data, ["reports", "items", "rows", "data"])
      .map(normalizeReport)
      .filter((item): item is ContentReport => !!item);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load content reports."));
  }
}

export async function actionContentReport(
  reportId: string,
  payload: ActionContentReportPayload
) {
  try {
    const response = await moderationApiClient.post<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_CONTENT_MODERATION.ACTION_REPORT(reportId),
      payload
    );
    ensureSuccess(response.data, "Failed to action content report.");
    return response.data.message || "Content removed successfully.";
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to action content report."));
  }
}

export async function dismissContentReport(
  reportId: string,
  payload: DismissContentReportPayload
) {
  try {
    const response = await moderationApiClient.post<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_CONTENT_MODERATION.DISMISS_REPORT(reportId),
      payload
    );
    ensureSuccess(response.data, "Failed to dismiss content report.");
    return response.data.message || "Content report dismissed.";
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to dismiss content report."));
  }
}

export async function listFilterKeywords() {
  try {
    const response = await moderationApiClient.get<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_CONTENT_MODERATION.FILTER_KEYWORDS
    );
    const data = ensureSuccess(response.data, "Failed to load filter keywords.");
    return toRecords(data, ["keywords", "items", "rows", "data"])
      .map(normalizeKeyword)
      .filter((item): item is FilterKeyword => !!item);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load filter keywords."));
  }
}

export async function addFilterKeyword(keyword: string) {
  try {
    const response = await moderationApiClient.post<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_CONTENT_MODERATION.FILTER_KEYWORDS,
      { keyword }
    );
    ensureSuccess(response.data, "Failed to add filter keyword.");
    return response.data.message || "Filter keyword added.";
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to add filter keyword."));
  }
}

export async function deactivateFilterKeyword(keywordId: string) {
  try {
    const response = await moderationApiClient.delete<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_CONTENT_MODERATION.FILTER_KEYWORD_BY_ID(keywordId)
    );
    ensureSuccess(response.data, "Failed to deactivate filter keyword.");
    return response.data.message || "Filter keyword deactivated.";
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Failed to deactivate filter keyword.")
    );
  }
}
