import { API_ENDPOINTS } from "@/core/infrastructure/api/constants";
import { HttpClient } from "@/core/infrastructure/api/HttpClient";
import { tokenCookies } from "@/lib/cookies";
import type { AssistantMessage } from "./aiAssistantStorage";

type GenericApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AssistantListResource =
  | "kbz_registered_accounts"
  | "kbz_verification_requested"
  | "kbz_money_check"
  | "kbz_verified_users"
  | "safe_payment_awaiting_instruction"
  | "safe_payment_pending"
  | "points_star_config"
  | "points_rank_config"
  | "fraud_reports"
  | "suggestions"
  | "notifications"
  | "users"
  | "withdrawals"
  | "facebook_follow_submissions"
  | "slider_ads"
  | "admin_roles"
  | "admin_permissions"
  | "categories";

type StarConfigInput = {
  starCount: number;
  pointsAwarded: number | null;
};

type RankConfigInput = {
  tier: string;
  minPoints: number | null;
  maxPoints: number | null;
  label: string;
  badgeUrl: string;
  sortOrder: number;
};

export type AssistantToolAction =
  | {
      type: "list";
      resource: AssistantListResource;
      params?: Record<string, unknown>;
    }
  | {
      type: "confirm_fraud_report" | "dismiss_fraud_report";
      reportId: string;
      reporterMessage?: string;
    }
  | { type: "ban_user" | "unban_user"; userId: string }
  | { type: "reward_suggestion"; suggestionId: string; points: number }
  | { type: "dismiss_suggestion"; suggestionId: string }
  | { type: "approve_withdrawal" | "reject_withdrawal"; withdrawalId: string; adminNote?: string }
  | { type: "mark_withdrawal_paid"; withdrawalId: string; kbzTransferRef: string }
  | { type: "send_kbz_instruction"; userId: string; adminPhoneForTransfer: string; adminNote: string }
  | { type: "verify_kbz_user"; userId: string; adminNote?: string }
  | { type: "send_safe_payment_instruction"; transactionId: string; adminReceivingPhone: string; adminNote: string }
  | { type: "mark_safe_payment_received" | "mark_safe_payment_transferred"; transactionId: string; adminNote?: string }
  | { type: "approve_facebook_follow" | "reject_facebook_follow"; submissionId: string }
  | { type: "update_star_config"; configs: StarConfigInput[] }
  | { type: "update_rank_config"; configs: RankConfigInput[] }
  | {
      type: "update_slider_ad";
      sliderId: string;
      payload: {
        title?: string;
        linkUrl?: string;
        sortOrder?: number;
        status?: "ACTIVE" | "INACTIVE";
        startsAt?: string;
        endsAt?: string;
      };
    }
  | { type: "delete_slider_ad"; sliderId: string }
  | {
      type: "create_admin_role";
      name: string;
      description?: string;
      permissions: string[];
      isActive?: boolean;
    }
  | {
      type: "update_admin_role";
      roleId: string;
      name?: string;
      description?: string;
      permissions?: string[];
      isActive?: boolean;
    }
  | { type: "delete_admin_role"; roleId: string }
  | {
      type: "create_category";
      name: string;
      slug?: string;
      parentId?: string | null;
      sortOrder?: number;
    }
  | {
      type: "update_category";
      categoryId: string;
      payload: {
        name?: string;
        slug?: string;
        description?: string;
        parentId?: string | null;
        sortOrder?: number;
        isActive?: boolean;
      };
    }
  | { type: "deactivate_category"; categoryId: string }
  | { type: "move_category"; categoryId: string; parentId?: string | null; sortOrder?: number }
  | {
      type: "generic_api";
      endpoint: GenericApiEndpointKey;
      pathParams?: Record<string, string>;
      query?: Record<string, unknown>;
      body?: Record<string, unknown>;
    };

export type AssistantCompletionResult = {
  content: string;
  action: AssistantToolAction | null;
};

export const WRITE_CONFIRMATION_PHRASES = [
  "confirm and apply",
  "confirm and execute",
  "proceed with write",
  "execute this write",
] as const;

type AssistantProviderError = {
  error?: {
    message?: string;
    code?: string;
    type?: string;
  };
  code?: number | string;
  message?: string;
};

type AssistantSessionUser = {
  adminRoleName?: string;
};

const APIFREE_CHAT_COMPLETIONS_URL =
  "https://api.apifree.ai/v1/chat/completions";

const ACTION_BLOCK_REGEX = /```(?:json)?\s*(\{[\s\S]*?"action"[\s\S]*?\})\s*```|(\{[\s\S]*?"action"[\s\S]*?\})/i;

const toRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const toText = (value: unknown) =>
  typeof value === "string" ? value : typeof value === "number" ? String(value) : "";

const toNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const toBoolean = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    return ["1", "true", "yes", "active", "enabled"].includes(
      value.trim().toLowerCase()
    );
  }
  return undefined;
};

const toOptionalNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = toNumber(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item) => toText(item)).filter(Boolean)
    : typeof value === "string"
      ? value.split(",").map((item) => item.trim()).filter(Boolean)
      : [];

const toStatus = (value: unknown): "ACTIVE" | "INACTIVE" | undefined => {
  const status = toText(value).trim().toUpperCase();
  if (status === "ACTIVE" || status === "INACTIVE") return status;
  const boolValue = toBoolean(value);
  return boolValue === undefined ? undefined : boolValue ? "ACTIVE" : "INACTIVE";
};

const sanitizeRecord = (value: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  );

type GenericEndpointDefinition = {
  method: GenericApiMethod;
  path: string | ((pathParams: Record<string, string>) => string);
  requiredPathParams?: string[];
  bodyMode?: "json" | "formData";
  description: string;
};

const ROOT_ONLY_ASSISTANT_LIST_RESOURCES = [
  "admin_roles",
  "admin_permissions",
] as const satisfies readonly AssistantListResource[];

const ROOT_ONLY_GENERIC_ENDPOINT_KEYS = [
  "admin_roles_permissions",
  "admin_roles_list",
  "admin_roles_create",
  "admin_roles_update",
  "admin_roles_delete",
] as const;

const ROOT_ONLY_ASSISTANT_ACTION_TYPES = [
  "create_admin_role",
  "update_admin_role",
  "delete_admin_role",
] as const satisfies readonly AssistantToolAction["type"][];

const requirePathParam = (pathParams: Record<string, string>, key: string) => {
  const value = pathParams[key]?.trim();
  if (!value) throw new Error(`Missing required path parameter: ${key}`);
  return value;
};

