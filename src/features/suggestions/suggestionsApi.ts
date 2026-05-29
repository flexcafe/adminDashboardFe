import axios from "axios";
import { API_CONFIG, API_ENDPOINTS } from "@/core/infrastructure/api/constants";
import {
  tokenCookies,
  isTokenExpired,
  isTokenExpiringSoon,
  getTimeUntilExpiration,
  clearAuthAndRedirectToLogin,
} from "@/lib/cookies";

export type Suggestion = {
  id: string;
  title: string;
  description: string;
  userName: string;
  userPhoneOrEmail: string;
  status: "PENDING" | "REWARDED" | "DISMISSED";
  createdAt: string;
};

type ApiResponse<T> = {
  message?: string;
  code?: number;
  success?: boolean;
  error?: string;
  data?: T;
};

class SuggestionsApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SuggestionsApiError";
  }
}

// ── Axios instance with auth & 401 handling ──────────────────────────────────

const suggestionsApiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

suggestionsApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearAuthAndRedirectToLogin();
      return Promise.reject(new Error("Authentication required."));
    }
    return Promise.reject(error);
  }
);

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

suggestionsApiClient.interceptors.request.use(async (config) => {
  const token = ensureAuthenticatedToken();
  config.headers = config.headers ?? {};
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Error helpers ────────────────────────────────────────────────────────────

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; error?: string }
      | undefined;
    return data?.message || data?.error || error.message || fallback;
  }
  if (error instanceof SuggestionsApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
};

// ── Normalization helpers ────────────────────────────────────────────────────

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
    const maybeItems = (value as { items?: unknown }).items;
    if (Array.isArray(maybeItems)) {
      return maybeItems.filter(
        (item): item is Record<string, unknown> =>
          !!item && typeof item === "object"
      );
    }
  }

  return [];
};

const normalizeSuggestion = (
  item: Record<string, unknown>
): Suggestion | null => {
  const id =
    toText(item.id) || toText(item.suggestionId) || toText(item._id);
  if (!id) return null;

  return {
    id,
    title:
      toText(item.nickname) ||
      toText(item.title) ||
      toText(item.subject) ||
      "Untitled",
    description:
      toText(item.details) ||
      toText(item.description) ||
      toText(item.body) ||
      toText(item.content) ||
      "",
    userName:
      toText(item.userNickname) ||
      toText(item.userName) ||
      toText(item.username) ||
      toText(item.name) ||
      toText(item.user) ||
      "Unknown",
    userPhoneOrEmail:
      toText(item.userPhoneOrEmail) ||
      toText(item.phone) ||
      toText(item.email) ||
      toText(item.contact) ||
      "",
    status: (toText(item.status) as Suggestion["status"]) || "PENDING",
    createdAt:
      toText(item.createdAt) ||
      toText(item.created_at) ||
      toText(item.date) ||
      toText(item.submittedAt) ||
      "",
  };
};

// ── Public API functions ─────────────────────────────────────────────────────

export async function listSuggestions(): Promise<Suggestion[]> {
  try {
    const response = await suggestionsApiClient.get<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_SUGGESTIONS.BASE
    );

    const rawData = response.data?.data;
    const items = toRecordArray(rawData);

    return items
      .map(normalizeSuggestion)
      .filter((item): item is Suggestion => !!item);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load suggestions."));
  }
}

export async function rewardSuggestion(
  suggestionId: string,
  points: number
): Promise<string> {
  try {
    const response = await suggestionsApiClient.post<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_SUGGESTIONS.REWARD(suggestionId),
      { points }
    );

    const message =
      typeof response.data?.message === "string"
        ? response.data.message
        : typeof response.data?.data === "string"
          ? response.data.data
          : null;
    return message || "Suggestion rewarded successfully.";
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Failed to reward suggestion.")
    );
  }
}

export async function dismissSuggestion(
  suggestionId: string
): Promise<string> {
  try {
    const response = await suggestionsApiClient.post<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_SUGGESTIONS.DISMISS(suggestionId),
      {}
    );

    const message =
      typeof response.data?.message === "string"
        ? response.data.message
        : typeof response.data?.data === "string"
          ? response.data.data
          : null;
    return message || "Suggestion dismissed successfully.";
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Failed to dismiss suggestion.")
    );
  }
}
