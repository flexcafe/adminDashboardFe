import axios from "axios";
import { API_CONFIG, API_ENDPOINTS } from "@/core/infrastructure/api/constants";
import {
  clearAuthAndRedirectToLogin,
  getTimeUntilExpiration,
  isTokenExpired,
  isTokenExpiringSoon,
  tokenCookies,
} from "@/lib/cookies";

export type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  isVisible: boolean;
  description: string;
  iconUrl: string;
  imageUrl: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  productCount: number;
  createdAt: string;
  updatedAt: string;
  children: Category[];
};

export type CategoryPayload = {
  name?: string;
  slug?: string;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  isVisible?: boolean;
  icon?: string;
  iconFile?: File | null;
};

export type FlatCategory = Category & {
  depth: number;
  path: string[];
  childCount: number;
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  code?: number;
  data?: T;
  error?: string | null;
};

class CategoryApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CategoryApiError";
  }
}

const categoriesApiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  withCredentials: true,
});

categoriesApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearAuthAndRedirectToLogin();
      return Promise.reject(new Error("Authentication required."));
    }

    return Promise.reject(error);
  }
);

const toText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
};

const toAbsoluteAssetUrl = (value: unknown): string => {
  const raw = toText(value).trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return raw;

  try {
    return new URL(raw, API_CONFIG.BASE_URL).toString();
  } catch {
    return raw;
  }
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
    return ["1", "true", "active", "enabled"].includes(normalized);
  }
  return false;
};

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => toText(item)).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
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
    const candidates = [root.items, root.rows, root.categories, root.data];
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