const genericApiEndpoints: Record<string, GenericEndpointDefinition> = {
  admin_notifications_list: { method: "GET", path: API_ENDPOINTS.DASHBOARD_NOTIFICATIONS.LIST, description: "List admin notifications" },
  kbz_registered_accounts: { method: "GET", path: API_ENDPOINTS.AUTH.KBZPAY_REGISTERED_ACCOUNTS, description: "List KBZPay registered accounts" },
  kbz_verification_requested: { method: "GET", path: API_ENDPOINTS.AUTH.KBZPAY_VERIFICATION_REQUESTED, description: "List KBZPay verification requests" },
  kbz_money_check: { method: "GET", path: API_ENDPOINTS.AUTH.KBZPAY_MONEY_CHECK, description: "List KBZPay money check queue" },
  kbz_verified_users: { method: "GET", path: API_ENDPOINTS.AUTH.KBZPAY_VERIFIED_USERS, description: "List KBZPay verified users" },
  kbz_send_instruction: {
    method: "POST",
    path: (params) => API_ENDPOINTS.AUTH.KBZPAY_SEND_INSTRUCTION(requirePathParam(params, "userId")),
    requiredPathParams: ["userId"],
    description: "Send KBZPay instruction to a user",
  },
  kbz_verify_user: {
    method: "POST",
    path: (params) => API_ENDPOINTS.AUTH.KBZPAY_VERIFY(requirePathParam(params, "userId")),
    requiredPathParams: ["userId"],
    description: "Verify KBZPay user",
  },
  safe_payments_awaiting_instruction: { method: "GET", path: API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.AWAITING_INSTRUCTION, description: "List safe payments awaiting instruction" },
  safe_payments_pending: { method: "GET", path: API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.PENDING, description: "List pending safe payments" },
  safe_payments_send_instruction: {
    method: "POST",
    path: (params) => API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.SEND_INSTRUCTION(requirePathParam(params, "transactionId")),
    requiredPathParams: ["transactionId"],
    description: "Send safe payment instruction",
  },
  safe_payments_received: {
    method: "POST",
    path: (params) => API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.RECEIVED(requirePathParam(params, "transactionId")),
    requiredPathParams: ["transactionId"],
    description: "Mark safe payment received",
  },
  safe_payments_transferred: {
    method: "POST",
    path: (params) => API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.TRANSFERRED(requirePathParam(params, "transactionId")),
    requiredPathParams: ["transactionId"],
    description: "Mark safe payment transferred",
  },
  points_star_config: { method: "GET", path: API_ENDPOINTS.DASHBOARD_POINTS.STAR_CONFIG, description: "Get star config" },
  points_star_config_update: { method: "PUT", path: API_ENDPOINTS.DASHBOARD_POINTS.STAR_CONFIG, description: "Update star config" },
  points_rank_config: { method: "GET", path: API_ENDPOINTS.DASHBOARD_POINTS.RANK_CONFIG, description: "Get rank config" },
  points_rank_config_update: { method: "PUT", path: API_ENDPOINTS.DASHBOARD_POINTS.RANK_CONFIG, description: "Update rank config" },
  withdrawals_list: { method: "GET", path: API_ENDPOINTS.DASHBOARD_WITHDRAWALS.BASE, description: "List withdrawals" },
  withdrawals_approve: {
    method: "POST",
    path: (params) => API_ENDPOINTS.DASHBOARD_WITHDRAWALS.APPROVE(requirePathParam(params, "withdrawalId")),
    requiredPathParams: ["withdrawalId"],
    description: "Approve withdrawal",
  },
  withdrawals_reject: {
    method: "POST",
    path: (params) => API_ENDPOINTS.DASHBOARD_WITHDRAWALS.REJECT(requirePathParam(params, "withdrawalId")),
    requiredPathParams: ["withdrawalId"],
    description: "Reject withdrawal",
  },
  withdrawals_mark_paid: {
    method: "POST",
    path: (params) => API_ENDPOINTS.DASHBOARD_WITHDRAWALS.MARK_PAID(requirePathParam(params, "withdrawalId")),
    requiredPathParams: ["withdrawalId"],
    description: "Mark withdrawal paid",
  },
  facebook_follow_list: { method: "GET", path: API_ENDPOINTS.DASHBOARD_FACEBOOK_FOLLOW.BASE, description: "List Facebook follow submissions" },
  facebook_follow_approve: {
    method: "POST",
    path: (params) => API_ENDPOINTS.DASHBOARD_FACEBOOK_FOLLOW.APPROVE(requirePathParam(params, "submissionId")),
    requiredPathParams: ["submissionId"],
    description: "Approve Facebook follow submission",
  },
  facebook_follow_reject: {
    method: "POST",
    path: (params) => API_ENDPOINTS.DASHBOARD_FACEBOOK_FOLLOW.REJECT(requirePathParam(params, "submissionId")),
    requiredPathParams: ["submissionId"],
    description: "Reject Facebook follow submission",
  },
  slider_ads_list: { method: "GET", path: API_ENDPOINTS.DASHBOARD_SLIDER_ADS.BASE, description: "List slider ads" },
  slider_ads_create: { method: "POST", path: API_ENDPOINTS.DASHBOARD_SLIDER_ADS.BASE, bodyMode: "formData", description: "Create slider ad" },
  slider_ads_update: {
    method: "PATCH",
    path: (params) => API_ENDPOINTS.DASHBOARD_SLIDER_ADS.BY_ID(requirePathParam(params, "sliderId")),
    requiredPathParams: ["sliderId"],
    bodyMode: "formData",
    description: "Update slider ad",
  },
  slider_ads_delete: {
    method: "DELETE",
    path: (params) => API_ENDPOINTS.DASHBOARD_SLIDER_ADS.BY_ID(requirePathParam(params, "sliderId")),
    requiredPathParams: ["sliderId"],
    description: "Delete slider ad",
  },
  admin_roles_permissions: { method: "GET", path: API_ENDPOINTS.DASHBOARD_ADMIN_ROLES.PERMISSIONS, description: "List admin permissions" },
  admin_roles_list: { method: "GET", path: API_ENDPOINTS.DASHBOARD_ADMIN_ROLES.BASE, description: "List admin roles" },
  admin_roles_create: { method: "POST", path: API_ENDPOINTS.DASHBOARD_ADMIN_ROLES.BASE, description: "Create admin role" },
  admin_roles_update: {
    method: "PUT",
    path: (params) => API_ENDPOINTS.DASHBOARD_ADMIN_ROLES.BY_ID(requirePathParam(params, "roleId")),
    requiredPathParams: ["roleId"],
    description: "Update admin role",
  },
  admin_roles_delete: {
    method: "DELETE",
    path: (params) => API_ENDPOINTS.DASHBOARD_ADMIN_ROLES.BY_ID(requirePathParam(params, "roleId")),
    requiredPathParams: ["roleId"],
    description: "Delete admin role",
  },
  fraud_reports_list: { method: "GET", path: API_ENDPOINTS.DASHBOARD_FRAUD_REPORTS.BASE, description: "List fraud reports" },
  fraud_reports_confirm: {
    method: "POST",
    path: (params) => API_ENDPOINTS.DASHBOARD_FRAUD_REPORTS.CONFIRM(requirePathParam(params, "reportId")),
    requiredPathParams: ["reportId"],
    description: "Confirm fraud report",
  },
  fraud_reports_dismiss: {
    method: "POST",
    path: (params) => API_ENDPOINTS.DASHBOARD_FRAUD_REPORTS.DISMISS(requirePathParam(params, "reportId")),
    requiredPathParams: ["reportId"],
    description: "Dismiss fraud report",
  },
  fraud_reports_ban_user: {
    method: "POST",
    path: (params) => API_ENDPOINTS.DASHBOARD_FRAUD_REPORTS.BAN_USER(requirePathParam(params, "userId")),
    requiredPathParams: ["userId"],
    description: "Ban fraud reported user",
  },
  fraud_reports_unban_user: {
    method: "POST",
    path: (params) => API_ENDPOINTS.DASHBOARD_FRAUD_REPORTS.UNBAN_USER(requirePathParam(params, "userId")),
    requiredPathParams: ["userId"],
    description: "Unban fraud reported user",
  },
  suggestions_list: { method: "GET", path: API_ENDPOINTS.DASHBOARD_SUGGESTIONS.BASE, description: "List suggestions" },
  suggestions_reward: {
    method: "POST",
    path: (params) => API_ENDPOINTS.DASHBOARD_SUGGESTIONS.REWARD(requirePathParam(params, "suggestionId")),
    requiredPathParams: ["suggestionId"],
    description: "Reward suggestion",
  },
  suggestions_dismiss: {
    method: "POST",
    path: (params) => API_ENDPOINTS.DASHBOARD_SUGGESTIONS.DISMISS(requirePathParam(params, "suggestionId")),
    requiredPathParams: ["suggestionId"],
    description: "Dismiss suggestion",
  },
  categories_list: { method: "GET", path: API_ENDPOINTS.DASHBOARD_CATEGORIES.BASE, description: "List categories" },
  categories_create: { method: "POST", path: API_ENDPOINTS.DASHBOARD_CATEGORIES.BASE, description: "Create category" },
  categories_get_by_id: {
    method: "GET",
    path: (params) => API_ENDPOINTS.DASHBOARD_CATEGORIES.BY_ID(requirePathParam(params, "categoryId")),
    requiredPathParams: ["categoryId"],
    description: "Get category by id",
  },
  categories_update: {
    method: "PATCH",
    path: (params) => API_ENDPOINTS.DASHBOARD_CATEGORIES.BY_ID(requirePathParam(params, "categoryId")),
    requiredPathParams: ["categoryId"],
    description: "Update category",
  },
  categories_delete: {
    method: "DELETE",
    path: (params) => API_ENDPOINTS.DASHBOARD_CATEGORIES.BY_ID(requirePathParam(params, "categoryId")),
    requiredPathParams: ["categoryId"],
    description: "Delete or deactivate category",
  },
};

