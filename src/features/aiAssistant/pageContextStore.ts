const PAGE_CONTEXT_PREFIX = "flex-ai-page-context:";

const getPageContextKey = (route: string) => `${PAGE_CONTEXT_PREFIX}${route}`;

export const savePageContext = (route: string, context: Record<string, unknown>) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    getPageContextKey(route),
    JSON.stringify({
      ...context,
      route,
      publishedAt: new Date().toISOString(),
    })
  );
};

export const loadPageContext = (route: string): Record<string, unknown> | null => {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(getPageContextKey(route));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};
