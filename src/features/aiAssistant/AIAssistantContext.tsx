import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import container from "@/core/infrastructure/di/container";
import { HttpClient } from "@/core/infrastructure/api/HttpClient";
import {
  callAssistantCompletion,
  describeAction,
  executeAssistantAction,
} from "@/features/aiAssistant/aiAssistantApi";
import {
  createAssistantMessage,
  createAssistantSession,
  DEFAULT_ASSISTANT_MODEL,
  loadActiveSessionId,
  loadAssistantMemory,
  loadAssistantSessions,
  loadAssistantSettings,
  saveActiveSessionId,
  saveAssistantMemory,
  saveAssistantSessions,
  saveAssistantSettings,
  summarizeMemory,
  updateMemoryFromMessage,
  type AssistantMemory,
  type AssistantSession,
  type AssistantSettings,
} from "@/features/aiAssistant/aiAssistantStorage";
import {
  AIAssistantContext,
  type AIAssistantContextValue,
  type SubmitAssistantMessageArgs,
} from "@/features/aiAssistant/AIAssistantShared";

const getSessionTitle = (message: string) => {
  const title = message.trim().replace(/\s+/g, " ").slice(0, 42);
  return title || "New chat";
};

const getRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const UUID_PATTERN = /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/gi;

const sanitizeActionText = (text: string) =>
  text
    .replace(UUID_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .trim();

const formatProcessLabel = (actionLabel: string) => {
  const cleaned = sanitizeActionText(actionLabel).toLowerCase();

  if (cleaned.startsWith("update slider ad")) return "Updated the selected slider ad settings.";
  if (cleaned.startsWith("delete slider ad")) return "Deleted the selected slider ad.";
  if (cleaned.startsWith("confirm fraud report")) return "Confirmed the fraud report.";
  if (cleaned.startsWith("dismiss fraud report")) return "Dismissed the fraud report.";
  if (cleaned.startsWith("ban user")) return "Banned the selected user.";
  if (cleaned.startsWith("unban user")) return "Removed the ban from the selected user.";

  return `${sanitizeActionText(actionLabel)}.`;
};

const sanitizeUpdateMessage = (message: string) =>
  sanitizeActionText(message)
    .replace(/\breference\b[:\s-]*/i, "")
    .replace(/\bid\b[:\s-]*/i, "")
    .trim();

const formatActionExecutionMessage = (actionLabel: string, result: unknown) => {
  const record = getRecord(result);
  const data = getRecord(record?.data);
  const message = typeof record?.message === "string" ? record.message : null;
  const status = record?.success === false ? "Failed" : "Completed";

  const headline = status === "Completed" ? "Action completed successfully." : "Action could not be completed.";
  const processLabel = formatProcessLabel(actionLabel);
  const cleanMessage = message ? sanitizeUpdateMessage(message) : null;
  const detailSummary =
    typeof data?.status === "string"
      ? `Current state is now ${String(data.status).replace(/_/g, " ").toLowerCase()}.`
      : null;

  return [
    `**${headline}**`,
    "",
    `**What LOLI did**`,
    `- ${processLabel}`,
    "",
    `**Result**`,
    `- Status: ${status}`,
    cleanMessage ? `- Update: ${cleanMessage}` : null,
    detailSummary ? `- ${detailSummary}` : null,
  ]
    .filter(Boolean)
    .join("\n");
};

const ensureSessions = (sessions: AssistantSession[]) =>
  sessions.length > 0 ? sessions : [createAssistantSession()];

export function AIAssistantProvider({ children }: PropsWithChildren) {
  const httpClient = useMemo(() => container.resolve<HttpClient>("httpClient"), []);
  const [savedSettings, setSavedSettings] = useState<AssistantSettings>(() => loadAssistantSettings());
  const [memory, setMemory] = useState<AssistantMemory>(() => loadAssistantMemory());
  const [sessions, setSessions] = useState<AssistantSession[]>(() => ensureSessions(loadAssistantSessions()));
  const [activeSessionId, setActiveSessionId] = useState(() => {
    const loadedSessions = ensureSessions(loadAssistantSessions());
    return loadActiveSessionId() || loadedSessions[0]?.id || "";
  });
  const [isLoading, setIsLoading] = useState(false);

  const sessionsRef = useRef(sessions);
  const activeSessionIdRef = useRef(activeSessionId);
  const savedSettingsRef = useRef(savedSettings);
  const memoryRef = useRef(memory);
  const isLoadingRef = useRef(isLoading);

  useEffect(() => {
    sessionsRef.current = sessions;
    saveAssistantSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
    if (activeSessionId) {
      saveActiveSessionId(activeSessionId);
    }
  }, [activeSessionId]);

  useEffect(() => {
    savedSettingsRef.current = savedSettings;
    saveAssistantSettings(savedSettings);
  }, [savedSettings]);

  useEffect(() => {
    memoryRef.current = memory;
    saveAssistantMemory(memory);
  }, [memory]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    if (!sessions.some((session) => session.id === activeSessionId)) {
      setActiveSessionId(sessions[0]?.id || "");
    }
  }, [activeSessionId, sessions]);

  useEffect(() => {
    const syncFromStorage = (event: StorageEvent) => {
      if (!event.key || !event.key.startsWith("flex-ai-assistant-")) return;
      setSavedSettings(loadAssistantSettings());
      setMemory(loadAssistantMemory());
      const nextSessions = ensureSessions(loadAssistantSessions());
      setSessions(nextSessions);
      setActiveSessionId(loadActiveSessionId() || nextSessions[0]?.id || "");
    };

    window.addEventListener("storage", syncFromStorage);
    return () => window.removeEventListener("storage", syncFromStorage);
  }, []);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? sessions[0],
    [activeSessionId, sessions]
  );

  const appendMessageToSession = useCallback((sessionId: string, content: string, role: "assistant" | "user") => {
    const nextMessage = createAssistantMessage(role, content);
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages: [...session.messages, nextMessage],
              updatedAt: new Date().toISOString(),
            }
          : session
      )
    );
  }, []);

  const createSession = useCallback(() => {
    const session = createAssistantSession();
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    return session;
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    let nextActiveSessionId = "";

    setSessions((prev) => {
      const filtered = prev.filter((session) => session.id !== sessionId);
      const nextSessions = ensureSessions(filtered);
      nextActiveSessionId =
        activeSessionIdRef.current === sessionId
          ? nextSessions[0]?.id || ""
          : activeSessionIdRef.current;
      return nextSessions;
    });

    setActiveSessionId(nextActiveSessionId);
  }, []);

  const clearMemory = useCallback(() => {
    setMemory({
      facts: [],
      preferences: [],
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const saveSettings = useCallback((settings: AssistantSettings) => {
    setSavedSettings({
      apiKey: settings.apiKey.trim(),
      model: settings.model.trim() || DEFAULT_ASSISTANT_MODEL,
      agentMode: settings.agentMode,
    });
  }, []);

  const toggleAgentMode = useCallback(() => {
    setSavedSettings((prev) => ({
      ...prev,
      agentMode: !prev.agentMode,
    }));
  }, []);

  const submitMessage = useCallback(async ({
    content,
    dashboardContext,
    onActionComplete,
    sessionId,
  }: SubmitAssistantMessageArgs) => {
    const trimmed = content.trim();
    if (!trimmed || isLoadingRef.current) return;

    const currentSettings = savedSettingsRef.current;
    if (!currentSettings.apiKey.trim()) {
      throw new Error("API key is required.");
    }

    const currentSessions = sessionsRef.current;
    const fallbackSession = currentSessions[0] ?? createSession();
    const targetSession =
      currentSessions.find((session) => session.id === (sessionId || activeSessionIdRef.current)) ?? fallbackSession;

    const userMessage = createAssistantMessage("user", trimmed);
    const nextMemory = updateMemoryFromMessage(memoryRef.current, trimmed);
    const conversation = [...targetSession.messages, userMessage];

    setMemory(nextMemory);
    setActiveSessionId(targetSession.id);
    setIsLoading(true);
    setSessions((prev) =>
      prev.map((session) =>
        session.id === targetSession.id
          ? {
              ...session,
              title: session.messages.length === 0 ? getSessionTitle(trimmed) : session.title,
              messages: [...session.messages, userMessage],
              updatedAt: new Date().toISOString(),
            }
          : session
      )
    );

    try {
      const result = await callAssistantCompletion({
        apiKey: currentSettings.apiKey.trim(),
        model: currentSettings.model.trim(),
        messages: conversation,
        dashboardContext,
        memorySummary: summarizeMemory(nextMemory),
        agentMode: currentSettings.agentMode,
      });

      appendMessageToSession(
        targetSession.id,
        result.content || "I prepared an answer.",
        "assistant"
      );

      if (result.action) {
        const actionResult = await executeAssistantAction(httpClient, result.action);
        appendMessageToSession(
          targetSession.id,
          formatActionExecutionMessage(describeAction(result.action), actionResult),
          "assistant"
        );
        if (onActionComplete) {
          await onActionComplete();
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI request failed.";
      appendMessageToSession(targetSession.id, `Error: ${message}`, "assistant");
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [appendMessageToSession, createSession, httpClient]);

  const value = useMemo<AIAssistantContextValue>(() => ({
    activeSession,
    activeSessionId,
    sessions,
    memory,
    savedSettings,
    isLoading,
    setActiveSessionId,
    createSession,
    deleteSession,
    clearMemory,
    saveSettings,
    toggleAgentMode,
    submitMessage,
  }), [
    activeSession,
    activeSessionId,
    sessions,
    memory,
    savedSettings,
    isLoading,
    createSession,
    deleteSession,
    clearMemory,
    saveSettings,
    toggleAgentMode,
    submitMessage,
  ]);

  return (
    <AIAssistantContext.Provider value={value}>
      {children}
    </AIAssistantContext.Provider>
  );
}
