import type { i18n as I18nInstance, TFunction } from "i18next";

export type DynamicTranslationParams = Record<string, unknown>;

export type DynamicTranslationTarget = {
  eventKey?: string | null;
  rawTitle?: string | null;
  rawMessage?: string | null;
  rawType?: string | null;
  metadata?: DynamicTranslationParams | null;
  payload?: DynamicTranslationParams | null;
};

type DynamicField = "title" | "message" | "type";

const DYNAMIC_NAMESPACE_PREFIX = "dynamic";

const sanitizeEventKeyPart = (value: string) =>
  value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

export const normalizeDynamicEventKey = (value: unknown) => {
  if (typeof value !== "string") return "";

  return value
    .split(".")
    .map((part) => sanitizeEventKeyPart(part))
    .filter(Boolean)
    .join(".");
};

const getTranslationValues = (target: DynamicTranslationTarget) => ({
  ...(target.payload || {}),
  ...(target.metadata || {}),
});

export const getDynamicTranslationKey = (
  eventKey: string | null | undefined,
  field: DynamicField
) => {
  const normalizedKey = normalizeDynamicEventKey(eventKey);
  return normalizedKey ? `${DYNAMIC_NAMESPACE_PREFIX}.${normalizedKey}.${field}` : "";
};

export const getDynamicFallbackText = (
  target: DynamicTranslationTarget,
  field: DynamicField
) => {
  if (field === "title") return target.rawTitle || "";
  if (field === "message") return target.rawMessage || "";
  return target.rawType || "";
};

export const translateDynamicField = (
  i18n: I18nInstance,
  t: TFunction,
  target: DynamicTranslationTarget,
  field: DynamicField
) => {
  const fallback = getDynamicFallbackText(target, field);
  const key = getDynamicTranslationKey(target.eventKey, field);

  if (!key) return fallback;

  const values = {
    ...getTranslationValues(target),
    defaultValue: fallback,
  };

  return i18n.exists(key, values) ? t(key, values) : fallback;
};