type GenericApiEndpointKey = keyof typeof genericApiEndpoints;

const ROOT_ONLY_GENERIC_ENDPOINT_KEY_SET = new Set<GenericApiEndpointKey>(
  ROOT_ONLY_GENERIC_ENDPOINT_KEYS
);
const ROOT_ONLY_ASSISTANT_LIST_RESOURCE_SET = new Set<AssistantListResource>(
  ROOT_ONLY_ASSISTANT_LIST_RESOURCES
);
const ROOT_ONLY_ASSISTANT_ACTION_TYPE_SET = new Set<AssistantToolAction["type"]>(
  ROOT_ONLY_ASSISTANT_ACTION_TYPES
);

const getPersistedAssistantUser = (): AssistantSessionUser | null => {
  try {
    const cookieUser = tokenCookies.getUser();
    const sessionUser =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem("wms_user")
        : null;
    const rawUser = cookieUser || sessionUser;
    if (!rawUser) return null;

    const parsed = JSON.parse(rawUser);
    return parsed && typeof parsed === "object"
      ? (parsed as AssistantSessionUser)
      : null;
  } catch {
    return null;
  }
};

const normalizeRoleName = (value: unknown) =>
  String(value || "").trim().toUpperCase();

const isRootAdminSessionUser = (user: AssistantSessionUser | null) =>
  normalizeRoleName(user?.adminRoleName) === "ROOT_ADMIN";

const getAssistantAccessScope = () => {
  const user = getPersistedAssistantUser();
  const isRootAdmin = isRootAdminSessionUser(user);

  return {
    isRootAdmin,
    allowedListResources: (
      Object.keys(assistantListResourceEndpoints) as AssistantListResource[]
    ).filter((resource) =>
      isRootAdmin || !ROOT_ONLY_ASSISTANT_LIST_RESOURCE_SET.has(resource)
    ),
    allowedGenericEndpointKeys: (
      Object.keys(genericApiEndpoints) as GenericApiEndpointKey[]
    ).filter((endpointKey) =>
      isRootAdmin || !ROOT_ONLY_GENERIC_ENDPOINT_KEY_SET.has(endpointKey)
    ),
  };
};

const buildGenericEndpointGuide = (allowedEndpointKeys: readonly GenericApiEndpointKey[]) =>
  allowedEndpointKeys
    .map((key) => {
      const definition = genericApiEndpoints[key];
    const required = definition.requiredPathParams?.length
      ? ` pathParams: ${definition.requiredPathParams.join(", ")}`
      : "";
    return `- ${key}: ${definition.method} ${definition.description}${required}`;
    })
    .join("\n");

const assistantListResourceEndpoints: Record<AssistantListResource, string> = {
  kbz_registered_accounts: API_ENDPOINTS.AUTH.KBZPAY_REGISTERED_ACCOUNTS,
  kbz_verification_requested: API_ENDPOINTS.AUTH.KBZPAY_VERIFICATION_REQUESTED,
  kbz_money_check: API_ENDPOINTS.AUTH.KBZPAY_MONEY_CHECK,
  kbz_verified_users: API_ENDPOINTS.AUTH.KBZPAY_VERIFIED_USERS,
  safe_payment_awaiting_instruction: API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.AWAITING_INSTRUCTION,
  safe_payment_pending: API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.PENDING,
  points_star_config: API_ENDPOINTS.DASHBOARD_POINTS.STAR_CONFIG,
  points_rank_config: API_ENDPOINTS.DASHBOARD_POINTS.RANK_CONFIG,
  fraud_reports: API_ENDPOINTS.DASHBOARD_FRAUD_REPORTS.BASE,
  suggestions: API_ENDPOINTS.DASHBOARD_SUGGESTIONS.BASE,
  notifications: API_ENDPOINTS.DASHBOARD_NOTIFICATIONS.LIST,
  users: API_ENDPOINTS.USERS.GET_LIST,
  withdrawals: API_ENDPOINTS.DASHBOARD_WITHDRAWALS.BASE,
  facebook_follow_submissions: API_ENDPOINTS.DASHBOARD_FACEBOOK_FOLLOW.BASE,
  slider_ads: API_ENDPOINTS.DASHBOARD_SLIDER_ADS.BASE,
  admin_roles: API_ENDPOINTS.DASHBOARD_ADMIN_ROLES.BASE,
  admin_permissions: API_ENDPOINTS.DASHBOARD_ADMIN_ROLES.PERMISSIONS,
  categories: API_ENDPOINTS.DASHBOARD_CATEGORIES.BASE,
};

