export type AssistantRole = "user" | "assistant";

export type AssistantMessage = {
  id: string;
  role: AssistantRole;
  content: string;
  createdAt: string;
};

export type AssistantSession = {
  id: string;
  title: string;
  messages: AssistantMessage[];
  createdAt: string;
  updatedAt: string;
};

export type AssistantMemory = {
  facts: string[];
  preferences: string[];
  updatedAt: string;
};

export type AssistantSettings = {
  apiKey: string;
  model: string;
  agentMode: boolean;
};

const SETTINGS_KEY = "flex-ai-assistant-settings";
const SESSIONS_KEY = "flex-ai-assistant-sessions";
const ACTIVE_SESSION_KEY = "flex-ai-assistant-active-session";
const MEMORY_KEY = "flex-ai-assistant-memory";

export const DEFAULT_ASSISTANT_MODEL = "deepseek-ai/deepseek-v3.2";
const LEGACY_DEFAULT_MODELS = new Set(["gpt-4o-mini"]);

const safeParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const createAssistantMessage = (
  role: AssistantRole,
  content: string
): AssistantMessage => ({
  id: crypto.randomUUID(),
  role,
  content,
  createdAt: new Date().toISOString(),
});

export const createAssistantSession = (): AssistantSession => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
};

export const loadAssistantSettings = (): AssistantSettings => {
  const parsed = safeParse<Partial<AssistantSettings>>(
    window.localStorage.getItem(SETTINGS_KEY),
    {}
  );
  const parsedModel = parsed.model?.trim();

  return {
    apiKey: parsed.apiKey ?? "",
    model:
      !parsedModel || LEGACY_DEFAULT_MODELS.has(parsedModel)
        ? DEFAULT_ASSISTANT_MODEL
        : parsedModel,
    agentMode: parsed.agentMode ?? false,
  };
};

export const saveAssistantSettings = (settings: AssistantSettings) => {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const loadAssistantSessions = (): AssistantSession[] => {
  const sessions = safeParse<AssistantSession[]>(
    window.localStorage.getItem(SESSIONS_KEY),
    []
  );
  return Array.isArray(sessions) ? sessions : [];
};

export const saveAssistantSessions = (sessions: AssistantSession[]) => {
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
};

export const loadActiveSessionId = () =>
  window.localStorage.getItem(ACTIVE_SESSION_KEY);

export const saveActiveSessionId = (sessionId: string) => {
  window.localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
};

export const loadAssistantMemory = (): AssistantMemory => {
  const parsed = safeParse<Partial<AssistantMemory>>(
    window.localStorage.getItem(MEMORY_KEY),
    {}
  );

  return {
    facts: Array.isArray(parsed.facts) ? parsed.facts : [],
    preferences: Array.isArray(parsed.preferences) ? parsed.preferences : [],
    updatedAt: parsed.updatedAt ?? new Date().toISOString(),
  };
};

export const saveAssistantMemory = (memory: AssistantMemory) => {
  window.localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
};

export const summarizeMemory = (memory: AssistantMemory) => {
  const facts = memory.facts.map((item) => `- ${item}`).join("\n") || "- None";
  const preferences =
    memory.preferences.map((item) => `- ${item}`).join("\n") || "- None";

  return `Facts:\n${facts}\nPreferences:\n${preferences}`;
};

export const updateMemoryFromMessage = (
  memory: AssistantMemory,
  message: string
): AssistantMemory => {
  const normalized = message.trim();
  const rememberMatch = normalized.match(/^remember\s+(that\s+)?(.+)/i);
  const preferMatch = normalized.match(/^(remember\s+)?(i prefer|my preference is)\s+(.+)/i);

  if (!rememberMatch && !preferMatch) return memory;

  const next: AssistantMemory = {
    facts: [...memory.facts],
    preferences: [...memory.preferences],
    updatedAt: new Date().toISOString(),
  };

  if (preferMatch) {
    const preference = preferMatch[3].trim();
    if (preference && !next.preferences.includes(preference)) {
      next.preferences = [preference, ...next.preferences].slice(0, 20);
    }
  } else if (rememberMatch) {
    const fact = rememberMatch[2].trim();
    if (fact && !next.facts.includes(fact)) {
      next.facts = [fact, ...next.facts].slice(0, 30);
    }
  }

  return next;
};
