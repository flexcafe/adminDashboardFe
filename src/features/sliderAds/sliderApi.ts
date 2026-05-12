import axios from "axios";
import { API_CONFIG, API_ENDPOINTS } from "@/core/infrastructure/api/constants";
import {
  getTimeUntilExpiration,
  isTokenExpired,
  isTokenExpiringSoon,
  tokenCookies,
} from "@/lib/cookies";

export type SliderAdStatus = "ACTIVE" | "INACTIVE";

export type SliderAd = {
  id: string;
  title: string;
  linkUrl: string;
  imageUrl: string;
  sortOrder: number;
  status: SliderAdStatus;
  createdAt: string;
  startsAt: string;
  endsAt: string;
};

export type SliderAdPayload = {
  file?: File | null;
  title?: string;
  linkUrl?: string;
  sortOrder?: number;
  status?: SliderAdStatus;
  startsAt?: string;
  endsAt?: string;
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  code?: number;
  data?: T;
  error?: string | null;
};

class SliderApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SliderApiError";
  }
}

const sliderApiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  withCredentials: true,
});

const toText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const toBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["1", "true", "active", "enabled", "published"].includes(normalized);
  }
  return false;
};

const normalizeStatus = (value: unknown): SliderAdStatus => {
  const status = toText(value).trim().toUpperCase();
  if (["ACTIVE", "ENABLED", "PUBLISHED", "LIVE"].includes(status)) {
    return "ACTIVE";
  }
  if (["INACTIVE", "DISABLED", "DRAFT", "PAUSED"].includes(status)) {
    return "INACTIVE";
  }
  return toBoolean(value) ? "ACTIVE" : "INACTIVE";
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
      root.sliderAds,
      root.sliders,
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

const normalizeSliderAd = (item: Record<string, unknown>): SliderAd | null => {
  const id =
    toText(item.id) ||
    toText(item.sliderAdId) ||
    toText(item._id) ||
    toText(item.uuid);
  if (!id) return null;

  return {
    id,
    title: toText(item.title) || "Untitled slider",
    linkUrl:
      toText(item.linkUrl) ||
      toText(item.url) ||
      toText(item.href),
    imageUrl:
      toText(item.imageUrl) ||
      toText(item.image) ||
      toText(item.fileUrl) ||
      toText(item.bannerUrl),
    sortOrder:
      toNumber(item.sortOrder) ||
      toNumber(item.order) ||
      toNumber(item.position),
    status: normalizeStatus(item.status ?? item.isActive ?? item.active),
    createdAt:
      toText(item.createdAt) ||
      toText(item.created_at) ||
      new Date().toISOString(),
    startsAt:
      toText(item.startsAt) ||
      toText(item.startAt),
    endsAt:
      toText(item.endsAt) ||
      toText(item.endAt),
  };
};

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
    throw new SliderApiError(response.message || response.error || fallback);
  }

  return response;
};

const ensureAuthenticatedToken = () => {
  const token = tokenCookies.getToken();
  if (!token) {
    throw new Error("Authentication required.");
  }
  if (isTokenExpired(token) || getTimeUntilExpiration(token) <= 0) {
    tokenCookies.clearAll();
    throw new Error("Your session has expired. Please log in again.");
  }
  if (isTokenExpiringSoon(token, 5)) {
    console.warn("JWT token will expire soon, consider refreshing");
  }
  return token;
};

sliderApiClient.interceptors.request.use(async (config) => {
  const token = ensureAuthenticatedToken();
  config.headers = config.headers ?? {};
  config.headers.Authorization = `Bearer ${token}`;

  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  return config;
});

const formatForBackendDateTime = (value?: string) => {
  if (!value?.trim()) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString();
};

const buildFormData = (payload: SliderAdPayload) => {
  const formData = new FormData();

  if (payload.file) {
    formData.append("file", payload.file);
  }
  if (payload.title !== undefined) {
    formData.append("title", payload.title.trim());
  }
  if (payload.linkUrl !== undefined) {
    formData.append("linkUrl", payload.linkUrl.trim());
  }
  if (payload.sortOrder !== undefined) {
    formData.append("sortOrder", String(payload.sortOrder));
  }
  if (payload.status !== undefined) {
    formData.append("status", payload.status);
  }
  const startsAt = formatForBackendDateTime(payload.startsAt);
  if (startsAt) {
    formData.append("startsAt", startsAt);
  }
  const endsAt = formatForBackendDateTime(payload.endsAt);
  if (endsAt) {
    formData.append("endsAt", endsAt);
  }

  return formData;
};

export async function listSliderAds(): Promise<SliderAd[]> {
  try {
    const response = await sliderApiClient.get<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_SLIDER_ADS.BASE
    );
    ensureSuccessResponse(response.data, "Failed to load slider ads.");

    return toRecordArray(response.data?.data)
      .map((item) => normalizeSliderAd(item))
      .filter((item): item is SliderAd => !!item)
      .sort((a, b) => {
        const orderDiff = a.sortOrder - b.sortOrder;
        if (orderDiff !== 0) return orderDiff;
        return a.createdAt.localeCompare(b.createdAt);
      });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load slider ads."));
  }
}

export async function createSliderAd(payload: SliderAdPayload) {
  try {
    const response = await sliderApiClient.post<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_SLIDER_ADS.BASE,
      buildFormData(payload)
    );

    return ensureSuccessResponse(
      response.data,
      "Failed to create slider ad."
    );
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to create slider ad."));
  }
}

export async function updateSliderAd(sliderId: string, payload: SliderAdPayload) {
  try {
    const response = await sliderApiClient.patch<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_SLIDER_ADS.BY_ID(sliderId),
      buildFormData(payload)
    );

    return ensureSuccessResponse(
      response.data,
      "Failed to update slider ad."
    );
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update slider ad."));
  }
}

export async function deleteSliderAd(sliderId: string) {
  try {
    const response = await sliderApiClient.delete<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_SLIDER_ADS.BY_ID(sliderId)
    );

    return ensureSuccessResponse(
      response.data,
      "Failed to delete slider ad."
    );
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to delete slider ad."));
  }
}

export async function updateSliderSortOrder(sliders: SliderAd[]) {
  try {
    await Promise.all(
      sliders.map((slider, index) =>
        updateSliderAd(slider.id, {
          title: slider.title,
          linkUrl: slider.linkUrl,
          sortOrder: index + 1,
          status: slider.status,
          startsAt: slider.startsAt,
          endsAt: slider.endsAt,
        })
      )
    );
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to reorder slider ads."));
  }
}