const buildAvailableActionsGuide = (
  isRootAdmin: boolean,
  allowedListResources: readonly AssistantListResource[]
) => {
  const actionLines = [
    `- list: params { resource: ${allowedListResources
      .map((resource) => `"${resource}"`)
      .join(" | ")} }`,
    "- confirm_fraud_report: params { reportId, reporterMessage? }",
    "- dismiss_fraud_report: params { reportId, reporterMessage? }",
    "- ban_user: params { userId }",
    "- unban_user: params { userId }",
    "- reward_suggestion: params { suggestionId, points }",
    "- dismiss_suggestion: params { suggestionId }",
    "- approve_withdrawal: params { withdrawalId, adminNote? }",
    "- reject_withdrawal: params { withdrawalId, adminNote? }",
    "- mark_withdrawal_paid: params { withdrawalId, kbzTransferRef }",
    "- send_kbz_instruction: params { userId, adminPhoneForTransfer, adminNote }",
    "- verify_kbz_user: params { userId, adminNote? }",
    "- send_safe_payment_instruction: params { transactionId, adminReceivingPhone, adminNote }",
    "- mark_safe_payment_received: params { transactionId, adminNote? }",
    "- mark_safe_payment_transferred: params { transactionId, adminNote? }",
    "- approve_facebook_follow: params { submissionId }",
    "- reject_facebook_follow: params { submissionId }",
    "- update_star_config: params { configs: [{ starCount, pointsAwarded }] }",
    "- update_rank_config: params { configs: [{ tier, minPoints, maxPoints, label, badgeUrl?, sortOrder }] }",
    "- update_slider_ad: params { sliderId, title?, linkUrl?, sortOrder?, status?, startsAt?, endsAt? }",
    "- delete_slider_ad: params { sliderId }",
    "- create_category: params { name, slug?, parentId?, sortOrder? }",
    "- update_category: params { categoryId, name?, slug?, description?, parentId?, sortOrder?, isActive? }",
    "- deactivate_category: params { categoryId }",
    "- move_category: params { categoryId, parentId?, sortOrder? }",
    "- generic_api: params { endpoint, pathParams?, query?, body? }",
  ];

  if (isRootAdmin) {
    actionLines.splice(
      19,
      0,
      "- create_admin_role: params { name, description?, permissions, isActive? }",
      "- update_admin_role: params { roleId, name?, description?, permissions?, isActive? }",
      "- delete_admin_role: params { roleId }"
    );
  }

  return actionLines.join("\n");
};

const parseStarConfigs = (value: unknown): StarConfigInput[] =>
  Array.isArray(value)
    ? value
        .map((item) => {
          const record = toRecord(item);
          if (!record) return null;
          const starCount = toNumber(record.starCount);
          if (starCount <= 0) return null;
          return {
            starCount,
            pointsAwarded: toOptionalNumber(record.pointsAwarded),
          };
        })
        .filter((item): item is StarConfigInput => !!item)
    : [];

const parseRankConfigs = (value: unknown): RankConfigInput[] =>
  Array.isArray(value)
    ? value
        .map((item) => {
          const record = toRecord(item);
          if (!record) return null;
          const tier = toText(record.tier);
          if (!tier) return null;
          return {
            tier,
            minPoints: toOptionalNumber(record.minPoints),
            maxPoints: toOptionalNumber(record.maxPoints),
            label: toText(record.label) || tier,
            badgeUrl: toText(record.badgeUrl),
            sortOrder: toNumber(record.sortOrder),
          };
        })
        .filter((item): item is RankConfigInput => !!item)
    : [];

