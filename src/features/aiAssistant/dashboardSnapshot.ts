import { HttpClient } from "@/core/infrastructure/api/HttpClient";
import { API_ENDPOINTS } from "@/core/infrastructure/api/constants";
import {
  flattenCategories,
  getCategoryBreadcrumbs,
  type Category,
  listCategories,
} from "@/features/categories/categoriesApi";
import { loadPageContext } from "@/features/aiAssistant/pageContextStore";

export type DashboardSnapshot = {
  currentPage: string;
  loadedAt: string;
  pageContext: Record<string, unknown> | null;
  data: Record<string, unknown>;
};

type SnapshotMode = "quick" | "full";

const compactJson = (value: unknown, maxLength: number) => {
  const text = JSON.stringify(value, null, 2);
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n...truncated` : text;
};

const summarizeCategoriesForAI = (categories: Category[]) => {
  const flat = flattenCategories(categories);
  const namesById = new Map(flat.map((category) => [category.id, category.name]));

  return {
    summary: {
      totalCategories: flat.length,
      rootCategories: categories.length,
      inactiveCategories: flat.filter((category) => !category.isActive).length,
    },
    roots: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      isActive: category.isActive,
      productCount: category.productCount,
      childCount: category.children.length,
      children: category.children.map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
      })),
    })),
    flat: flat.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      parentId: category.parentId,
      parentName: category.parentId ? namesById.get(category.parentId) || null : null,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      productCount: category.productCount,
      childCount: category.children.length,
      breadcrumbs: getCategoryBreadcrumbs(categories, category.id).map((item) => item.name),
      directChildren: category.children.map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        isActive: child.isActive,
      })),
    })),
  };
};

const loadCategoriesForSnapshot = async () => {
  const categories = await listCategories(true);
  return summarizeCategoriesForAI(categories);
};

const getLoaders = (httpClient: HttpClient, mode: SnapshotMode) => {
  const sharedLoaders = {
    fraudReports: () => httpClient.get(API_ENDPOINTS.DASHBOARD_FRAUD_REPORTS.BASE),
    suggestions: () => httpClient.get(API_ENDPOINTS.DASHBOARD_SUGGESTIONS.BASE),
    withdrawals: () => httpClient.get(API_ENDPOINTS.DASHBOARD_WITHDRAWALS.BASE),
    sliderAds: () => httpClient.get(API_ENDPOINTS.DASHBOARD_SLIDER_ADS.BASE),
    categories: () => loadCategoriesForSnapshot(),
    users: () => httpClient.get(API_ENDPOINTS.USERS.GET_LIST, { params: { take: 10, skip: 0 } }),
  };

  if (mode === "quick") {
    return {
      dashboard: () => httpClient.get(API_ENDPOINTS.AUTH.KBZPAY_VERIFICATION_REQUESTED),
      adminChatAwaiting: () => httpClient.get(API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.AWAITING_INSTRUCTION),
      adminChatPending: () => httpClient.get(API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.PENDING),
      ...sharedLoaders,
    };
  }

  return {
    kbzRegisteredAccounts: () => httpClient.get(API_ENDPOINTS.AUTH.KBZPAY_REGISTERED_ACCOUNTS),
    kbzVerificationRequested: () => httpClient.get(API_ENDPOINTS.AUTH.KBZPAY_VERIFICATION_REQUESTED),
    kbzMoneyCheck: () => httpClient.get(API_ENDPOINTS.AUTH.KBZPAY_MONEY_CHECK),
    kbzVerifiedUsers: () => httpClient.get(API_ENDPOINTS.AUTH.KBZPAY_VERIFIED_USERS),
    safePaymentAwaitingInstruction: () => httpClient.get(API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.AWAITING_INSTRUCTION),
    safePaymentPending: () => httpClient.get(API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.PENDING),
    pointsStarConfig: () => httpClient.get(API_ENDPOINTS.DASHBOARD_POINTS.STAR_CONFIG),
    pointsRankConfig: () => httpClient.get(API_ENDPOINTS.DASHBOARD_POINTS.RANK_CONFIG),
    notifications: () => httpClient.get(API_ENDPOINTS.DASHBOARD_NOTIFICATIONS.LIST),
    facebookFollowSubmissions: () => httpClient.get(API_ENDPOINTS.DASHBOARD_FACEBOOK_FOLLOW.BASE),
    adminRoles: () => httpClient.get(API_ENDPOINTS.DASHBOARD_ADMIN_ROLES.BASE),
    adminPermissions: () => httpClient.get(API_ENDPOINTS.DASHBOARD_ADMIN_ROLES.PERMISSIONS),
    ...sharedLoaders,
  };
};

export const loadDashboardSnapshot = async (
  httpClient: HttpClient,
  currentPage: string,
  mode: SnapshotMode
): Promise<DashboardSnapshot> => {
  const loaders = getLoaders(httpClient, mode);
  const entries = await Promise.all(
    Object.entries(loaders).map(async ([key, load]) => {
      try {
        return [key, await load()] as const;
      } catch {
        return [key, "Unable to load"] as const;
      }
    })
  );

  return {
    currentPage,
    loadedAt: new Date().toISOString(),
    pageContext: loadPageContext(currentPage),
    data: Object.fromEntries(entries),
  };
};

export const buildSnapshotContext = (snapshot: DashboardSnapshot | null, maxLength = 18000) => {
  if (!snapshot) return "No dashboard data loaded yet.";
  return compactJson(snapshot, maxLength);
};