const normalizeCategory = (item: Record<string, unknown>): Category | null => {
  const id = toText(item.id) || toText(item.categoryId) || toText(item._id);
  if (!id) return null;

  const children = toRecordArray(item.children)
    .map((child) => normalizeCategory(child))
    .filter((child): child is Category => !!child)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  return {
    id,
    name: toText(item.name) || "Untitled category",
    slug: toText(item.slug),
    parentId: toText(item.parentId) || toText(item.parent_id) || null,
    sortOrder: toNumber(item.sortOrder || item.displayOrder || item.order),
    isActive:
      item.isActive === undefined ? true : toBoolean(item.isActive),
    isVisible:
      item.isVisible === undefined && item.visible === undefined
        ? true
        : toBoolean(item.isVisible ?? item.visible),
    description: toText(item.description),
    iconUrl:
      toAbsoluteAssetUrl(item.icon) ||
      toAbsoluteAssetUrl(item.iconUrl) ||
      toAbsoluteAssetUrl(item.imageUrl),
    imageUrl:
      toAbsoluteAssetUrl(item.imageUrl) ||
      toAbsoluteAssetUrl(item.image) ||
      toAbsoluteAssetUrl(item.icon) ||
      toAbsoluteAssetUrl(item.iconUrl),
    metaTitle: toText(item.metaTitle),
    metaDescription: toText(item.metaDescription),
    metaKeywords: toStringArray(item.metaKeywords),
    productCount:
      toNumber(item.productCount) ||
      toNumber(item.itemCount) ||
      toNumber(item.itemsCount),
    createdAt: toText(item.createdAt) || new Date().toISOString(),
    updatedAt:
      toText(item.updatedAt) ||
      toText(item.createdAt) ||
      new Date().toISOString(),
    children,
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
    throw new CategoryApiError(response.message || response.error || fallback);
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

categoriesApiClient.interceptors.request.use(async (config) => {
  const token = ensureAuthenticatedToken();
  config.headers = config.headers ?? {};
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const buildCategoryPayload = (payload: CategoryPayload) => {
  const next: Record<string, unknown> = {};
  if (payload.name !== undefined) next.name = payload.name.trim();
  if (payload.slug !== undefined) next.slug = payload.slug.trim();
  if (payload.parentId !== undefined) next.parentId = payload.parentId || null;
  if (payload.sortOrder !== undefined) next.sortOrder = payload.sortOrder;
  if (payload.isActive !== undefined) next.isActive = payload.isActive;
  if (payload.isVisible !== undefined) next.isVisible = payload.isVisible;
  return next;
};

const buildCategoryFormData = (payload: CategoryPayload) => {
  const formData = new FormData();

  if (payload.name !== undefined) formData.append("name", payload.name.trim());
  if (payload.slug !== undefined) formData.append("slug", payload.slug.trim());
  if (payload.sortOrder !== undefined) {
    formData.append("sortOrder", String(payload.sortOrder));
  }
  if (payload.isActive !== undefined) {
    formData.append("isActive", String(payload.isActive));
  }
  if (payload.isVisible !== undefined) {
    formData.append("isVisible", String(payload.isVisible));
  }
  if (payload.parentId !== undefined && payload.parentId) {
    formData.append("parentId", payload.parentId);
  }
  if (payload.iconFile) {
    formData.append("image", payload.iconFile);
  }
  return formData;
};

const normalizeCategoryTree = (value: unknown) =>
  toRecordArray(value)
    .map((item) => normalizeCategory(item))
    .filter((item): item is Category => !!item)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

export const flattenCategories = (
  categories: Category[],
  depth = 0,
  path: string[] = []
): FlatCategory[] =>
  categories.flatMap((category) => {
    const nextPath = [...path, category.id];
    return [
      {
        ...category,
        depth,
        path: nextPath,
        childCount: category.children.length,
      },
      ...flattenCategories(category.children, depth + 1, nextPath),
    ];
  });

export const getAllCategoryIds = (categories: Category[]) =>
  flattenCategories(categories).map((category) => category.id);

export const findCategoryById = (
  categories: Category[],
  categoryId?: string | null
): Category | null => {
  if (!categoryId) return null;
  for (const category of categories) {
    if (category.id === categoryId) return category;
    const child = findCategoryById(category.children, categoryId);
    if (child) return child;
  }
  return null;
};

export const collectDescendantIds = (
  category: Category | null | undefined
): string[] => {
  if (!category) return [];
  return category.children.flatMap((child) => [
    child.id,
    ...collectDescendantIds(child),
  ]);
};

export const getCategoryBreadcrumbs = (
  categories: Category[],
  categoryId?: string | null,
  path: Category[] = []
): Category[] => {
  if (!categoryId) return [];
  for (const category of categories) {
    const nextPath = [...path, category];
    if (category.id === categoryId) return nextPath;
    const childPath = getCategoryBreadcrumbs(
      category.children,
      categoryId,
      nextPath
    );
    if (childPath.length > 0) return childPath;
  }
  return [];
};

const cloneCategoryTree = (categories: Category[]): Category[] =>
  categories.map((category) => ({
    ...category,
    metaKeywords: [...category.metaKeywords],
    children: cloneCategoryTree(category.children),
  }));

const removeCategoryNode = (
  categories: Category[],
  categoryId: string
): { nextTree: Category[]; removed: Category | null } => {
  const nextTree: Category[] = [];
  let removed: Category | null = null;

  for (const category of categories) {
    if (category.id === categoryId) {
      removed = category;
      continue;
    }

    const childResult = removeCategoryNode(category.children, categoryId);
    if (childResult.removed) {
      removed = childResult.removed;
      nextTree.push({ ...category, children: childResult.nextTree });
    } else {
      nextTree.push(category);
    }
  }

  return { nextTree, removed };
};

const insertCategoryNode = (
  categories: Category[],
  parentId: string | null,
  insertIndex: number,
  node: Category
): Category[] => {
  if (parentId === null) {
    const next = [...categories];
    next.splice(insertIndex, 0, { ...node, parentId: null });
    return next;
  }

  return categories.map((category) => {
    if (category.id === parentId) {
      const nextChildren = [...category.children];
      nextChildren.splice(insertIndex, 0, { ...node, parentId });
      return { ...category, children: nextChildren };
    }

    return {
      ...category,
      children: insertCategoryNode(category.children, parentId, insertIndex, node),
    };
  });
};

const normalizeSortOrders = (categories: Category[]): Category[] =>
  categories.map((category, index) => ({
    ...category,
    sortOrder: index + 1,
    children: normalizeSortOrders(category.children),
  }));

export const moveCategoryTree = (
  categories: Category[],
  sourceId: string,
  targetParentId: string | null,
  insertIndex: number
) => {
  const clonedTree = cloneCategoryTree(categories);
  const { nextTree, removed } = removeCategoryNode(clonedTree, sourceId);
  if (!removed) return categories;
  return normalizeSortOrders(
    insertCategoryNode(nextTree, targetParentId, insertIndex, removed)
  );
};

export const filterCategoryTree = (categories: Category[], query: string): Category[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return categories;

  return categories
    .map((category) => {
      const children = filterCategoryTree(category.children, normalizedQuery);
      const matches =
        category.name.toLowerCase().includes(normalizedQuery) ||
        category.slug.toLowerCase().includes(normalizedQuery);

      if (!matches && children.length === 0) {
        return null;
      }

      return { ...category, children };
    })
    .filter((category): category is Category => !!category);
};

export async function listCategories(includeInactive = true): Promise<Category[]> {
  try {
    const response = await categoriesApiClient.get<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_CATEGORIES.BASE,
      {
        params: includeInactive ? undefined : { includeInactive: "false" },
      }
    );

    ensureSuccessResponse(response.data, "Failed to load categories.");
    return normalizeCategoryTree(response.data.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load categories."));
  }
}

export async function getCategory(categoryId: string): Promise<Category | null> {
  try {
    const response = await categoriesApiClient.get<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_CATEGORIES.BY_ID(categoryId)
    );

    ensureSuccessResponse(response.data, "Failed to load category.");
    const rawData = response.data?.data;
    if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
      return null;
    }

    return normalizeCategory(rawData as Record<string, unknown>);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load category."));
  }
}

export async function createCategory(payload: CategoryPayload) {
  try {
    const response = await categoriesApiClient.post<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_CATEGORIES.BASE,
      buildCategoryFormData(payload)
    );

    return ensureSuccessResponse(response.data, "Failed to create category.");
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to create category."));
  }
}

export async function updateCategory(categoryId: string, payload: CategoryPayload) {
  try {
    const response = await categoriesApiClient.patch<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_CATEGORIES.BY_ID(categoryId),
      payload.iconFile ? buildCategoryFormData(payload) : buildCategoryPayload(payload)
    );

    return ensureSuccessResponse(response.data, "Failed to update category.");
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update category."));
  }
}

export async function deleteCategory(categoryId: string) {
  try {
    const response = await categoriesApiClient.delete<ApiResponse<unknown>>(
      API_ENDPOINTS.DASHBOARD_CATEGORIES.BY_ID(categoryId)
    );

    return ensureSuccessResponse(response.data, "Failed to deactivate category.");
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to deactivate category."));
  }
}