const parseAction = (
  content: string,
  allowedListResources: readonly AssistantListResource[],
  isRootAdmin: boolean
): AssistantToolAction | null => {
  const match = content.match(ACTION_BLOCK_REGEX);
  const rawJson = match?.[1] || match?.[2];
  if (!rawJson) return null;

  try {
    const parsed = toRecord(JSON.parse(rawJson));
    if (!parsed) return null;

    const action = toText(parsed.action);
    const params = toRecord(parsed.params) ?? {};

    if (action === "list") {
      const resource = toText(params.resource);
      if (allowedListResources.includes(resource as AssistantListResource)) {
        return { type: "list", resource: resource as AssistantListResource, params };
      }
    }

    if (action === "confirm_fraud_report" || action === "dismiss_fraud_report") {
      const reportId = toText(params.reportId || params.id);
      if (!reportId) return null;
      return {
        type: action,
        reportId,
        reporterMessage: toText(params.reporterMessage || params.message),
      };
    }

    if (action === "ban_user" || action === "unban_user") {
      const userId = toText(params.userId || params.id);
      if (!userId) return null;
      return { type: action, userId };
    }

    if (action === "reward_suggestion") {
      const suggestionId = toText(params.suggestionId || params.id);
      const points = toNumber(params.points);
      if (!suggestionId || points <= 0) return null;
      return { type: "reward_suggestion", suggestionId, points };
    }

    if (action === "dismiss_suggestion") {
      const suggestionId = toText(params.suggestionId || params.id);
      if (!suggestionId) return null;
      return { type: "dismiss_suggestion", suggestionId };
    }

    if (action === "approve_withdrawal" || action === "reject_withdrawal") {
      const withdrawalId = toText(params.withdrawalId || params.id);
      if (!withdrawalId) return null;
      return { type: action, withdrawalId, adminNote: toText(params.adminNote) };
    }

    if (action === "mark_withdrawal_paid") {
      const withdrawalId = toText(params.withdrawalId || params.id);
      const kbzTransferRef = toText(params.kbzTransferRef || params.transferReference);
      if (!withdrawalId || !kbzTransferRef) return null;
      return { type: "mark_withdrawal_paid", withdrawalId, kbzTransferRef };
    }

    if (action === "send_kbz_instruction") {
      const userId = toText(params.userId || params.id);
      const adminPhoneForTransfer = toText(params.adminPhoneForTransfer || params.adminPhone);
      if (!userId || !adminPhoneForTransfer) return null;
      return {
        type: "send_kbz_instruction",
        userId,
        adminPhoneForTransfer,
        adminNote: toText(params.adminNote || params.note),
      };
    }

    if (action === "verify_kbz_user") {
      const userId = toText(params.userId || params.id);
      if (!userId) return null;
      return { type: "verify_kbz_user", userId, adminNote: toText(params.adminNote || params.note) };
    }

    if (action === "send_safe_payment_instruction") {
      const transactionId = toText(params.transactionId || params.id);
      const adminReceivingPhone = toText(params.adminReceivingPhone || params.receivingPhone);
      if (!transactionId || !adminReceivingPhone) return null;
      return {
        type: "send_safe_payment_instruction",
        transactionId,
        adminReceivingPhone,
        adminNote: toText(params.adminNote || params.note),
      };
    }

    if (action === "mark_safe_payment_received" || action === "mark_safe_payment_transferred") {
      const transactionId = toText(params.transactionId || params.id);
      if (!transactionId) return null;
      return { type: action, transactionId, adminNote: toText(params.adminNote || params.note) };
    }

    if (action === "approve_facebook_follow" || action === "reject_facebook_follow") {
      const submissionId = toText(params.submissionId || params.id);
      if (!submissionId) return null;
      return { type: action, submissionId };
    }

    if (action === "update_star_config") {
      const configs = parseStarConfigs(params.configs);
      if (configs.length === 0) return null;
      return { type: "update_star_config", configs };
    }

    if (action === "update_rank_config") {
      const configs = parseRankConfigs(params.configs);
      if (configs.length === 0) return null;
      return { type: "update_rank_config", configs };
    }

    if (action === "update_slider_ad") {
      const sliderId = toText(params.sliderId || params.id);
      if (!sliderId) return null;
      const payload = {
        title: toText(params.title) || undefined,
        linkUrl: toText(params.linkUrl) || undefined,
        sortOrder: params.sortOrder === undefined ? undefined : toNumber(params.sortOrder),
        status: toStatus(params.status),
        startsAt: toText(params.startsAt) || undefined,
        endsAt: toText(params.endsAt) || undefined,
      };
      if (Object.values(payload).every((value) => value === undefined)) return null;
      return { type: "update_slider_ad", sliderId, payload };
    }

    if (action === "delete_slider_ad") {
      const sliderId = toText(params.sliderId || params.id);
      if (!sliderId) return null;
      return { type: "delete_slider_ad", sliderId };
    }

    if (action === "create_admin_role") {
      if (!isRootAdmin) return null;
      const name = toText(params.name);
      if (!name) return null;
      return {
        type: "create_admin_role",
        name,
        description: toText(params.description),
        permissions: toStringArray(params.permissions),
        isActive: toBoolean(params.isActive),
      };
    }

    if (action === "update_admin_role") {
      if (!isRootAdmin) return null;
      const roleId = toText(params.roleId || params.id);
      if (!roleId) return null;
      return {
        type: "update_admin_role",
        roleId,
        name: toText(params.name) || undefined,
        description: toText(params.description) || undefined,
        permissions: params.permissions === undefined ? undefined : toStringArray(params.permissions),
        isActive: toBoolean(params.isActive),
      };
    }

    if (action === "delete_admin_role") {
      if (!isRootAdmin) return null;
      const roleId = toText(params.roleId || params.id);
      if (!roleId) return null;
      return { type: "delete_admin_role", roleId };
    }

    if (action === "create_category") {
      const name = toText(params.name);
      if (!name) return null;
      return {
        type: "create_category",
        name,
        slug: toText(params.slug) || undefined,
        parentId: params.parentId === null ? null : toText(params.parentId) || undefined,
        sortOrder: params.sortOrder === undefined ? undefined : toNumber(params.sortOrder),
      };
    }

    if (action === "update_category") {
      const categoryId = toText(params.categoryId || params.id);
      if (!categoryId) return null;
      const payload = {
        name: toText(params.name) || undefined,
        slug: toText(params.slug) || undefined,
        description: toText(params.description) || undefined,
        parentId: params.parentId === null ? null : toText(params.parentId) || undefined,
        sortOrder: params.sortOrder === undefined ? undefined : toNumber(params.sortOrder),
        isActive: toBoolean(params.isActive),
      };
      if (Object.values(payload).every((value) => value === undefined)) return null;
      return { type: "update_category", categoryId, payload };
    }

    if (action === "deactivate_category") {
      const categoryId = toText(params.categoryId || params.id);
      if (!categoryId) return null;
      return { type: "deactivate_category", categoryId };
    }

    if (action === "move_category") {
      const categoryId = toText(params.categoryId || params.id);
      if (!categoryId) return null;
      return {
        type: "move_category",
        categoryId,
        parentId: params.parentId === null ? null : toText(params.parentId) || undefined,
        sortOrder: params.sortOrder === undefined ? undefined : toNumber(params.sortOrder),
      };
    }

    if (action === "generic_api") {
      const endpoint = toText(params.endpoint) as GenericApiEndpointKey;
      if (
        !endpoint ||
        !genericApiEndpoints[endpoint] ||
        (!isRootAdmin && ROOT_ONLY_GENERIC_ENDPOINT_KEY_SET.has(endpoint))
      ) {
        return null;
      }
      const pathParamsRecord = toRecord(params.pathParams);
      const queryRecord = toRecord(params.query);
      const bodyRecord = toRecord(params.body);

      return {
        type: "generic_api",
        endpoint,
        pathParams: pathParamsRecord
          ? Object.fromEntries(
              Object.entries(pathParamsRecord).map(([key, value]) => [key, toText(value)])
            )
          : undefined,
        query: queryRecord ?? undefined,
        body: bodyRecord ?? undefined,
      };
    }
  } catch {
    return null;
  }

  return null;
};

export const stripActionBlock = (content: string) =>
  content.replace(ACTION_BLOCK_REGEX, "").trim();

export const normalizeAssistantIdentity = (content: string) =>
  content
    .replace(/\bFlex\s+AI\b/gi, "LOLI AI")
    .replace(/\bFlexAI\b/gi, "LOLI AI")
    .replace(/\bLOLO\s+AI\b/gi, "LOLI AI");

export const hasWriteConfirmationPhrase = (content: string) => {
  const normalized = content.trim().toLowerCase();
  return WRITE_CONFIRMATION_PHRASES.some((phrase) => normalized.includes(phrase));
};

const DASHBOARD_FEATURE_GUIDE = `Dashboard feature map:
- KBZPay verification (/dashboard): registered accounts, verification requested, money check, verified users; actions can send transfer instructions and verify users.
- Admin chat safe payments (/admin-chat): awaiting instruction and pending queues; actions can send payment instructions, mark received, and mark transferred.
- Fraud reports (/fraud-reports): review reports, confirm/dismiss reports, ban/unban reported users.
- Points & withdrawals (/points): star reward config, rank config, withdrawal queues; actions can approve/reject withdrawals, mark paid, and update point configs.
- Facebook follow (/facebook-follow): approve or reject submitted follow proofs.
- Slider ads (/slider-ads): inspect active/expired ads, update metadata/status/schedule, delete ads. File image upload is not available from AI.
- Admin roles (/admin-roles): inspect roles/permissions and create/update/delete roles when permission keys are explicitly provided.
- Categories (/categories): inspect category tree, get category by id, create/update/deactivate/move categories.
- Category creation rule: for create-category requests, only send name, slug, sortOrder, and parentId. Never include description or isActive because the backend rejects extra fields with a 400 validation error.
- Category fact rule: for category hierarchy questions, use the live current tree and pageContext exactly as given. Do not infer historical moves, hidden children, or prior parents unless the context explicitly states them.
- Notifications (/notifications): inspect notification stream and unread state.
- Suggestions (/suggestions): inspect feedback/suggestions, reward with points, or dismiss.
- Generic CRUD: when no domain-specific action fits, use the generic_api tool with one of the registered endpoint names. Never invent URLs.
- Generic endpoint naming follows the admin dashboard contract:
  *_list, *_create, *_get_by_id, *_update, *_delete, plus domain-specific helpers such as *_approve, *_reject, *_verify, *_send_instruction, *_mark_paid, *_confirm, *_dismiss, *_ban_user, and *_unban_user.
- For generic_api writes, map the admin request to the exact endpoint key first, then send only the required pathParams, query, and body fields.

Operational rules:
- Every entity ID must be a full 36-character UUID. Never truncate, guess, or reuse a partial ID. If an ID is incomplete, reload fresh context and resolve the full ID before requesting an action.
- For mutations, send only schema-allowed properties. Never add automatic fields such as status, isActive, icon, or similar unless the action schema explicitly allows them and the user asked for them.
- Follow the backend HTTP contract exactly. If an endpoint is defined as PATCH, never substitute PUT or POST.
- Before answering category placement or count questions, use the latest live context and current tree only. Never infer historical moves.
- If a write action fails with a 400 or 404, treat it as a recoverable contract mismatch: refresh live context, correct the ID/method/payload, and retry once.
- If the user asks about a page, use that page's context first and mention if the data was not loaded.
- If pageContext is present, treat it as the highest-priority source for selected-record facts on that page.
- For category questions, answer only from current parent/child relationships in the provided context. If a count or child list is unclear, say it is unclear instead of guessing.
- For destructive/security/payment actions, require explicit IDs and only return one action request.
- Never return a write action unless the user's latest message includes one of these exact confirmation phrases: "confirm and apply", "confirm and execute", "proceed with write", or "execute this write".
- If an ID is missing, ask for the exact ID instead of guessing from names.
- Explain what will change before requesting an action.
- In Agent Mode, returned action JSON is executed automatically by the dashboard without another confirmation prompt.`;

const buildSystemPrompt = (
  dashboardContext: string,
  memorySummary: string,
  agentMode: boolean
) => {
  const { isRootAdmin, allowedListResources, allowedGenericEndpointKeys } =
    getAssistantAccessScope();

  return `You are LOLI AI, the admin dashboard assistant for Flex Used Market.
Your assistant name is LOLI AI. Do not introduce yourself with any other assistant name.
When the user greets you, introduce yourself as LOLI AI.

Use the dashboard context to answer operational questions with exact counts and IDs when available.
Be concise, practical, and explicit about uncertainty. Do not invent data.
Your behavior is grounded only by the feature map, live dashboard context, persistent memory, and available tools below.

${DASHBOARD_FEATURE_GUIDE}

Persistent memory:
${memorySummary}

Dashboard context:
${dashboardContext}

Response style:
- Write for a busy admin who needs the answer in seconds.
- Start with a short answer, then only the important details.
- Use clean Markdown with short headings and 3-5 bullets when useful.
- Do not expose raw JSON, database objects, or long internal IDs unless the user asks for exact technical details.
- For action requests, explain the business result, not implementation details.
- Do not add emojis, decorative phrasing, or filler.
- Prefer domain-specific actions first; if no dedicated action fits, fall back to generic_api for full CRUD endpoint management.
- When using generic_api, mention the business purpose in prose and keep the endpoint key only inside the returned action block.

${agentMode ? `Agent Mode is ON. You may request ONE tool action at the end of the message when useful.
Returned tool actions are auto-executed by the dashboard without another confirmation prompt.
Return action requests as a single JSON object in a fenced code block with this shape:
{ "action": "action_name", "params": { ... } }

Write confirmation rule:
- Return write actions only when the user's latest message includes exactly one of these phrases: "confirm and apply", "confirm and execute", "proceed with write", or "execute this write".
- If the latest message does not include one of those phrases, do not return a write action. Explain the change and ask the user to resend the request with one of the confirmation phrases.

Available actions:
${buildAvailableActionsGuide(isRootAdmin, allowedListResources)}

Registered generic API endpoints:
${buildGenericEndpointGuide(allowedGenericEndpointKeys)}

Only request write actions when the user clearly asks for the change, enough IDs or identifiers are present, and the latest message contains one of the required confirmation phrases.
For CRUD requests across registered endpoints, choose the exact generic endpoint key that matches the requested create/read/update/delete operation.` : "Agent Mode is OFF. Do not request tool actions. Analyze and advise only."}`;
};

const assertUuid = (value: string, label: string) => {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`${label} must be a full 36-character UUID. Refresh live context and retry with the complete ID.`);
  }
};

const validateRecordUuidFields = (value: Record<string, unknown>, labelPrefix: string) => {
  Object.entries(value).forEach(([key, entryValue]) => {
    if (entryValue === null || entryValue === undefined) return;
    if (!/(^id$|Id$|_id$)/.test(key)) return;
    if (typeof entryValue === "string") {
      assertUuid(entryValue, `${labelPrefix}.${key}`);
    }
  });
};

export const validateAssistantAction = (action: AssistantToolAction) => {
  switch (action.type) {
    case "list":
    case "update_star_config":
    case "update_rank_config":
      return;
    case "confirm_fraud_report":
    case "dismiss_fraud_report":
      return assertUuid(action.reportId, `${action.type}.reportId`);
    case "ban_user":
    case "unban_user":
    case "send_kbz_instruction":
    case "verify_kbz_user":
      return assertUuid(action.userId, `${action.type}.userId`);
    case "reward_suggestion":
    case "dismiss_suggestion":
      return assertUuid(action.suggestionId, `${action.type}.suggestionId`);
    case "approve_withdrawal":
    case "reject_withdrawal":
    case "mark_withdrawal_paid":
      return assertUuid(action.withdrawalId, `${action.type}.withdrawalId`);
    case "send_safe_payment_instruction":
    case "mark_safe_payment_received":
    case "mark_safe_payment_transferred":
      return assertUuid(action.transactionId, `${action.type}.transactionId`);
    case "approve_facebook_follow":
    case "reject_facebook_follow":
      return assertUuid(action.submissionId, `${action.type}.submissionId`);
    case "update_slider_ad":
    case "delete_slider_ad":
      return assertUuid(action.sliderId, `${action.type}.sliderId`);
    case "update_admin_role":
    case "delete_admin_role":
      return assertUuid(action.roleId, `${action.type}.roleId`);
    case "deactivate_category":
      return assertUuid(action.categoryId, `${action.type}.categoryId`);
    case "move_category":
      assertUuid(action.categoryId, `${action.type}.categoryId`);
      if (action.parentId) assertUuid(action.parentId, `${action.type}.parentId`);
      return;
    case "create_category":
      if (action.parentId) assertUuid(action.parentId, `${action.type}.parentId`);
      return;
    case "update_category":
      assertUuid(action.categoryId, `${action.type}.categoryId`);
      if (action.payload.parentId) assertUuid(action.payload.parentId, `${action.type}.payload.parentId`);
      return;
    case "create_admin_role":
      return;
    case "generic_api":
      if (action.pathParams) validateRecordUuidFields(action.pathParams, "generic_api.pathParams");
      if (action.body) validateRecordUuidFields(action.body, "generic_api.body");
      if (action.query) validateRecordUuidFields(action.query, "generic_api.query");
      return;
  }
};

export const isWriteAction = (action: AssistantToolAction) => {
  if (action.type === "list") return false;
  if (action.type === "generic_api") {
    return genericApiEndpoints[action.endpoint].method !== "GET";
  }
  return true;
};

export const isRecoverableActionError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /400|404|bad request|not found|should not exist|missing required path parameter|36-character uuid|validation/i.test(message)
  );
};

export const buildRecoveryInstruction = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return `The previous tool action failed with this recoverable error: ${message}
Refresh the live dashboard context, fix any truncated UUID, wrong method, or extra payload property, and return exactly one corrected action only if the current live data supports it.`;
};

const extractProviderError = (data: unknown): string | null => {
  const record = toRecord(data) as AssistantProviderError | null;
  if (!record) return null;
  const message = record.error?.message || record.message;
  if (message) return message;
  if (record.error?.code) return record.error.code;
  if (record.code && record.code !== 200) return `Provider returned code ${record.code}.`;
  return null;
};

const extractMessageContent = (data: unknown): string => {
  const record = toRecord(data);
  const choices = Array.isArray(record?.choices) ? record.choices : [];
  const firstChoice = toRecord(choices[0]);
  const message = toRecord(firstChoice?.message);
  const content = message?.content;

  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        const partRecord = toRecord(part);
        return toText(partRecord?.text || partRecord?.content);
      })
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  return toText(firstChoice?.text).trim();
};

export async function callAssistantCompletion(args: {
  apiKey: string;
  model: string;
  messages: AssistantMessage[];
  dashboardContext: string;
  memorySummary: string;
  agentMode: boolean;
}): Promise<AssistantCompletionResult> {
  const response = await fetch(APIFREE_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.apiKey}`,
    },
    body: JSON.stringify({
      model: args.model,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(
            args.dashboardContext,
            args.memorySummary,
            args.agentMode
          ),
        },
        ...args.messages.slice(-16).map((message) => ({
          role: message.role,
          content: normalizeAssistantIdentity(message.content),
        })),
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `AI request failed (${response.status}). ${errorBody.slice(0, 240)}`
    );
  }

  const data = await response.json();
  const providerError = extractProviderError(data);
  if (providerError) {
    throw new Error(`AI provider error: ${providerError}`);
  }

  const content = extractMessageContent(data);
  if (!content) {
    throw new Error("AI response did not include content. Check that the selected APIfree model supports chat completions.");
  }

  const { allowedListResources, isRootAdmin } = getAssistantAccessScope();

  return {
    content: normalizeAssistantIdentity(stripActionBlock(content)),
    action: args.agentMode
      ? parseAction(content, allowedListResources, isRootAdmin)
      : null,
  };
}

export const describeAction = (action: AssistantToolAction) => {
  switch (action.type) {
    case "list":
      return `Load ${action.resource.replace(/_/g, " ")}`;
    case "confirm_fraud_report":
      return `Confirm fraud report ${action.reportId}`;
    case "dismiss_fraud_report":
      return `Dismiss fraud report ${action.reportId}`;
    case "ban_user":
      return `Ban user ${action.userId}`;
    case "unban_user":
      return `Unban user ${action.userId}`;
    case "reward_suggestion":
      return `Reward suggestion ${action.suggestionId} with ${action.points} points`;
    case "dismiss_suggestion":
      return `Dismiss suggestion ${action.suggestionId}`;
    case "approve_withdrawal":
      return `Approve withdrawal ${action.withdrawalId}`;
    case "reject_withdrawal":
      return `Reject withdrawal ${action.withdrawalId}`;
    case "mark_withdrawal_paid":
      return `Mark withdrawal ${action.withdrawalId} as paid`;
    case "send_kbz_instruction":
      return `Send KBZPay verification instruction to user ${action.userId}`;
    case "verify_kbz_user":
      return `Verify KBZPay user ${action.userId}`;
    case "send_safe_payment_instruction":
      return `Send safe-payment instruction for transaction ${action.transactionId}`;
    case "mark_safe_payment_received":
      return `Mark safe-payment transaction ${action.transactionId} as received`;
    case "mark_safe_payment_transferred":
      return `Mark safe-payment transaction ${action.transactionId} as transferred`;
    case "approve_facebook_follow":
      return `Approve Facebook follow submission ${action.submissionId}`;
    case "reject_facebook_follow":
      return `Reject Facebook follow submission ${action.submissionId}`;
    case "update_star_config":
      return `Update ${action.configs.length} star reward config row(s)`;
    case "update_rank_config":
      return `Update ${action.configs.length} rank reward config row(s)`;
    case "update_slider_ad":
      return `Update slider ad ${action.sliderId}`;
    case "delete_slider_ad":
      return `Delete slider ad ${action.sliderId}`;
    case "create_admin_role":
      return `Create admin role ${action.name}`;
    case "update_admin_role":
      return `Update admin role ${action.roleId}`;
    case "delete_admin_role":
      return `Delete admin role ${action.roleId}`;
    case "create_category":
      return `Create category ${action.name}`;
    case "update_category":
      return `Update category ${action.categoryId}`;
    case "deactivate_category":
      return `Deactivate category ${action.categoryId}`;
    case "move_category":
      return `Move category ${action.categoryId}`;
    case "generic_api":
      return `${genericApiEndpoints[action.endpoint].method} ${action.endpoint}`;
  }
};

const buildFormData = (payload: Record<string, unknown>) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });
  return formData;
};

const resolveGenericEndpointUrl = (definition: GenericEndpointDefinition, pathParams?: Record<string, string>) =>
  typeof definition.path === "function"
    ? definition.path(pathParams ?? {})
    : definition.path;

const executeGenericApiAction = (
  httpClient: HttpClient,
  action: Extract<AssistantToolAction, { type: "generic_api" }>
) => {
  if (!getAssistantAccessScope().isRootAdmin && ROOT_ONLY_GENERIC_ENDPOINT_KEY_SET.has(action.endpoint)) {
    throw new Error("This AI tool is restricted to ROOT_ADMIN.");
  }

  const definition = genericApiEndpoints[action.endpoint];
  const url = resolveGenericEndpointUrl(definition, action.pathParams);
  const body = definition.bodyMode === "formData" && action.body
    ? buildFormData(action.body)
    : action.body;
  const config = action.query ? { params: action.query } : undefined;

  switch (definition.method) {
    case "GET":
      return httpClient.get(url, config);
    case "POST":
      return httpClient.post(url, body, config);
    case "PUT":
      return httpClient.put(url, body, config);
    case "PATCH":
      return httpClient.patch(url, body, config);
    case "DELETE":
      return httpClient.delete(url, config);
  }
};

export async function executeAssistantAction(
  httpClient: HttpClient,
  action: AssistantToolAction
): Promise<unknown> {
  validateAssistantAction(action);
  const { isRootAdmin } = getAssistantAccessScope();

  if (!isRootAdmin && ROOT_ONLY_ASSISTANT_ACTION_TYPE_SET.has(action.type)) {
    throw new Error("This AI action is restricted to ROOT_ADMIN.");
  }

  switch (action.type) {
    case "list": {
      if (!isRootAdmin && ROOT_ONLY_ASSISTANT_LIST_RESOURCE_SET.has(action.resource)) {
        throw new Error("This AI resource is restricted to ROOT_ADMIN.");
      }
      return httpClient.get(assistantListResourceEndpoints[action.resource], {
        params: action.params,
      });
    }
    case "confirm_fraud_report":
      return httpClient.post(API_ENDPOINTS.DASHBOARD_FRAUD_REPORTS.CONFIRM(action.reportId), {
        reporterMessage: action.reporterMessage,
      });
    case "dismiss_fraud_report":
      return httpClient.post(API_ENDPOINTS.DASHBOARD_FRAUD_REPORTS.DISMISS(action.reportId), {
        reporterMessage: action.reporterMessage,
      });
    case "ban_user":
      return httpClient.post(API_ENDPOINTS.DASHBOARD_FRAUD_REPORTS.BAN_USER(action.userId));
    case "unban_user":
      return httpClient.post(API_ENDPOINTS.DASHBOARD_FRAUD_REPORTS.UNBAN_USER(action.userId));
    case "reward_suggestion":
      return httpClient.post(API_ENDPOINTS.DASHBOARD_SUGGESTIONS.REWARD(action.suggestionId), {
        points: action.points,
      });
    case "dismiss_suggestion":
      return httpClient.post(API_ENDPOINTS.DASHBOARD_SUGGESTIONS.DISMISS(action.suggestionId), {});
    case "approve_withdrawal":
      return httpClient.post(API_ENDPOINTS.DASHBOARD_WITHDRAWALS.APPROVE(action.withdrawalId), {
        adminNote: action.adminNote ?? "",
      });
    case "reject_withdrawal":
      return httpClient.post(API_ENDPOINTS.DASHBOARD_WITHDRAWALS.REJECT(action.withdrawalId), {
        adminNote: action.adminNote ?? "",
      });
    case "mark_withdrawal_paid":
      return httpClient.post(API_ENDPOINTS.DASHBOARD_WITHDRAWALS.MARK_PAID(action.withdrawalId), {
        kbzTransferRef: action.kbzTransferRef,
      });
    case "send_kbz_instruction":
      return httpClient.post(API_ENDPOINTS.AUTH.KBZPAY_SEND_INSTRUCTION(action.userId), {
        adminPhoneForTransfer: action.adminPhoneForTransfer,
        adminNote: action.adminNote,
      });
    case "verify_kbz_user":
      return httpClient.post(API_ENDPOINTS.AUTH.KBZPAY_VERIFY(action.userId), {
        adminNote: action.adminNote ?? "",
      });
    case "send_safe_payment_instruction":
      return httpClient.post(API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.SEND_INSTRUCTION(action.transactionId), {
        adminReceivingPhone: action.adminReceivingPhone,
        adminNote: action.adminNote,
      });
    case "mark_safe_payment_received":
      return httpClient.post(API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.RECEIVED(action.transactionId), {
        adminNote: action.adminNote ?? "",
      });
    case "mark_safe_payment_transferred":
      return httpClient.post(API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.TRANSFERRED(action.transactionId), {
        adminNote: action.adminNote ?? "",
      });
    case "approve_facebook_follow":
      return httpClient.post(API_ENDPOINTS.DASHBOARD_FACEBOOK_FOLLOW.APPROVE(action.submissionId));
    case "reject_facebook_follow":
      return httpClient.post(API_ENDPOINTS.DASHBOARD_FACEBOOK_FOLLOW.REJECT(action.submissionId));
    case "update_star_config":
      return httpClient.put(API_ENDPOINTS.DASHBOARD_POINTS.STAR_CONFIG, {
        configs: action.configs,
      });
    case "update_rank_config":
      return httpClient.put(API_ENDPOINTS.DASHBOARD_POINTS.RANK_CONFIG, {
        configs: action.configs,
      });
    case "update_slider_ad":
      return httpClient.patch(
        API_ENDPOINTS.DASHBOARD_SLIDER_ADS.BY_ID(action.sliderId),
        buildFormData(action.payload)
      );
    case "delete_slider_ad":
      return httpClient.delete(API_ENDPOINTS.DASHBOARD_SLIDER_ADS.BY_ID(action.sliderId));
    case "create_admin_role":
      return httpClient.post(API_ENDPOINTS.DASHBOARD_ADMIN_ROLES.BASE, {
        name: action.name,
        description: action.description,
        permissions: action.permissions,
        isActive: action.isActive,
      });
    case "update_admin_role":
      return httpClient.put(API_ENDPOINTS.DASHBOARD_ADMIN_ROLES.BY_ID(action.roleId), {
        name: action.name,
        description: action.description,
        permissions: action.permissions,
        isActive: action.isActive,
      });
    case "delete_admin_role":
      return httpClient.delete(API_ENDPOINTS.DASHBOARD_ADMIN_ROLES.BY_ID(action.roleId));
    case "create_category":
      return httpClient.post(API_ENDPOINTS.DASHBOARD_CATEGORIES.BASE, {
        name: action.name,
        slug: action.slug,
        parentId: action.parentId,
        sortOrder: action.sortOrder,
      });
    case "update_category":
      return httpClient.patch(
        API_ENDPOINTS.DASHBOARD_CATEGORIES.BY_ID(action.categoryId),
        sanitizeRecord(action.payload)
      );
    case "deactivate_category":
      return httpClient.delete(API_ENDPOINTS.DASHBOARD_CATEGORIES.BY_ID(action.categoryId));
    case "move_category":
      return httpClient.patch(API_ENDPOINTS.DASHBOARD_CATEGORIES.BY_ID(action.categoryId), {
        parentId: action.parentId,
        sortOrder: action.sortOrder,
      });
    case "generic_api":
      return executeGenericApiAction(httpClient, action);
  }
}
